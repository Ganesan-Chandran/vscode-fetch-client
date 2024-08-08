import { ITableData } from "../../Common/Table/types";
import { ISettings } from "../../SideBar/redux/types";

export type MethodType = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

export interface IAwsAuth {
  service: string;
  region: string;
  accessKey: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface IAdvancedOAuth {
  audience: string;
  resource: string;
}

export interface IOAuth {
  clientAuth: ClientAuth;
  clientId: string;
  clientSecret: string;
  grantType: GrantType;
  password?: string;
  scope: string;
  tokenName: string;
  tokenUrl: string;
  username?: string;
  advancedOpt: IAdvancedOAuth;
}

export enum GrantType {
  PWD_Crd = "password_credentials",
  Client_Crd = "client_credentials"
}

export enum ClientAuth {
  Header = "header",
  Body = "body"
}

export interface IAuth {
  authType: string;
  userName: string;
  password: string;
  addTo: string;
  showPwd: boolean;
  tokenPrefix: string;
  aws?: IAwsAuth;
  oauth?: IOAuth;
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

export interface IRunRequest {
  reqId: string;
  parentId: string;
  colId: string;
  order: number;
  condition: ITest[];
}

export interface IPreFetch {
  requests: IRunRequest[]
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
  setvar: ISetVar[];
  notes: string;
  preFetch: IPreFetch;
}

export interface ISetVar {
  parameter: string;
  key: string;
  variableName: string;
}

export interface ICollection {
  id: string;
  name: string;
}

export interface IRequestList {
  id: string;
  name: string;
}

export interface IColRequest {
  id: string;
  reqs: IRequestList[];
}

export interface IReqColModel {
  colId: string;
  folderId: string;
  parentSettings: ISettings;
  collectionList: ICollection[];
  colRequestList: IColRequest[]
}

export interface IReqSettings {
  skipParentHeaders: boolean;
  skipParentPreFetch: boolean;
}

export const FETCH_CLIENT_SET_REQ_URL: "FETCH_CLIENT_SET_REQ_URL" = "FETCH_CLIENT_SET_REQ_URL";
export const FETCH_CLIENT_SET_REQ_METHOD: "FETCH_CLIENT_SET_REQ_METHOD" = "FETCH_CLIENT_SET_REQ_METHOD";
export const FETCH_CLIENT_SET_REQ_PARAMS: "FETCH_CLIENT_SET_REQ_PARAMS" = "FETCH_CLIENT_SET_REQ_PARAMS";
export const FETCH_CLIENT_SET_REQ_AUTH: "FETCH_CLIENT_SET_REQ_AUTH" = "FETCH_CLIENT_SET_REQ_AUTH";
export const FETCH_CLIENT_SET_REQ_HEADERS: "FETCH_CLIENT_SET_REQ_HEADERS" = "FETCH_CLIENT_SET_REQ_HEADERS";
export const FETCH_CLIENT_SET_REQ_BODY: "FETCH_CLIENT_SET_REQ_BODY" = "FETCH_CLIENT_SET_REQ_BODY";
export const FETCH_CLIENT_SET_REQ_FORM_DATA_BODY: "FETCH_CLIENT_SET_REQ_FORM_DATA_BODY" = "FETCH_CLIENT_SET_REQ_FORM_DATA_BODY";
export const FETCH_CLIENT_SET_REQ_RESET_BODY: "FETCH_CLIENT_SET_REQ_RESET_BODY" = "FETCH_CLIENT_SET_REQ_RESET_BODY";
export const FETCH_CLIENT_SET_REQ_RAW: "FETCH_CLIENT_SET_REQ_RAW" = "FETCH_CLIENT_SET_REQ_RAW";
export const FETCH_CLIENT_SET_REQ_RAW_LANG: "FETCH_CLIENT_SET_REQ_RAW_LANG" = "FETCH_CLIENT_SET_REQ_RAW_LANG";
export const FETCH_CLIENT_SET_REQ_BINARY_DATA: "FETCH_CLIENT_SET_REQ_BINARY_DATA" = "FETCH_CLIENT_SET_REQ_BINARY_DATA";
export const FETCH_CLIENT_SET_REQ: "FETCH_CLIENT_SET_REQ" = "FETCH_CLIENT_SET_REQ";
export const FETCH_CLIENT_SET_TEST: "FETCH_CLIENT_SET_TEST" = "FETCH_CLIENT_SET_TEST";
export const FETCH_CLIENT_SET_NOTES: "FETCH_CLIENT_SET_NOTES" = "FETCH_CLIENT_SET_NOTES";
export const FETCH_CLIENT_SET_SET_VAR: "FETCH_CLIENT_SET_SET_VAR" = "FETCH_CLIENT_SET_SET_VAR";
export const FETCH_CLIENT_SET_REQ_COL_DETAILS: "FETCH_CLIENT_SET_REQ_COL_DETAILS" = "FETCH_CLIENT_SET_REQ_COL_DETAILS";
export const FETCH_CLIENT_SET_REQ_PARENT_SETTINGS: "FETCH_CLIENT_SET_REQ_PARENT_SETTINGS" = "FETCH_CLIENT_SET_REQ_PARENT_SETTINGS";
export const FETCH_CLIENT_SET_OAUTH_TOKEN: "FETCH_CLIENT_SET_OAUTH_TOKEN" = "FETCH_CLIENT_SET_OAUTH_TOKEN";
export const FETCH_CLIENT_SET_PRECONDITION: "FETCH_CLIENT_SET_PRECONDITION" = "FETCH_CLIENT_SET_PRECONDITION";
export const FETCH_CLIENT_SET_ADD_PREREQUEST: "FETCH_CLIENT_SET_ADD_PREREQUEST" = "FETCH_CLIENT_SET_ADD_PREREQUEST";
export const FETCH_CLIENT_SET_DELETE_PREREQUEST: "FETCH_CLIENT_SET_DELETE_PREREQUEST" = "FETCH_CLIENT_SET_DELETE_PREREQUEST";
export const FETCH_CLIENT_SET_DELETE_PRECONDITION: "FETCH_CLIENT_SET_DELETE_PRECONDITION" = "FETCH_CLIENT_SET_DELETE_PRECONDITION";
export const FETCH_CLIENT_SET_COLLECTION_LIST: "FETCH_CLIENT_SET_COLLECTION_LIST" = "FETCH_CLIENT_SET_COLLECTION_LIST";
export const FETCH_CLIENT_SET_COL_REQUEST_LIST: "FETCH_CLIENT_SET_COL_REQUEST_LIST" = "FETCH_CLIENT_SET_COL_REQUEST_LIST";
export const FETCH_CLIENT_SET_COL_ID: "FETCH_CLIENT_SET_COL_ID" = "FETCH_CLIENT_SET_COL_ID";
export const FETCH_CLIENT_SET_REQ_ID: "FETCH_CLIENT_SET_REQ_ID" = "FETCH_CLIENT_SET_REQ_ID";
export const FETCH_CLIENT_SET_PREFETCH: "FETCH_CLIENT_SET_PREFETCH" = "FETCH_CLIENT_SET_PREFETCH";
export const FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH: "FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH" = "FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH";
export const FETCH_CLIENT_SET_SKIP_PARENT_HEADERS: "FETCH_CLIENT_SET_SKIP_PARENT_HEADERS" = "FETCH_CLIENT_SET_SKIP_PARENT_HEADERS";

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

export interface ISetFormDataBody {
  type: typeof FETCH_CLIENT_SET_REQ_FORM_DATA_BODY;
  payload: {
    value: string;
    index: number;
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

export interface ISetAddVar {
  type: typeof FETCH_CLIENT_SET_SET_VAR;
  payload: {
    data: ISetVar[];
  };
}

export interface ISetReqColDetails {
  type: typeof FETCH_CLIENT_SET_REQ_COL_DETAILS;
  payload: {
    colId: string;
    folderId: string;
  }
}

export interface ISetReqParentSettings {
  type: typeof FETCH_CLIENT_SET_REQ_PARENT_SETTINGS;
  payload: {
    parentSettings: ISettings;
  }
}

export interface ISetOAuthToken {
  type: typeof FETCH_CLIENT_SET_OAUTH_TOKEN;
  payload: {
    token: string;
  }
}

export interface ISetPreCondition {
  type: typeof FETCH_CLIENT_SET_PRECONDITION;
  payload: {
    condition: ITest;
    reqIndex: number;
    condIndex: number;
  }
}

export interface ISetAddPreRequest {
  type: typeof FETCH_CLIENT_SET_ADD_PREREQUEST;
  payload: {
    request: IRunRequest;
  }
}

export interface ISetDeletePreRequest {
  type: typeof FETCH_CLIENT_SET_DELETE_PREREQUEST;
  payload: {
    index: number;
  }
}

export interface ISetDeletePreCondition {
  type: typeof FETCH_CLIENT_SET_DELETE_PRECONDITION;
  payload: {
    reqIndex: number;
    condIndex: number;
  }
}

export interface ISetCollectionList {
  type: typeof FETCH_CLIENT_SET_COLLECTION_LIST;
  payload: {
    colList: ICollection[];
  }
}

export interface ISetColRequestList {
  type: typeof FETCH_CLIENT_SET_COL_REQUEST_LIST;
  payload: {
    colReqList: IColRequest;
  }
}

export interface ISetSelectedCol {
  type: typeof FETCH_CLIENT_SET_COL_ID;
  payload: {
    colId: string;
    index: number;
  }
}

export interface ISetSelectedRequest {
  type: typeof FETCH_CLIENT_SET_REQ_ID;
  payload: {
    reqId: string;
    index: number;
    parentId: string;
  }
}

export interface ISetPreFetch {
  type: typeof FETCH_CLIENT_SET_PREFETCH;
  payload: {
    preFetch: IPreFetch;
  }
}

export interface ISetSkipPreFetch {
  type: typeof FETCH_CLIENT_SET_SKIP_PARENT_PREFETCH;
  payload: {
    skip: boolean;
  }
}

export interface ISetSkipHeaders {
  type: typeof FETCH_CLIENT_SET_SKIP_PARENT_HEADERS
  payload: {
    skip: boolean;
  }
}

export type RequestActionTypes = | ISetURL | ISetMethod | ISetParams | ISetAuth | ISetHeaders | ISetBody | ISetRequest | ISetTest |
  ISetRawLang | ISetResetBody | ISetRawValue | ISetBinaryData | ISetNotes | ISetAddVar | ISetReqColDetails | ISetReqParentSettings | ISetFormDataBody |
  ISetOAuthToken | ISetPreCondition | ISetAddPreRequest | ISetDeletePreRequest | ISetDeletePreCondition | ISetCollectionList | ISetColRequestList |
  ISetSelectedCol | ISetSelectedRequest | ISetPreFetch | ISetSkipPreFetch | ISetSkipHeaders;