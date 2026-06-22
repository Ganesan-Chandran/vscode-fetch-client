import { IAuth } from "./auth.types";
import { IBinaryFileData, IGraphQLData, IRawData } from "./requestBody.types";
import { IPreFetch, ISetVar, ITest } from "./prefetch.types";
import { ITableData } from "./common.types";

export type MethodType = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

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

export interface IBodyData {
  bodyType: string;
  formdata?: ITableData[];
  urlencoded?: ITableData[];
  raw?: IRawData;
  binary?: IBinaryFileData;
  graphql?: IGraphQLData;
}