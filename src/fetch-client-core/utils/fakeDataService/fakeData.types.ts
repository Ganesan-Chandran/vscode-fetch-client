export type FakeDataType =
	| "name"
	| "email"
	| "phone"
	| "uuid"
	| "address"
	| "date"
	| "number"
	| "boolean"
	| "company"
	| "url"
	| "ip"
	| "color"
	| "sentence"
	| "paragraph"
	| "city"
	| "country"
	| "creditcard"
	| "regex";

export type FakeDataSchemaFormat = "csv" | "json";

export interface IFakeDataColumn {
	column: string;
	type: FakeDataType;
	// date format (moment tokens, e.g. YYYY-MM-DD) or phone mask (e.g. (###) ###-####)
	format?: string;
	min?: number;
	max?: number;
	// only used when type is "regex"
	pattern?: string;
}

export interface IFakeDataSchemaParseResult {
	columns: IFakeDataColumn[];
	error?: string;
}

export interface IFakeDataGenerateResult {
	rows: Record<string, string>[];
	columns: string[];
}
