export type DataFileFormat = "csv" | "json";
export type CsvSeparator = "," | ";" | "\t";

export interface IDataDrivenConfig {
	fileFormat: DataFileFormat;
	csvSeparator: CsvSeparator;
	maxRows: number;
	stopOnRowFailure: boolean;
	selectedRequestIds: string[];
}

export interface IDataDrivenRowResult {
	rowIndex: number;
	requestId: string;
	requestName: string;
	method: string;
	url: string;
	status: number;
	statusText: string;
	duration: number;
	testTotal: number;
	testPassed: number;
	isError: boolean;
	error?: string;
}

export interface IDataDrivenResult {
	testName: string;
	startTime: string;
	endTime: string;
	totalRows: number;
	totalRequests: number;
	passedRequests: number;
	failedRequests: number;
	rows: IDataDrivenRowResult[];
}

export interface IDataParseResult {
	rows: Record<string, string>[];
	columns: string[];
	rowCount: number;
	error?: string;
}

export interface IValidationResult {
	valid: boolean;
	missingVars: string[];
	presentVars: string[];
}
