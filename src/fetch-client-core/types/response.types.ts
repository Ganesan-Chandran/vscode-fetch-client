import { ITableData } from "./common.types";

export interface IResponse {
	duration: number;
	isError: boolean;
	responseData: any;
	responseType?: {
		isBinaryFile: boolean;
		format: string;
	};
	size: string;
	status: number;
	statusText: string;
}

export interface ITestResult {
	test: string;
	actualValue: string;
	result: boolean;
}

export interface IReponseModel {
	id: string;
	response: IResponse;
	headers: ITableData[];
	cookies: ITableData[];
	loading?: boolean;
	testResults?: ITestResult[];
	preFetchResponse?: IPreFetchResponse[];
}

export interface IPreFetchResponse {
	reqId: string;
	name: string;
	resStatus: number;
	testResults?: ITestResult[];
	childrenResponse?: IPreFetchResponse[];
}
