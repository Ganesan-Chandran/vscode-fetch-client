import {
	AssertionTypes,
	buildSampleTestCaseFile,
	getOperators,
} from "./aiTestCase.helper";
import { IBodyData } from "../types/request.types";
import { ITableData } from "../types/common.types";

export type AIPromptKind = "testcase" | "documentation";

export const AIPromptOptions: { name: string; value: AIPromptKind }[] = [
	{ name: "Create test case", value: "testcase" },
	{ name: "Create documentation", value: "documentation" },
];

export interface IAIPromptRequest {
	method: string;
	url: string;
	params: ITableData[];
	headers: ITableData[];
	authType: string;
	body: IBodyData;
}

export interface IAIPromptResponse {
	status: number;
	statusText: string;
	duration: number;
	headers: ITableData[];
	body: string;
}

const MAX_BODY_CHARS = 20000;
const REDACTED = "<redacted>";
const SENSITIVE_KEY =
	/authorization|token|secret|passw(or)?d|pwd|api[-_]?key|cookie|session|credential|signature|bearer|private[-_]?key/i;
const VARIABLE_ONLY = /^\s*\{\{[^}]+\}\}\s*$/;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]+/g;

function isSensitive(key: string, value: unknown): boolean {
	return (
		SENSITIVE_KEY.test(key) &&
		!(typeof value === "string" && VARIABLE_ONLY.test(value))
	);
}

function redactJsonValue(node: unknown): unknown {
	if (Array.isArray(node)) {
		return node.map(redactJsonValue);
	}
	if (node && typeof node === "object") {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(node)) {
			out[k] =
				isSensitive(k, v) && (v === null || typeof v !== "object")
					? REDACTED
					: redactJsonValue(v);
		}
		return out;
	}
	return node;
}

// Masks values of sensitive keys in JSON, key=value / key: value text, and JWTs.
function redactText(text: string): string {
	let result: string;
	try {
		result = JSON.stringify(redactJsonValue(JSON.parse(text)), null, 2);
	} catch {
		result = text.replace(
			/([\w-]*(?:authorization|token|secret|passw(?:or)?d|pwd|api[-_]?key|cookie|session|credential|signature|private[-_]?key)[\w-]*["']?\s*[=:]\s*["']?)([^\s&"',;<]+)/gi,
			(match, prefix: string, value: string) =>
				VARIABLE_ONLY.test(value) ? match : prefix + REDACTED,
		);
	}
	return result.replace(JWT, REDACTED);
}

