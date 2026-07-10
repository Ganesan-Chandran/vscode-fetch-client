import { ITableData } from "../../../../fetch-client-core/types/common.types";
import {
	IResponse,
	ITestResult,
	IPreFetchResponse,
} from "../../../../fetch-client-core/types/response.types";

export const FETCH_CLIENT_SET_RES_RESPONSE: "FETCH_CLIENT_SET_RES_RESPONSE" =
	"FETCH_CLIENT_SET_RES_RESPONSE";
export const FETCH_CLIENT_SET_RES_HEADERS: "FETCH_CLIENT_SET_RES_HEADERS" =
	"FETCH_CLIENT_SET_RES_HEADERS";
export const FETCH_CLIENT_SET_RES_COOKIES: "FETCH_CLIENT_SET_RES_COOKIES" =
	"FETCH_CLIENT_SET_RES_COOKIES";
export const FETCH_CLIENT_SET_LOADING: "FETCH_CLIENT_SET_LOADING" =
	"FETCH_CLIENT_SET_LOADING";
export const FETCH_CLIENT_SET_TEST_RESULT: "FETCH_CLIENT_SET_TEST_RESULT" =
	"FETCH_CLIENT_SET_TEST_RESULT";
export const FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE: "FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE" =
	"FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE";

export interface ISetResponse {
	type: typeof FETCH_CLIENT_SET_RES_RESPONSE;
	payload: {
		response: IResponse;
	};
}

export interface ISetHeaders {
	type: typeof FETCH_CLIENT_SET_RES_HEADERS;
	payload: {
		headers: ITableData[];
	};
}

export interface ISetCookies {
	type: typeof FETCH_CLIENT_SET_RES_COOKIES;
	payload: {
		cookies: ITableData[];
	};
}

export interface ISetLoading {
	type: typeof FETCH_CLIENT_SET_LOADING;
	payload: {
		loading: boolean;
	};
}

export interface ISetTestResult {
	type: typeof FETCH_CLIENT_SET_TEST_RESULT;
	payload: {
		testResults: ITestResult[];
	};
}

export interface ISetPreFetchResult {
	type: typeof FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE;
	payload: {
		preFetchResponse: IPreFetchResponse[];
	};
}

export type ResponseActionTypes =
	| ISetResponse
	| ISetHeaders
	| ISetCookies
	| ISetLoading
	| ISetTestResult
	| ISetPreFetchResult;
