import { ITableData } from "../../Common/Table/types";

export const FETCH_CLIENT_SET_COOKIE: "FETCH_CLIENT_SET_COOKIE" = "FETCH_CLIENT_SET_COOKIE";
export const FETCH_CLIENT_SET_ALL_COOKIE: "FETCH_CLIENT_SET_ALL_COOKIE" = "FETCH_CLIENT_SET_ALL_COOKIE";

export interface ICookie {
	id: string;
	name: string;
	data: ITableData[]
}

export interface ICookiesModel {
	cookies: ICookie[];
}

export interface ISetCookie {
	type: typeof FETCH_CLIENT_SET_COOKIE;
	payload: {
		currentCookie: ICookie;
	};
}

export interface ISetAllCookies {
	type: typeof FETCH_CLIENT_SET_ALL_COOKIE;
	payload: {
		cookies: ICookie[];
	};
}


export type CookieActionTypes = | ISetCookie | ISetAllCookies;
