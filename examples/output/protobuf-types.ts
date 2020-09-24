//TYPES FOR PACKAGE sendflex

export type Void = object;

export type WASession = {
  clientToken: string,
  serverToken: string,
  wid: string,
  clientId: string,
  enc: string,
  mac: string,
};

export type HandshakeRequest = {
  clientId: string,
  session: WASession,
};

export type HandshakeResponse = {
  value: { alreadyExists: AlreadyLoggedInResponse } | { qr: QRCodeResponse },
};

export type QuerySessionResponse = {
  session: WASession,
};

export type AlreadyLoggedInResponse = object;

export type QRCodeResponse = {
  buffer: Buffer,
  validFor: number,
};

export type ExistsRequest = {
  jid: string,
};

export type ExistsResponse = {
  exists: boolean,
  jid: string,
};

export type EventMessage = {
  event:
    | { loggedIn: LoginSuccessEvent }
    | { chatMessage: ChatMessage }
    | { loggedOut: LoggedOut }
    | { takeover: TakeOver }
    | { status: Status }
    | { sessionUpdate: SessionUpdate },
};

export type LoginSuccessEvent = object;

export type ChatMessage = object;

export type TakeOver = object;

export type Status = object;

export type LoggedOut = object;

export type SessionUpdate = {
  session: WASession,
};

// SERVICES FOR PACKAGE $sendflex

export type Handshake = {
  login(request: HandshakeRequest): HandshakeResponse,
  logout(request: Void): Void,
  reGenerateQrCode(request: Void): HandshakeResponse,
  querySession(request: Void): QuerySessionResponse,
};

export type JidExits = {
  exists(request: ExistsRequest): ExistsResponse,
};

export type Events = {
  subscribe(request: Void): Observable<EventMessage>,
};
