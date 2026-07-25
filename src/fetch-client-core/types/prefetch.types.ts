import { ISettings } from "./sidebar.types";

export interface ITest {
	parameter: string;
	action: string;
	expectedValue: string;
	customParameter?: string;
}

export interface IRunRequest {
	reqId: string;
	parentId: string;
	colId: string;
	order: number;
	condition: ITest[];
}

export interface IPreFetch {
	requests: IRunRequest[];
	// skipParentRequest: boolean;
	// runMainOnPreFetchFailure: boolean
}

export interface ISetVar {
	parameter: string;
	key: string;
	variableName: string;
}

export interface ICollection {
	id: string;
	name: string;
}

export interface IRequestList {
	id: string;
	name: string;
}

export interface IColRequest {
	id: string;
	reqs: IRequestList[];
}

export interface IReqColModel {
	colId: string;
	folderId: string;
	parentSettings: ISettings;
	collectionList: ICollection[];
	colRequestList: IColRequest[];
}

export interface IReqSettings {
	skipParentHeaders: boolean;
	skipParentPreFetch: boolean;
}
