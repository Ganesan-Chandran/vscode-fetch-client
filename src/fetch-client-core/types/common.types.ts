export interface ICommonConfig {
	open: boolean[];
	horizontalLayout: boolean;
	theme: number;
	runItem: boolean;
	responseLimit: number;
}

export interface ITableData {
	isFixed?: boolean;
	isChecked?: boolean;
	type?: string;
	key: string;
	value: string;
}

export type TableType =
	| "reqHeaders"
	| "queryParams"
	| "resHeaders"
	| "formData"
	| "urlEncoded"
	| "resCookies";

export type TextType = "text" | "password";

export interface ITlsCertificate {
	host: string;
	type: "pem" | "pfx";
	certPath?: string;
	keyPath?: string;
	pfxPath?: string;
	passphrase?: string;
	enabled?: boolean;
}
