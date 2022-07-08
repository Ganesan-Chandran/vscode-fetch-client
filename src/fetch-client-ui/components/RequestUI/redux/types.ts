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

export interface IAuth {
  authType: string;
  userName: string;
  password: string;
  addTo: string;
  showPwd: boolean;
  tokenPrefix: string;
  aws?: IAwsAuth;
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
  setvar: ISetVar[];
  notes: string;
}

export interface ISetVar {
  parameter: string;
  key: string;
  variableName: string;
}

export interface IReqColModel {
  colId: string;
  folderId: string;
  parentSettings: ISettings;
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

export type RequestActionTypes = | ISetURL | ISetMethod | ISetParams | ISetAuth | ISetHeaders | ISetBody | ISetRequest | ISetTest | ISetRawLang | ISetResetBody | ISetRawValue | ISetBinaryData | ISetNotes | ISetAddVar | ISetReqColDetails | ISetReqParentSettings | ISetFormDataBody;