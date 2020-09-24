export interface GRPCMessage {
	format: string;
	type: RpcType;
}

export interface RpcType {
	field: Field[];
	nestedType: any[];
	enumType: any[];
	extensionRange: any[];
	extension: any[];
	oneofDecl: OneofDecl[];
	reservedRange: any[];
	reservedName: any[];
	name: string;
	options: any;
	fileDescriptorProtos: Buffer;
}

export interface Field {
	name: string;
	extendee: string;
	number: number;
	label: string;
	type: string;
	typeName: string;
	defaultValue: string;
	options: any;
	oneofIndex: number;
	jsonName: string;
}

export interface OneofDecl {
	name: string;
	options: any;
}

export type RPCMethodRaw = {
	originalName: string;
	path: string;
	responseType: string;
	requestType: string;
};
export type RPCMethod<Req = GRPCMessage, Res = GRPCMessage> = {
	requestStream: boolean;
	responseStream: boolean;
	originalName: string;
	path: string;
	responseType: Res;
	requestType: Req;
};
