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