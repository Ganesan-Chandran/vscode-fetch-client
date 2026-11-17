import { ITableData } from "./common.types";

export interface IResponse {
	duration: number;
	// Pre-request stage time (ms), set by the extension host.
	preRequestDuration?: number;
	// Tests and set-variable run time (ms), set by the UI after the response arrives.
	postFetchDuration?: number;
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
	isParentReq: boolean;
	testResults?: ITestResult[];
	childrenResponse?: IPreFetchResponse[];
}
