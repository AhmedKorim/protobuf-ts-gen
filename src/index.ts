import * as protoLoader from "@grpc/proto-loader";
import * as grpcLibrary from "grpc";
import { GrpcObject } from "grpc";
import {
  Field,
  getTsPrimitive,
  GRPCMessage,
  PrimitiveType,
  RPCMethod,
  RPCMethodRaw,
  RpcType,
} from "./types";
import { ObjectOf, Scalar } from "./types/scalar.type";
import { RPCService, Service } from "./types/service.interface";
import prettier from "prettier";
export class CodeGen {
  private readonly _names: string[];
  private readonly _scalars: ObjectOf<ObjectOf<Scalar>>;
  private readonly _services: ObjectOf<ObjectOf<Service>>;
  constructor(
    private readonly grpcObject: GrpcObject,
    private readonly streamType: string
  ) {
    this._names = Object.keys(this.grpcObject);
    this._scalars = this._names
      .map((i) => ({
        [i]: this.buildScalars(i),
      }))
      .reduce(
        (acc, i) => ({
          ...acc,
          ...i,
        }),
        {}
      );
    this._services = this._names
      .map((i) => ({
        [i]: this.buildServices(i),
      }))
      .reduce(
        (acc, i) => ({
          ...acc,
          ...i,
        }),
        {}
      );
    return this;
  }

  static getTypescriptPrimitive = getTsPrimitive;
  static loadSync(path: string, streamType = "Observable"): CodeGen {
    const packageObject = protoLoader.loadSync(path);
    const grpcObject = grpcLibrary.loadPackageDefinition(packageObject);
    return new CodeGen(grpcObject, streamType);
  }

  static async load(path: string, streamType = "Observable") {
    const packageObject = await protoLoader.load(path);
    const grpcObject = grpcLibrary.loadPackageDefinition(packageObject);
    return new CodeGen(grpcObject, streamType);
  }

  getTypeNames(packageName: string): string[] {
    const packageType = this.grpcObject[packageName];
    return Object.keys(packageType).filter((i) => {
      // @ts-ignore
      return typeof packageType[i] !== "function";
    });
  }
  getServiceNames(packageName: string): string[] {
    const packageType = this.grpcObject[packageName];
    return Object.keys(packageType).filter((i) => {
      // @ts-ignore
      return typeof packageType[i] === "function";
    });
  }
  get names() {
    return this._names;
  }
  private getScalars(packageName: string): ObjectOf<Scalar> {
    return this._scalars[packageName];
  }
  private getServices(packageName: string): ObjectOf<Service> {
    return this._services[packageName];
  }
  getService(packageName: string, serviceName: string): Service {
    return this.getServices(packageName)[serviceName];
  }

