import { ITableData } from "../../Common/Table/types";
import {
	FETCH_CLIENT_SET_LOADING,
	FETCH_CLIENT_SET_RES_COOKIES, FETCH_CLIENT_SET_RES_HEADERS, FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE, FETCH_CLIENT_SET_RES_RESPONSE,
	FETCH_CLIENT_SET_TEST_RESULT,
	IPreFetchResponse,
	IResponse, ITestResult, ResponseActionTypes
} from "./types";


export const SetResponseAction = (value: IResponse): ResponseActionTypes => {
	return {
		type: FETCH_CLIENT_SET_RES_RESPONSE,
		payload: {
			response: value
		}
	};
};

export const SetResponseHeadersAction = (value: ITableData[]): ResponseActionTypes => {
	return {
		type: FETCH_CLIENT_SET_RES_HEADERS,
		payload: {
			headers: value
		}
	};
};

export const SetResponseCookiesAction = (value: ITableData[]): ResponseActionTypes => {
	return {
		type: FETCH_CLIENT_SET_RES_COOKIES,
		payload: {
			cookies: value
		}
	};
};

export const SetResponseLoadingAction = (value: boolean): ResponseActionTypes => {
	return {
		type: FETCH_CLIENT_SET_LOADING,
		payload: {
			loading: value
		}
	};
};

export const SetTestResultAction = (value: ITestResult[]): ResponseActionTypes => {
	return {
		type: FETCH_CLIENT_SET_TEST_RESULT,
		payload: {
			testResults: value
		}
	};
};

export const SetPreFetchResponseAction = (value: IPreFetchResponse[]): ResponseActionTypes => {
	return {
		type: FETCH_CLIENT_SET_RES_PREFETCH_RESPONSE,
		payload: {
			preFetchResponse: value
		}
	};
};
