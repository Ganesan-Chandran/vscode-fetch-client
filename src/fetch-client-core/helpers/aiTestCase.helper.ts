import Ajv, { ErrorObject, ValidateFunction } from "ajv";
import { ActionsParametersMapping } from "../consts/test.consts";
import testCaseSchema from "../schemas/fetchClient_Testcases_schema_1_0.json";
import {
	AI_TESTCASE_SCHEMA,
	AI_TESTCASE_VERSION,
	IAIAssertion,
	IAIConvertResult,
	IAITestCaseFile,
} from "../types/aiTestCase.types";
import { ITest } from "../types/prefetch.types";

interface IAssertionDef {
	parameter: string;
	requires?: "name" | "path";
	hint: string;
}

// Single source of truth for both the prompt and the importer.
export const AssertionTypes: Record<string, IAssertionDef> = {
	statusCode: { parameter: "Response Code", hint: "" },
	responseTime: {
		parameter: "Response Time",
		hint: "expected is milliseconds",
	},
	body: { parameter: "Response Body", hint: "" },
	header: {
		parameter: "Header",
		requires: "name",
		hint: 'requires "name" (header name)',
	},
	jsonPath: {
		parameter: "JSON",
		requires: "path",
		hint: 'requires "path", for example "data.id" or "items[0].name"',
	},
};

export function getOperators(type: string): string[] {
	const def = AssertionTypes[type];
	const mapping = def && ActionsParametersMapping[def.parameter];
	return mapping
		? mapping.action.map((a: { value: string }) => a.value).filter(Boolean)
		: [];
}

export function buildSampleTestCaseFile(
	method: string,
	url: string,
): IAITestCaseFile {
	return {
		schema: AI_TESTCASE_SCHEMA,
		version: AI_TESTCASE_VERSION,
		requests: [
			{
				name: "Get user by id",
				method: method.toUpperCase(),
				url,
				testCases: [
					{
						name: "Returns user successfully",
						description: "Valid id returns 200 with user data",
						category: "positive",
						assertions: [
							{ type: "statusCode", operator: "equal", expected: 200 },
							{ type: "responseTime", operator: "<", expected: 2000 },
							{
								type: "header",
								name: "Content-Type",
								operator: "contains",
								expected: "application/json",
							},
							{ type: "body", operator: "isJSON" },
							{
								type: "jsonPath",
								path: "data.id",
								operator: "equal",
								expected: 1,
							},
							{
								type: "jsonPath",
								path: "data.email",
								operator: "regex",
								expected: "^[^@]+@[^@]+$",
							},
						],
					},
					{
						name: "Response field types",
						category: "schema",
						assertions: [
							{
								type: "jsonPath",
								path: "data.name",
								operator: "type",
								expected: "string",
							},
							{
								type: "jsonPath",
								path: "data.roles",
								operator: "type",
								expected: "array",
							},
							{
								type: "jsonPath",
								path: "data.roles",
								operator: "length",
								expected: 2,
							},
						],
					},
				],
			},
		],
	};
}

let validator: ValidateFunction | undefined;

function getValidator(): ValidateFunction {
	validator ??= new Ajv({ allErrors: true, strict: false }).compile(
		testCaseSchema,
	);
	return validator;
}

function formatSchemaErrors(errors: ErrorObject[] | null | undefined): string {
	const MAX_ERRORS = 5;
	const messages = (errors ?? [])
		.filter((e) => e.keyword !== "if")
		.map((e) => `${e.instancePath || "/"} ${e.message}`);
	const shown = messages.slice(0, MAX_ERRORS).join("\n");
	const more =
		messages.length > MAX_ERRORS
			? `\n...and ${messages.length - MAX_ERRORS} more.`
			: "";
	return `The test case file does not match the expected format:\n${shown}${more}`;
}

function normalizeUrl(url: string): string {
	return (url ?? "").trim().split(/[?#]/)[0].replace(/\/+$/, "");
}

function toExpected(value: IAIAssertion["expected"]): string {
	if (value === undefined) {
		return "";
	}
	return value === null ? "null" : String(value);
}

export function convertAITestCases(
	json: string,
	current: { method: string; url: string },
): IAIConvertResult {
	let file: IAITestCaseFile;
	try {
		file = JSON.parse(json);
	} catch {
		return { tests: [], warnings: [], error: "The file is not valid JSON." };
	}

	if (file?.schema !== AI_TESTCASE_SCHEMA) {
		return {
			tests: [],
			warnings: [],
			error: `Unrecognised file. Expected schema "${AI_TESTCASE_SCHEMA}".`,
		};
	}

	if (
		String(file.version).split(".")[0] !== AI_TESTCASE_VERSION.split(".")[0]
	) {
		return {
			tests: [],
			warnings: [],
			error: `Unsupported version "${file.version}".`,
		};
	}

	if (!Array.isArray(file.requests) || file.requests.length === 0) {
		return { tests: [], warnings: [], error: "No requests found in the file." };
	}

	const validate = getValidator();
	if (!validate(file)) {
		return {
			tests: [],
			warnings: [],
			error: formatSchemaErrors(validate.errors),
		};
	}

	const request = file.requests.find(
		(r) =>
			r.method?.toLowerCase() === current.method.toLowerCase() &&
			normalizeUrl(r.url) === normalizeUrl(current.url),
	);

	if (!request) {
		return {
			tests: [],
			warnings: [],
			error:
				"The test cases in this file are for a different request. Nothing was imported.",
		};
	}

	const tests: ITest[] = [];
	const warnings: string[] = [];

	for (const testCase of request.testCases ?? []) {
		for (const assertion of testCase.assertions ?? []) {
			const prefix = `'${testCase.name}': `;
			const def = AssertionTypes[assertion.type];
			if (!def) {
				warnings.push(`${prefix}unknown type '${assertion.type}' skipped.`);
				continue;
			}

			if (!getOperators(assertion.type).includes(assertion.operator)) {
				warnings.push(
					`${prefix}operator '${assertion.operator}' is not supported for '${assertion.type}'.`,
				);
				continue;
			}

			const customParameter =
				def.requires === "name"
					? assertion.name
					: def.requires === "path"
						? assertion.path
						: "";

			if (def.requires && !customParameter) {
				warnings.push(
					`${prefix}'${assertion.type}' is missing '${def.requires}'.`,
				);
				continue;
			}

			tests.push({
				parameter: def.parameter,
				action: assertion.operator,
				expectedValue: toExpected(assertion.expected),
				customParameter: customParameter ?? "",
			});
		}
	}

	if (tests.length === 0) {
		return {
			tests: [],
			warnings,
			error: "No valid test cases found for this request.",
		};
	}

	return { tests, warnings };
}
