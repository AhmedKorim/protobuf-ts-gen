import * as protoLoader from "@grpc/proto-loader";
import * as grpcLibrary from "grpc";
import { GrpcObject } from "grpc";
import {
  Field,
  getTsPrimitive,
  GRPCMessage,
  PrimitiveType,
  RpcType,
} from "./types";
import { ObjectOf, Scalar } from "./types/scalar.type";

export class CodeGen {
  private readonly _names: string[];
  private readonly _scalars: ObjectOf<ObjectOf<Scalar>>;
  constructor(private readonly grpcObject: GrpcObject) {
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
    return this;
  }

  static getTypescriptPrimitive = getTsPrimitive;
  static loadSync(path: string): CodeGen {
    const packageObject = protoLoader.loadSync(path);
    const grpcObject = grpcLibrary.loadPackageDefinition(packageObject);
    return new CodeGen(grpcObject);
  }

  static async load(path: string) {
    const packageObject = await protoLoader.load(path);
    const grpcObject = grpcLibrary.loadPackageDefinition(packageObject);
    return new CodeGen(grpcObject);
  }

  getTypeNames(packageName: string): string[] {
    const packageType = this.grpcObject[packageName];
    return Object.keys(packageType).filter((i) => {
      // @ts-ignore
      return typeof packageType[i] !== "function";
    });
  }
  get names() {
    return this._names;
  }
  private getScalars(packageName: string): ObjectOf<Scalar> {
    return this._scalars[packageName];
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
    let str = `//TYPES FOR PACKAGE ${packageName}\n\n
	  /// Types
	  `;
    for (const typeName of this.getTypeNames(packageName)) {
      str = str.concat(`\n${this.genType(packageName, typeName)}\n`);
    }
    return str;
  }
  private omitDescriptorBuffer(field: RpcType | Field["type"] | undefined) {
    if (!field) {
      return {};
    }
    // @ts-ignore
    const { fileDescriptorProtos, ...r } = field;
    return r;
  }
}
