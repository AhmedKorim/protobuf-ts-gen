import { RpcType } from ".";

export type Service = {
  [key: string]: RPCMethodRaw;
};

export type RPCMethodRaw = {
  originalName: string;
  path: string;
  responseType: string;
  requestType: string;
};

export type RPCService = () => {
  [key: string]: RPCMethod;
};
export interface GRPCMessage {
  format: string;
  type: RpcType;
}
export type RPCMethod<Req = GRPCMessage, Res = GRPCMessage> = {
  requestStream: boolean;
  responseStream: boolean;
  originalName: string;
  path: string;
  responseType: Res;
  requestType: Req;
};
