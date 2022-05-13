import { ITableData } from "../../Common/Table/types";

export type MethodType = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

export interface IAuth {
  authType: string;
  userName: string;
  password: string;
  addTo: string;
  showPwd: boolean;
  tokenPrefix: string;
}

export interface IBinaryFileData {
  fileName: string;
  data: any;
  contentTypeOption: string;
}

export interface IRawData {
  data: string;
  lang: string;
}

export interface IGraphQLData {
  query: string;
  variables: string
}

export interface IBodyData {
  bodyType: string;
  formdata?: ITableData[];
  urlencoded?: ITableData[];
  raw?: IRawData;
  binary?: IBinaryFileData;
  graphql?: IGraphQLData;
}

export interface ITest {
  parameter: string;
  action: string;
  expectedValue: string;
  customParameter?: string;
}

export interface IRequestModel {
  id: string;
  url: string;
  name: string;
  createdTime: string;
  method: MethodType;
  params: ITableData[];
  auth: IAuth;
  headers: ITableData[];
  body: IBodyData;
  tests: ITest[];
  notes: string;
}


export const FETCH_CLIENT_SET_REQ_URL: "FETCH_CLIENT_SET_REQ_URL" = "FETCH_CLIENT_SET_REQ_URL";
export const FETCH_CLIENT_SET_REQ_METHOD: "FETCH_CLIENT_SET_REQ_METHOD" = "FETCH_CLIENT_SET_REQ_METHOD";
export const FETCH_CLIENT_SET_REQ_PARAMS: "FETCH_CLIENT_SET_REQ_PARAMS" = "FETCH_CLIENT_SET_REQ_PARAMS";
export const FETCH_CLIENT_SET_REQ_AUTH: "FETCH_CLIENT_SET_REQ_AUTH" = "FETCH_CLIENT_SET_REQ_AUTH";
export const FETCH_CLIENT_SET_REQ_HEADERS: "FETCH_CLIENT_SET_REQ_HEADERS" = "FETCH_CLIENT_SET_REQ_HEADERS";
export const FETCH_CLIENT_SET_REQ_BODY: "FETCH_CLIENT_SET_REQ_BODY" = "FETCH_CLIENT_SET_REQ_BODY";
export const FETCH_CLIENT_SET_REQ_RESET_BODY: "FETCH_CLIENT_SET_REQ_RESET_BODY" = "FETCH_CLIENT_SET_REQ_RESET_BODY";
export const FETCH_CLIENT_SET_REQ_RAW: "FETCH_CLIENT_SET_REQ_RAW" = "FETCH_CLIENT_SET_REQ_RAW";
export const FETCH_CLIENT_SET_REQ_RAW_LANG: "FETCH_CLIENT_SET_REQ_RAW_LANG" = "FETCH_CLIENT_SET_REQ_RAW_LANG";
export const FETCH_CLIENT_SET_REQ_BINARY_DATA: "FETCH_CLIENT_SET_REQ_BINARY_DATA" = "FETCH_CLIENT_SET_REQ_BINARY_DATA";
export const FETCH_CLIENT_SET_REQ: "FETCH_CLIENT_SET_REQ" = "FETCH_CLIENT_SET_REQ";
export const FETCH_CLIENT_SET_TEST: "FETCH_CLIENT_SET_TEST" = "FETCH_CLIENT_SET_TEST";
export const FETCH_CLIENT_SET_NOTES: "FETCH_CLIENT_SET_NOTES" = "FETCH_CLIENT_SET_NOTES";

export interface ISetTest {
  type: typeof FETCH_CLIENT_SET_TEST;
  payload: {
    tests: ITest[];
  };
}

export interface ISetRequest {
  type: typeof FETCH_CLIENT_SET_REQ;
  payload: {
    req: IRequestModel;
  };
}

export interface ISetURL {
  type: typeof FETCH_CLIENT_SET_REQ_URL;
  payload: {
    url: string;
  };
}

export interface ISetMethod {
  type: typeof FETCH_CLIENT_SET_REQ_METHOD;
  payload: {
    method: MethodType;
  };
}

export interface ISetParams {
  type: typeof FETCH_CLIENT_SET_REQ_PARAMS;
  payload: {
    params: ITableData[];
  };
}

export interface ISetAuth {
  type: typeof FETCH_CLIENT_SET_REQ_AUTH;
  payload: {
    auth: IAuth;
  };
}

export interface ISetHeaders {
  type: typeof FETCH_CLIENT_SET_REQ_HEADERS;
  payload: {
    headers: ITableData[];
  };
}

export interface ISetBody {
  type: typeof FETCH_CLIENT_SET_REQ_BODY;
  payload: {
    body: IBodyData;
  };
}

export interface ISetRawValue {
  type: typeof FETCH_CLIENT_SET_REQ_RAW;
  payload: {
    raw: string;
  };
}

export interface ISetRawLang {
  type: typeof FETCH_CLIENT_SET_REQ_RAW_LANG;
  payload: {
    rawLang: string;
  };
}

export interface ISetBinaryData {
  type: typeof FETCH_CLIENT_SET_REQ_BINARY_DATA;
  payload: {
    data: string;
  };
}

export interface ISetResetBody {
  type: typeof FETCH_CLIENT_SET_REQ_RESET_BODY;
  payload: {
    bodyType: string;
  }
}

export interface ISetNotes {
  type: typeof FETCH_CLIENT_SET_NOTES;
  payload: {
    notes: string;
  }
}

export type RequestActionTypes = | ISetURL | ISetMethod | ISetParams | ISetAuth | ISetHeaders | ISetBody | ISetRequest | ISetTest | ISetRawLang | ISetResetBody | ISetRawValue | ISetBinaryData | ISetNotes;