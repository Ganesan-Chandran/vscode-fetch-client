import { IAwsAuth, IOAuth, ClientAuth, GrantType, IAuth } from "../types/auth.types";
import { IBinaryFileData } from "../types/requestBody.types";
import { IBodyData } from "../types/request.types";
import { ICookie } from "../types/cookie.types";
import { ISettings } from "../types/sidebar.types";
import { ITableData } from "../types/common.types";
import { ITest, ISetVar, IPreFetch } from "../types/prefetch.types";
import { requestBodyRaw } from "./requestBody.consts";

export const InitialRequestHeaders: ITableData[] = [
  {
    key: "Cache-Control",
    value: "no-cache",
    isChecked: true,
  },
  {
    key: "Accept",
    value: "*/*",
    isChecked: true,
  },
  {
    key: "User-Agent",
    value: "Fetch Client",
    isChecked: true,
  },
  {
    key: "Accept-Encoding",
    value: "gzip, deflate",
    isChecked: true,
  },
  {
    key: "Connection",
    value: "keep-alive",
    isChecked: true,
  },
  {
    key: "",
    value: "",
    isChecked: false,
  },
];

export const emptyRow: ITableData = {
  isChecked: false,
  key: "",
  value: ""
};

export const InitialAwsAuth: IAwsAuth = {
  service: "",
  region: "",
  accessKey: "",
  secretAccessKey: "",
  sessionToken: "",
};

export const InitialOAuth: IOAuth = {
  clientAuth: ClientAuth.Body,
  clientId: "",
  clientSecret: "",
  grantType: GrantType.Client_Crd,
  password: "",
  scope: "",
  tokenName: "access_token",
  tokenUrl: "",
  username: "",
  advancedOpt: {
    audience: "",
    resource: ""
  }
};

export const InitialAuth: IAuth = {
  authType: "noauth",
  userName: "",
  password: "",
  addTo: "queryparams",
  showPwd: false,
  tokenPrefix: "Bearer",
  aws: InitialAwsAuth,
  oauth: InitialOAuth
};

export const InitialBinaryData: IBinaryFileData = {
  fileName: "",
  data: {},
  contentTypeOption: "manual"
};

export const InitialBody: IBodyData = {
  bodyType: "none",
  formdata: [{ isChecked: false, key: "", value: "" }],
  urlencoded: [{ isChecked: false, key: "", value: "" }],
  raw: { data: "", lang: requestBodyRaw[1].value },
  binary: InitialBinaryData,
  graphql: { query: "", variables: "" },
};

export const InitialTest: ITest[] = [{
  parameter: "",
  action: "",
  expectedValue: ""
}];

export const InitialSetVar: ISetVar[] = [{
  parameter: "",
  key: "",
  variableName: ""
}];

export const InitialPreFetch: IPreFetch = {
  requests: []
};

export const InitialSettings: ISettings = {
  auth: InitialAuth,
  preFetch: InitialPreFetch,
  headers: InitialRequestHeaders
};

export const InitialCookie: ICookie = {
  id: "",
  name: "",
  data: []
};
