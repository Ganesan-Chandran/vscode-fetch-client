import { ITest } from "./prefetch.types";

export const AI_TESTCASE_SCHEMA = "fetch-client-testcases";
export const AI_TESTCASE_VERSION = "1.0";

export interface IAIAssertion {
	type: string;
	operator: string;
	expected?: string | number | boolean | null;
	name?: string;
	path?: string;
}

export interface IAITestCase {
	name: string;
	description?: string;
	category?: string;
	assertions: IAIAssertion[];
}

export interface IAIRequestTests {
	id?: string;
	name?: string;
	method?: string;
	url?: string;
	testCases: IAITestCase[];
	extensions?: Record<string, unknown>;
}

export interface IAITestCaseFile {
	schema: string;
	version: string;
	requests: IAIRequestTests[];
	extensions?: Record<string, unknown>;
}

export interface IAIConvertResult {
	tests: ITest[];
	warnings: string[];
	error?: string;
}