  public genType(packageName: string, typename: string): string {
    let str = `export type ${typename} = `;
    const typeDif = this.getScalars(packageName)[typename];
    const isAlias = typeof typeDif === "string";
    console.log(`${isAlias} ${typename} is an alias`);
    if (isAlias) {
      const value = typeDif;
      switch (value) {
        case "object":
          // void type object without keys
          str = str.concat(`object;\n`);
          break;
        default:
          str = str.concat(`${value};\n`);
      }
    } else {
      str = str.concat("{");
      console.log({ typeDif });
      const valueMap = Object.keys(typeDif).map((key) => ({
        key,
        // @ts-ignore
        value: typeDif[key],
      }));
      for (const { key, value } of valueMap) {
        if (key.indexOf(":one-of") > -1) {
          const pureKey = key.replace(":one-of:", "");
          str = str.concat(`\n ${pureKey} :`);

          // @ts-ignore
          const nestedType = typeDif[key];
          const valueMap = Object.keys(nestedType).map((key) => ({
            nestedKey: key,
            // @ts-ignore
            value: nestedType[key],
          }));
          for (const [index, { nestedKey, value }] of valueMap.entries()) {
            str = str.concat(
              `\n    {${nestedKey}:${value};}${
                index + 1 < valueMap.length ? "|" : ""
              } `
            );
          }
        } else if (typeof value === "string") {
          switch (value) {
            case "object":
              // void type object without keys
              str = str.concat(`\n ${key}:object;`);
              break;
            default:
              str = str.concat(`\n  ${key}:${value};`);
          }
        }
      }
      str = str.concat("\n}");
    }

    return str;
  }
  public genService(packageName: string, typename: string): string {
    let str = `export type ${typename} = {`;
    const typeDif = this.getServices(packageName)[typename];
    const methodkeys = Object.keys(typeDif);
    for (const methodkey of methodkeys) {
      const { requestType, responseType, ...method } = typeDif[methodkey];
      const req = this.scalarOrWrappedStream(requestType);
      const res = this.scalarOrWrappedStream(responseType);
      str = str.concat(`\n ${method.originalName}(request:${req}):${res};`);
    }
    str = str.concat(`\n}`);
    return str;
  }
  private buildServices(packageName: string): ObjectOf<Service> {
    const serviceNames = this.getServiceNames(packageName);
    const packageObject = (this.grpcObject[
      packageName
    ] as unknown) as GRPCMessage;
    // @ts-ignore
    let services: RPCMethodRaw = {};
    for (const serviceName of serviceNames) {
      // @ts-ignore
      const serv = packageObject[serviceName].service as RPCService;
      const methodNames = Object.keys(serv);
      // @ts-ignore
      let service: RPCMethodRaw = {};
      for (const methodName of methodNames) {
        const {
          requestType,
          requestStream,
          originalName,
          path,
          responseType,
          responseStream,
          ..._
        } =
          // @ts-ignore
          serv[methodName] as RPCMethod;
        const ReqType =
          requestType.type.name + (requestStream ? ":stream:" : "");
        const resType =
          responseType.type.name + (responseStream ? ":stream:" : "");
        // @ts-ignore
        service[methodName] = ({
          originalName: originalName,
          path,
          requestType: ReqType,
          responseType: resType,
        } as unknown) as RPCMethodRaw;
      }
      // @ts-ignore
      services[serviceName] = service;
    }
    // @ts-ignore
    return services;
  }
  private buildScalars(packageName: string): ObjectOf<Scalar> {
    const scalarNames = this.getTypeNames(packageName);
    let listPure: ObjectOf<string | object> = {};
    const packageObject = (this.grpcObject[
      packageName
    ] as unknown) as GRPCMessage;
    for (const scalarName of scalarNames) {
      let value: Omit<
        RpcType,
        "fileDescriptorProtos"
      > = this.omitDescriptorBuffer(
        // @ts-ignore
        (packageObject[scalarName] as unknown) as RpcType
      );
      listPure[scalarName] = value;
    }
    let scalar = {};

    for (const scalarName of scalarNames) {
      const typeUnOpt = (listPure[scalarName] as GRPCMessage).type;
      if (typeUnOpt.field.length === 0) {
        // @ts-ignore
        scalar[typeUnOpt.name] = "object";
        continue;
      }
      const { field, oneofDecl } = typeUnOpt;
      const typeList = field.map((i) => {
        const type =
          i.typeName || CodeGen.getTypescriptPrimitive(i.type as PrimitiveType);
        return {
          [i.name]: type,
        };
      });
      let concreteType = {};
      for (const bare of typeList) {
        const key = Object.keys(bare)[0];
        // @ts-ignore
        concreteType[key] = bare[key];
      }
      if (oneofDecl.length === 0) {
        // @ts-ignore
        scalar[typeUnOpt.name] = concreteType;
      } else {
        const key = oneofDecl[0].name;
        /// todo options
        // @ts-ignore
        scalar[typeUnOpt.name] = { [key + ":one-of:"]: concreteType };
      }
    }
    return scalar;
  }
  public genPackageDefinition(packageName: string): string {
    let str = `//TYPES FOR PACKAGE ${packageName}\n\n`;
    for (const typeName of this.getTypeNames(packageName)) {
      str = str.concat(`\n${this.genType(packageName, typeName)}\n`);
    }
    str = str.concat(`\n\n// SERVICES FOR PACKAGE $${packageName}\n\n`);
    for (const typeName of this.getServiceNames(packageName)) {
      str = str.concat(`\n${this.genService(packageName, typeName)}\n`);
    }
    return this.prettify(str);
  }
  private omitDescriptorBuffer(field: RpcType | Field["type"] | undefined) {
    if (!field) {
      return {};
    }
    // @ts-ignore
    const { fileDescriptorProtos, ...r } = field;
    return r;
  }
  private scalarOrWrappedStream(type: string): string {
    return type.indexOf(":stream:") > -1
      ? `${this.streamType}<${type.replace(":stream:", "")}>`
      : type;
  }
  private prettify(string: string): string {
    return prettier.format(string);
  }
}
