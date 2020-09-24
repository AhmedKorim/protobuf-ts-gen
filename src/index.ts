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
	private names: string[];

	constructor(private readonly grpcObject: GrpcObject) {}

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

	getTypeNames(): string[] {
		return Object.keys(this.grpcObject).filter(
			(i) => typeof this.grpcObject[i] !== "function"
		);
	}

	getScalars(packageName: string): ObjectOf<Scalar> {
		const scalarNames = this.getTypeNames();
		let listPure = {};
		const packageObject = (this.grpcObject[
			packageName
		] as unknown) as GRPCMessage;
		for (const scalarName of scalarNames) {
			let value = this.omitDescriptorBuffer(packageObject[scalarName]);
			listPure[scalarName] = value;
		}
		let scalar = {};

		for (const scalarName of scalarNames) {
			const typeUnOpt = (listPure[scalarName] as GRPCMessage).type;
			if (typeUnOpt.field.length === 0) {
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
				concreteType[key] = bare[key];
			}
			if (oneofDecl.length === 0) {
				scalar[typeUnOpt.name] = concreteType;
			} else {
				const key = oneofDecl[0].name;
				/// todo options
				scalar[typeUnOpt.name] = { [key + ":one-of:"]: concreteType };
			}
		}
		return scalar;
	}

	private omitDescriptorBuffer(field: RpcType | Field["type"]) {
		if (!field) {
			return {};
		}
		// @ts-ignore
		const { fileDescriptorProtos, ...r } = field;
		return r;
	}
}
