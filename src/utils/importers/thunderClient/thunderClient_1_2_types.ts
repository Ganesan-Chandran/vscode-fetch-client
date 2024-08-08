export interface ThunderClient_Schema_1_2 {
  clientName: string;
  collectionName: string;
  collectionId: string;
  dateExported: string;
  version: string;
  folders?: (FoldersEntity)[] | null;
  requests?: (RequestsEntity)[] | null;
  settings: Settings;
  ref: string;
}

export interface FoldersEntity {
  _id: string;
  name: string;
  containerId: string;
  created: string;
  sortNum: number;
  settings: Settings;
}

export interface RequestsEntity {
  _id: string;
  colId: string;
  containerId: string;
  name: string;
  url: string;
  method: string;
  sortNum: number;
  created: string;
  modified: string;
  headers?: HeadersEntityOrFormEntity[];
  params?: ParamsEntity[];
  body?: BodyEntity;
  auth?: Auth;
}

export interface ParamsEntity {
  name: string;
  value: string;
  isPath: boolean;
  isDisabled?: boolean;
}

export interface BodyEntity {
  type: string;
  raw: string;
  form?: HeadersEntityOrFormEntity[];
  graphql?: Graphql;
  binary?: string;
  files?: HeadersEntityOrFormEntity[];
}

export interface HeadersEntityOrFormEntity {
  name: string;
  value: string;
  isDisabled?: boolean;
}

export interface Graphql {
  query: string;
  variables: string;
}

export interface Settings {
  auth: Auth;
  headers?: HeadersEntityOrFormEntity[];
}

export interface Auth {
  type: string;
  bearer?: string;
  bearerPrefix?: string;
  oauth2?: Oauth2;
  aws?: Aws;
  basic?: Basic;
}

export interface Oauth2 {
  grantType: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  clientAuth: string;
  scope: string;
  username: string;
  password: string;
  tokenPrefix: string;
  audience: string;
  resource: string;
}

export interface Aws {
  accessKeyId: string;
  secretKey: string;
  region: string;
  service: string;
  sessionToken: string;
}

export interface Basic {
  username: string;
  password: string;
}