import { IAuth } from "./auth.types";
import { ITableData } from "./common.types";
import { IPreFetch } from "./prefetch.types";

export interface IHistory {
	id: string;
	method: string;
	name: string;
	url: string;
	createdTime: string;
	modifiedTime: string;
}

export interface ISettings {
	auth: IAuth;
	preFetch?: IPreFetch;
	headers?: ITableData[];
	sortOrder?: "none" | "asc" | "dsc";
}

export interface ICollections {
	id: string;
	name: string;
	createdTime: string;
	modifiedTime: string;
	data?: (IHistory | IFolder)[];
	variableId: string;
	settings: ISettings;
}

export interface IFolder {
	id: string;
	name: string;
	createdTime: string;
	modifiedTime: string;
	type: "folder";
	data?: (IHistory | IFolder)[];
	settings: ISettings;
}

export interface IVariable {
	id: string;
	name: string;
	createdTime: string;
	modifiedTime: string;
	isActive: boolean;
	data: ITableData[];
}

export interface ISideBarModel {
	history: IHistory[];
	collections: ICollections[];
	variable: IVariable[];
}
