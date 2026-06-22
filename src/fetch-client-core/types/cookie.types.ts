import { ITableData } from "./common.types";

export interface ICookie {
  id: string;
  name: string;
  data: ITableData[]
}

export interface ICookiesModel {
  cookies: ICookie[];
}