function redactUrl(url: string): string {
	return url
		.replace(/\/\/[^/@\s]+@/, `//${REDACTED}@`)
		.replace(/([?&])([^=&#]+)=([^&#]*)/g, (match, sep, key, value) =>
			isSensitive(key, value) ? `${sep}${key}=${REDACTED}` : match,
		)
		.replace(JWT, REDACTED);
}

function formatTable(rows: ITableData[]): string {
	const lines = (rows ?? [])
		.filter((r) => r.key && r.isChecked !== false)
		.map((r) =>
			isSensitive(r.key, r.value)
				? `- ${r.key}: ${REDACTED}`
				: `- ${r.key}: ${redactText(String(r.value ?? ""))}`,
		);
	return lines.length > 0 ? lines.join("\n") : "(none)";
}

function truncate(text: string): string {
	return text.length > MAX_BODY_CHARS
		? text.slice(0, MAX_BODY_CHARS) + "\n...[truncated]"
		: text;
}

function formatBody(body: IBodyData): string {
	switch (body?.bodyType) {
		case "raw":
			return body.raw?.data
				? `Type: raw (${body.raw.lang})\n${truncate(redactText(body.raw.data))}`
				: "(none)";
		case "formurlencoded":
			return `Type: x-www-form-urlencoded\n${formatTable(body.urlencoded)}`;
		case "formdata":
			return `Type: form-data\n${formatTable(body.formdata)}`;
		case "graphql":
			return `Type: graphql\nQuery:\n${redactText(body.graphql?.query ?? "")}\nVariables:\n${redactText(body.graphql?.variables ?? "")}`;
		case "binary":
			return `Type: binary file (${body.binary?.fileName ?? ""})`;
		default:
			return "(none)";
	}
}

function buildRequestResponseSection(
	req: IAIPromptRequest,
	res: IAIPromptResponse,
): string {
	const resBody =
		typeof res.body === "string" ? res.body : JSON.stringify(res.body ?? "");

	return [
		"## Request",
		`Method: ${req.method.toUpperCase()}`,
		`URL: ${redactUrl(req.url)}`,
		`Auth type: ${req.authType || "none"} (credentials are not shared)`,
		"Query parameters:",
		formatTable(req.params),
		"Headers:",
		formatTable(req.headers),
		"Body:",
		formatBody(req.body),
		"",
		"## Response",
		`Status: ${res.status} ${res.statusText}`,
		`Time: ${res.duration} ms`,
		"Headers:",
		formatTable(res.headers),
		"Body:",
		truncate(redactText(resBody)),
	].join("\n");
}

function buildAllowedAssertions(): string {
	return Object.keys(AssertionTypes)
		.map((type) => {
			const hint = AssertionTypes[type].hint;
			return `- type "${type}" -> operators: ${getOperators(type).join(", ")}${hint ? ` (${hint})` : ""}`;
		})
		.join("\n");
}

export function buildTestCasePrompt(
	req: IAIPromptRequest,
	res: IAIPromptResponse,
	notes: string,
): string {
	const sample = JSON.stringify(
		buildSampleTestCaseFile(req.method, req.url),
		null,
		2,
	);

	return [
		"You are an API test engineer. Create test cases for the API request and response below.",
		"",
		buildRequestResponseSection(req, res),
		"",
		notes.trim() ? `## Additional instructions\n${notes.trim()}\n` : "",
		"## Output format",
		'Return a single JSON document that follows this structure. Put the request below as one item of "requests", group assertions into named "testCases" (for example positive, negative, schema, performance).',
		"",
		"Allowed assertion types and operators:",
		buildAllowedAssertions(),
		"",
		"Rules:",
		'- "expected" must be a string, number, boolean or null. Omit it for "isJSON".',
		'- For operator "type", expected must be one of: string, boolean, number, object, array, undefined.',
		'- For operator "length", expected is a number (array or string length).',
		'- For operator "regex", expected is a JavaScript regular expression string without flags or inline modifiers such as (?s); escape backslashes for JSON (for example "\\\\d+").',
		"- The output must be strictly valid JSON: double quotes only, no comments, no trailing commas.",
		"- Do not assert values that change between calls (timestamps, ids, etag, rate-limit counters, cache status, server name).",
		"- Do not invent types or operators; unsupported ones are skipped.",
		'- Copy "method" and "url" of the request exactly as provided.',
		"- Base expected values only on the request and response shown; do not guess unseen values.",
		"- Return only valid JSON, with no markdown fences and no extra text.",
		"",
		"Example output (format only; do not copy the values):",
		sample,
	]
		.filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
		.join("\n");
}

export function buildDocumentationPrompt(
	req: IAIPromptRequest,
	res: IAIPromptResponse,
	notes: string,
): string {
	return [
		"You are a technical writer. Write clear API documentation in Markdown for the request and response below.",
		"",
		buildRequestResponseSection(req, res),
		"",
		notes.trim() ? `## Additional instructions\n${notes.trim()}\n` : "",
		"## Output format",
		"Include: a short description, endpoint (method and URL), parameters, headers, request body fields, response fields with types, status codes seen, and an example request and response.",
		"Base the documentation only on the data shown; mark anything uncertain as an assumption.",
	]
		.filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
		.join("\n");
}

export function buildAIPrompt(
	kind: AIPromptKind,
	req: IAIPromptRequest,
	res: IAIPromptResponse,
	notes: string,
): string {
	return kind === "documentation"
		? buildDocumentationPrompt(req, res, notes)
		: buildTestCasePrompt(req, res, notes);
}
