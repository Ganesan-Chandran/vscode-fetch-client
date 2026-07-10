import { IAuth } from "../../../types/auth.types";
import {
	ICollections,
	IFolder,
	IHistory,
	IVariable,
} from "../../../types/sidebar.types";
import { IRequestModel, IBodyData } from "../../../types/request.types";
import { ITableData } from "../../../types/common.types";
import { ITest } from "../../../types/prefetch.types";
import { v4 as uuidv4 } from "uuid";
import { version } from "../../../../../package.json";
import {
	PostmanSchema_2_1,
	POSTMAN_SCHEMA_V2_1,
	Auth as PostmanAuth,
	ApikeyElement,
	Items,
	RequestObject,
	Body as PostmanBody,
	Header as PostmanHeader,
	URLObject,
	QueryParam,
	FormParameter,
	FormParameterType,
	Mode,
	URLEncodedParameter,
	AuthType,
	Event as PostmanEvent,
	Variable,
	VariableType,
} from "../../../types/postman_2_1.types";

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

export function ExportBuilderPostman2_1(
	col: ICollections,
	apiRequests: Collection<IRequestModel>,
	hisId: string,
	folderId: string,
	variable: IVariable,
): PostmanSchema_2_1 {
	let rootItems: Items[] = [];

	if (hisId) {
		const requests = apiRequests
			.chain()
			.find({ id: { $in: [hisId] } })
			.data({ removeMeta: true }) as IRequestModel[];

		if (requests.length > 0) {
			if (folderId) {
				const folder = findItem(col, folderId) as IFolder;
				const folderDefaultHeaders = mergeHeaders([], folder.settings?.headers);
				const folderItem = buildFolderShell(folder);
				folderItem.item = [mapRequest(requests[0], folderDefaultHeaders)];
				rootItems = [folderItem];
			} else {
				rootItems = [
					mapRequest(requests[0], mergeHeaders([], col.settings?.headers)),
				];
			}
		}
	} else if (folderId) {
		const folder = findItem(col, folderId) as IFolder;
		const collectionHeaders = mergeHeaders([], col.settings?.headers);
		rootItems = [buildFolderItem(folder, apiRequests, collectionHeaders)];
	} else {
		const rootData: (IHistory | IFolder)[] = col.data ?? [];
		const collectionHeaders = mergeHeaders([], col.settings?.headers);
		rootItems = rootData.map((item) =>
			buildItem(item, apiRequests, collectionHeaders),
		);
	}

	const { auth: collectionAuth } = mapAuthPostman(col.settings?.auth);
	const variables = mapCollectionVariables(variable);

	return {
		info: {
			_postman_id: col.id,
			name:
				col.name?.toUpperCase().trim() === "DEFAULT"
					? "Default Export"
					: (col.name ?? "Untitled Collection"),
			description: `Exported from Fetch Client ${version} on ${new Date().toISOString()}`,
			schema: POSTMAN_SCHEMA_V2_1,
		},
		item: rootItems,
		...(collectionAuth && { auth: collectionAuth }),
		...(variables.length && { variable: variables }),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// IVariable → Postman variables
// ─────────────────────────────────────────────────────────────────────────────

function mapCollectionVariables(variable?: IVariable): Variable[] {
	if (!variable?.data?.length) {
		return [];
	}

	return variable.data
		.filter((v) => v.key?.trim())
		.map((v) => ({
			id: uuidv4(),
			key: v.key,
			value: String(v.value ?? ""),
			type: VariableType.String,
			disabled: v.isChecked === false,
			description: "",
		}));
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree building (folders nest natively in Postman, unlike the flat parentId
// shape used by the custom exporter - so this walks a real tree instead of
// flattening it).
// ─────────────────────────────────────────────────────────────────────────────

function buildItem(
	item: IHistory | IFolder,
	apiRequests: Collection<IRequestModel>,
	inheritedHeaders: ITableData[],
): Items {
	if (isFolder(item)) {
		return buildFolderItem(item, apiRequests, inheritedHeaders);
	}

	const requests = apiRequests
		.chain()
		.find({ id: { $in: [item.id] } })
		.data({ removeMeta: true }) as IRequestModel[];

	if (requests.length === 0) {
		return {
			name: item.name ?? "Untitled Request",
			request: {
				method: (item.method ?? "GET").toUpperCase(),
				url: item.url ?? "",
			},
		};
	}

	return mapRequest(requests[0], inheritedHeaders);
}

function buildFolderItem(
	folder: IFolder,
	apiRequests: Collection<IRequestModel>,
	inheritedHeaders: ITableData[],
): Items {
	const folderItem = buildFolderShell(folder);
	const ownHeaders = mergeHeaders(inheritedHeaders, folder.settings?.headers);
	const children = folder.data ?? [];
	folderItem.item = children.map((child) =>
		buildItem(child, apiRequests, ownHeaders),
	);
	return folderItem;
}

function buildFolderShell(folder: IFolder): Items {
	const authResult = mapAuthPostman(folder.settings?.auth);
	return {
		id: folder.id,
		name: folder.name ?? "Untitled Folder",
		item: [],
		...(authResult.auth && { auth: authResult.auth }),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// IRequestModel → Postman Items (request)
// ─────────────────────────────────────────────────────────────────────────────

function mapRequest(req: IRequestModel, inheritedHeaders: ITableData[]): Items {
	const mergedHeaders = mergeHeaders(inheritedHeaders, req.headers);
	const { url } = mapUrlPostman(req.url ?? "", req.params ?? []);
	const { body, bearerHeaderOverride, contentTypeHeader } = mapBody(req.body);

	const auth = mapAuthPostman(req.auth, mergedHeaders, req);
	const testEvent = buildTestEvent(req);

	const request: RequestObject = {
		method: (req.method ?? "get").toUpperCase(),
		...(auth.auth && { auth: auth.auth }),
		header: mapHeaders(
			mergedHeaders,
			auth.injectedHeader ?? bearerHeaderOverride,
			contentTypeHeader,
		),
		url,
		...(body && { body }),
	};

	return {
		id: req.id,
		name: req.name || "Untitled Request",
		...(req.notes?.trim() && { description: req.notes.trim() }),
		request,
		...(testEvent && {
			event: [testEvent],
		}),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Test and set Variable mapper
// ─────────────────────────────────────────────────────────────────────────────

function buildTestEvent(req: IRequestModel): PostmanEvent | undefined {
	const exec = [
		...buildSetVariableScript(req),
		...buildPostmanTestScript(req.tests),
	];

	if (exec.length === 0) {
		return undefined;
	}

	return {
		listen: "test",
		script: {
			type: "text/javascript",
			exec,
		},
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps IAuth -> Postman's Auth block.
 * "inherit" is mapped by returning undefined entirely - Postman's own
 * semantics for "no auth field on this item" IS "inherit from parent",
 * so this is a direct native match, not a workaround.
 *
 * For bearertoken with a non-standard prefix (anything other than "Bearer"),
 * Postman's built-in bearer type always sends the literal word "Bearer" - it
 * has no prefix override. Rather than silently dropping the custom prefix,
 * we fall back to emitting a manual Authorization header instead and mark
 * the request as noauth, so the actual wire behavior is preserved.
 */
function mapAuthPostman(
	auth: IAuth | undefined,
	_headers?: ITableData[],
	_reqForContext?: IRequestModel,
): { auth?: PostmanAuth; injectedHeader?: PostmanHeader } {
	if (!auth || !auth.authType || auth.authType === "inherit") {
		return {};
	}

	switch (auth.authType) {
		case "noauth":
			return { auth: { type: AuthType.Noauth } };

		case "basic":
			return {
				auth: {
					type: AuthType.Basic,
					basic: [
						{ key: "username", value: auth.userName ?? "", type: "string" },
						{ key: "password", value: auth.password ?? "", type: "string" },
						{ key: "showPassword", value: !!auth.showPwd, type: "boolean" },
					],
				},
			};

		case "bearertoken": {
			const prefix = (auth.tokenPrefix ?? "Bearer").trim();
			if (prefix === "" || prefix.toLowerCase() === "bearer") {
				return {
					auth: {
						type: AuthType.Bearer,
						bearer: [
							{ key: "token", value: auth.password ?? "", type: "string" },
						],
					},
				};
			}
			// Non-standard prefix: emit as a manual header instead, auth left as noauth
			// so Postman doesn't ALSO inject its own "Bearer <token>" header.
			return {
				auth: { type: AuthType.Noauth },
				injectedHeader: {
					key: "Authorization",
					value: `${prefix} ${auth.password ?? ""}`,
				},
			};
		}

		case "apikey":
			const location = auth.addTo === "query" ? "query" : "header";
			return {
				auth: {
					type: AuthType.Apikey,
					apikey: [
						{ key: "key", value: auth.userName ?? "", type: "string" },
						{ key: "value", value: auth.password ?? "", type: "string" },
						{ key: "in", value: location, type: "string" },
					],
				},
			};

		case "aws": {
			const aws = auth.aws;
			if (!aws) {
				return { auth: { type: AuthType.Noauth } };
			}
			const awsv4: ApikeyElement[] = [
				{ key: "accessKey", value: aws.accessKey ?? "", type: "string" },
				{ key: "secretKey", value: aws.secretAccessKey ?? "", type: "string" },
				{ key: "region", value: aws.region ?? "", type: "string" },
				{ key: "service", value: aws.service ?? "", type: "string" },
			];
			if (aws.sessionToken) {
				awsv4.push({
					key: "sessionToken",
					value: aws.sessionToken,
					type: "string",
				});
			}
			return { auth: { type: AuthType.Awsv4, awsv4 } };
		}

		case "oauth2": {
			const o = auth.oauth;
			if (!o) {
				return { auth: { type: AuthType.Noauth } };
			}
			const oauth2: ApikeyElement[] = [
				{ key: "tokenName", value: o.tokenName ?? "", type: "string" },
				{ key: "grant_type", value: o.grantType, type: "string" },
				{ key: "accessTokenUrl", value: o.tokenUrl ?? "", type: "string" },
				{ key: "clientId", value: o.clientId ?? "", type: "string" },
				{ key: "clientSecret", value: o.clientSecret ?? "", type: "string" },
				{ key: "scope", value: o.scope ?? "", type: "string" },
				{ key: "client_authentication", value: o.clientAuth, type: "string" },
				{ key: "addTokenTo", value: "header", type: "string" },
			];
			if (o.grantType === "password_credentials") {
				oauth2.push(
					{ key: "username", value: o.username ?? "", type: "string" },
					{ key: "password", value: o.password ?? "", type: "string" },
				);
			}
			if (o.advancedOpt?.audience) {
				oauth2.push({
					key: "audience",
					value: o.advancedOpt.audience,
					type: "string",
				});
			}
			if (o.advancedOpt?.resource) {
				oauth2.push({
					key: "resource",
					value: o.advancedOpt.resource,
					type: "string",
				});
			}
			return { auth: { type: AuthType.Oauth2, oauth2 } };
		}

		default:
			// Unknown authType - never break export, fall back to noauth
			return { auth: { type: AuthType.Noauth } };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Body mapper
// ─────────────────────────────────────────────────────────────────────────────

function mapBody(body?: IBodyData): {
	body?: PostmanBody;
	bearerHeaderOverride?: PostmanHeader;
	contentTypeHeader?: PostmanHeader;
} {
	if (!body || body.bodyType === "none") {
		return {};
	}

	switch (body.bodyType) {
		case "formdata": {
			const formdata: FormParameter[] = (body.formdata ?? [])
				.filter((r) => r.key.trim() !== "" || r.value.trim() !== "")
				.map((r) => {
					const isFile = r.type === "file";
					return {
						key: r.key,
						type: isFile ? FormParameterType.File : FormParameterType.Text,
						...(isFile ? { src: r.value } : { value: r.value }),
						...(r.isChecked === false && { disabled: true }),
					};
				});
			return { body: { mode: Mode.Formdata, formdata } };
		}

		case "formurlencoded": {
			const urlencoded: URLEncodedParameter[] = (body.urlencoded ?? [])
				.filter((r) => r.key.trim() !== "" || r.value.trim() !== "")
				.map((r) => ({
					key: r.key,
					value: r.value,
					...(r.isChecked === false && { disabled: true }),
				}));
			return { body: { mode: Mode.Urlencoded, urlencoded } };
		}

		case "raw": {
			const lang = mapRawLanguage(body.raw?.lang);
			return {
				body: {
					mode: Mode.Raw,
					raw: body.raw?.data ?? "",
					options: { raw: { language: lang } },
				},
				contentTypeHeader: {
					key: "Content-Type",
					value: contentTypeForRawLanguage(lang),
				},
			};
		}

		case "binary": {
			const bin = body.binary;
			if (!bin) {
				return {};
			}
			// Per decision: reference the filename only. Postman expects a real
			// file path on the user's disk for src - the actual bytes can't be
			// embedded in the collection JSON, so this will need to be manually
			// re-attached in Postman after import.
			return {
				body: { mode: Mode.File, file: { src: bin.fileName ?? null } },
			};
		}

		case "graphql":
			let variables = body.graphql?.variables ?? "";
			try {
				JSON.parse(variables);
			} catch {
				variables = "{}";
			}
			return {
				body: {
					mode: Mode.Graphql,
					graphql: {
						query: body.graphql?.query ?? "",
						variables,
					},
				},
				contentTypeHeader: {
					key: "Content-Type",
					value: "application/json",
				},
			};

		default:
			return {};
	}
}

function mapRawLanguage(lang?: string): string {
	const l = (lang ?? "").toLowerCase();
	if (l.includes("json")) {
		return "json";
	}
	if (l.includes("xml")) {
		return "xml";
	}
	if (l.includes("html")) {
		return "html";
	}
	if (l.includes("javascript") || l === "js") {
		return "javascript";
	}
	return "text";
}

/** Content-Type header to inject for raw bodies that don't already declare one. */
function contentTypeForRawLanguage(lang: string): string {
	switch (lang) {
		case "json":
			return "application/json";
		case "xml":
			return "application/xml";
		case "html":
			return "text/html";
		case "javascript":
			return "application/javascript";
		default:
			return "text/plain";
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Header mapper (with inheritance + implicit raw-body content-type)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merges parent-level default headers with a child's own headers.
 * The child's own key wins on conflict (case-insensitive match).
 */
function mergeHeaders(
	parent: ITableData[],
	child?: ITableData[],
): ITableData[] {
	const childKeys = new Set(
		(child ?? []).map((h) => h.key.trim().toLowerCase()).filter(Boolean),
	);
	const inheritedOnly = parent.filter(
		(h) => !childKeys.has(h.key.trim().toLowerCase()),
	);
	return [...inheritedOnly, ...(child ?? [])];
}

function mapHeaders(
	rows: ITableData[],
	...extras: (PostmanHeader | undefined)[]
): PostmanHeader[] {
	const mapped: PostmanHeader[] = rows
		.filter((r) => r.key.trim() !== "" || r.value.trim() !== "")
		.map((r) => ({
			key: r.key,
			value: r.value,
			...(r.isChecked === false && { disabled: true }),
		}));

	for (const extra of extras) {
		if (
			extra &&
			!mapped.some((h) => h.key.toLowerCase() === extra.key.toLowerCase())
		) {
			mapped.push(extra);
		}
	}

	return mapped;
}

// ─────────────────────────────────────────────────────────────────────────────
// URL mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Splits a raw url string (which may contain {{variables}} and may or may
 * not have a scheme) into Postman's URLObject shape, and merges in the
 * request's own query-param table. {{handlebar}} tokens are treated as
 * atomic so splitting on "." or "/" never breaks a variable reference.
 */
function mapUrlPostman(
	rawUrl: string,
	params: ITableData[],
): { url: URLObject; extraQueryFromParams: boolean } {
	if (!rawUrl.trim()) {
		const query = mapQueryParams(params);
		return {
			url: { raw: "", ...(query.length > 0 && { query }) },
			extraQueryFromParams: query.length > 0,
		};
	}

	const protocolMatch = rawUrl.match(/^([a-zA-Z][a-zA-Z\d+\-.]*):\/\//);
	const protocol = protocolMatch?.[1];
	let rest = protocol ? rawUrl.slice(protocolMatch[0].length) : rawUrl;

	const [beforeQuery, queryString] = splitOnce(rest, "?");
	const [hostAndPath, hash] = splitOnce(beforeQuery, "#");

	const firstSlash = findAtomicIndex(hostAndPath, "/");
	const hostPart =
		firstSlash === -1 ? hostAndPath : hostAndPath.slice(0, firstSlash);
	const pathPart = firstSlash === -1 ? "" : hostAndPath.slice(firstSlash + 1);

	const host = tokenizeAtomic(hostPart, ".");
	const path = pathPart === "" ? [] : tokenizeAtomic(pathPart, "/");
	const variables = path
		.filter((p) => p.startsWith(":"))
		.map((p) => ({ key: p.substring(1) }));

	const urlQuery = parseQueryString(queryString ?? "");
	const paramQuery = mapQueryParams(params);
	const mergedQuery = mergeQueryParams(urlQuery, paramQuery);

	const rebuiltQueryString =
		mergedQuery.length > 0
			? "?" +
				mergedQuery
					.filter((q) => q.disabled !== true)
					.map((q) => `${q.key}=${q.value}`)
					.join("&")
			: "";

	const raw =
		(protocol ? `${protocol}://` : "") +
		hostPart +
		(pathPart ? `/${pathPart}` : "") +
		rebuiltQueryString +
		(hash ? `#${hash}` : "");

	return {
		url: {
			raw,
			...(protocol && { protocol }),
			...(host.length > 0 && { host }),
			...(path.length > 0 && { path }),
			...(mergedQuery.length > 0 && { query: mergedQuery }),
			...(variables.length > 0 && { variable: variables }),
		},
		extraQueryFromParams: paramQuery.length > 0,
	};
}

function mapQueryParams(params: ITableData[]): QueryParam[] {
	return params
		.filter((r) => r.key.trim() !== "" || r.value.trim() !== "")
		.map((r) => ({
			key: r.key,
			value: r.value,
			...(r.isChecked === false && { disabled: true }),
		}));
}

function parseQueryString(qs: string): QueryParam[] {
	if (!qs) {
		return [];
	}
	return qs
		.split("&")
		.filter(Boolean)
		.map((pair) => {
			const [k, v] = splitOnce(pair, "=");
			return { key: decodeURIComponent(k), value: decodeURIComponent(v ?? "") };
		});
}

/** Params-table entries win on key conflict; url-embedded query fills in the rest. */
function mergeQueryParams(
	fromUrl: QueryParam[],
	fromParams: QueryParam[],
): QueryParam[] {
	const paramKeys = new Set(fromParams.map((q) => (q.key ?? "").toLowerCase()));
	const urlOnly = fromUrl.filter(
		(q) => !paramKeys.has((q.key ?? "").toLowerCase()),
	);
	return [...urlOnly, ...fromParams];
}

function splitOnce(str: string, sep: string): [string, string | undefined] {
	const idx = str.indexOf(sep);
	return idx === -1
		? [str, undefined]
		: [str.slice(0, idx), str.slice(idx + 1)];
}

/** Splits on `delimiter` but never inside a {{...}} token. */
function tokenizeAtomic(input: string, delimiter: string): string[] {
	const parts: string[] = [];
	let buffer = "";
	let i = 0;
	while (i < input.length) {
		if (input[i] === "{" && input[i + 1] === "{") {
			const end = input.indexOf("}}", i);
			if (end !== -1) {
				buffer += input.slice(i, end + 2);
				i = end + 2;
				continue;
			}
		}
		if (input[i] === delimiter) {
			parts.push(buffer);
			buffer = "";
		} else {
			buffer += input[i];
		}
		i++;
	}
	parts.push(buffer);
	return parts.filter((p) => p.length > 0);
}

/** Same atomic-token guard as tokenizeAtomic, used just to locate the first split point. */
function findAtomicIndex(input: string, delimiter: string): number {
	let i = 0;
	while (i < input.length) {
		if (input[i] === "{" && input[i + 1] === "{") {
			const end = input.indexOf("}}", i);
			if (end !== -1) {
				i = end + 2;
				continue;
			}
		}
		if (input[i] === delimiter) {
			return i;
		}
		i++;
	}
	return -1;
}

// Set variable function

function buildJsAccessor(path?: string): string {
	if (!path?.trim()) {
		return "";
	}
	const p = path.trim();
	if (p.startsWith("[")) {
		return p;
	}
	return "." + p;
}

function buildSetVariableScript(req: IRequestModel): string[] {
	const lines: string[] = [];

	for (const item of req.setvar ?? []) {
		switch (item.parameter) {
			case "Response Body":
				lines.push(
					`pm.collectionVariables.set("${item.variableName}", pm.response.text());`,
				);
				break;

			case "JSON":
				lines.push(
					`pm.collectionVariables.set("${item.variableName}", pm.response.json()${buildJsAccessor(item.key)});`,
				);
				break;

			case "Header":
				lines.push(
					`pm.collectionVariables.set("${item.variableName}", pm.response.headers.get("${item.key}"));`,
				);
				break;

			case "Variable":
				lines.push(
					`pm.collectionVariables.set("${item.variableName}", pm.variables.get("${item.key}"));`,
				);
				break;
		}
	}

	return lines;
}

function buildPostmanTestScript(tests: ITest[] = []): string[] {
	if (tests.length === 0) {
		return [];
	}

	const script: string[] = [];

	let usesJson = false;

	for (const test of tests) {
		if (test.parameter === "JSON" && !usesJson) {
			script.push("const json = pm.response.json();");
			script.push("");
			usesJson = true;
		}

		script.push(...generateSingleTest(test));
		script.push("");
	}

	return script;
}

function symbol(action: string): string {
	switch (action) {
		case "equal":
			return "==";
		case "notEqual":
			return "!=";
		case "contains":
			return "contains";
		case "notContains":
			return "does not contain";
		default:
			return action;
	}
}

function getTestTitle(test: ITest): string {
	switch (test.parameter) {
		case "Response Code":
			return `Response code ${test.action} ${test.expectedValue}`;

		case "Response Time":
			return `Response time ${test.action} ${test.expectedValue} ms`;

		case "Content-Type":
			return `Content-Type ${symbol(test.action)} ${test.expectedValue}`;

		case "Content-Length":
			return `Content-Length ${test.action} ${test.expectedValue}`;

		case "Content-Encoding":
			return `Content-Encoding ${symbol(test.action)} ${test.expectedValue}`;

		case "Header":
			return `Header '${test.customParameter}' ${symbol(test.action)} ${test.expectedValue}`;

		case "Response Body":
			if (test.action === "isJSON") {
				return "Response body is valid JSON";
			}
			if (test.action === "regex") {
				return "Response body matches regex";
			}
			return `Response body ${test.action} ${test.expectedValue}`;

		case "JSON":
			if (test.action === "length") {
				return `JSON '${test.customParameter}' length == ${test.expectedValue}`;
			}
			if (test.action === "type") {
				return `JSON '${test.customParameter}' is ${test.expectedValue}`;
			}
			return `JSON '${test.customParameter}' ${symbol(test.action)} ${test.expectedValue}`;

		default:
			return "Test";
	}
}

function generateSingleTest(test: ITest): string[] {
	const title = getTestTitle(test);

	switch (test.parameter) {
		case "Response Code":
			return buildStatusTest(title, test);

		case "Response Time":
			return buildResponseTimeTest(title, test);

		case "Response Body":
			return buildBodyTest(title, test);

		case "Content-Type":
			return buildHeaderTest(title, "Content-Type", test);

		case "Content-Length":
			return buildHeaderTest(title, "Content-Length", test);

		case "Content-Encoding":
			return buildHeaderTest(title, "Content-Encoding", test);

		case "Header":
			return buildHeaderTest(title, test.customParameter ?? "", test);

		case "JSON":
			return buildJsonTest(title, test);

		default:
			return [];
	}
}

function buildStatusTest(title: string, test: ITest): string[] {
	if (test.action === "equal") {
		return [
			`pm.test("${title}", function () {`,
			`    pm.response.to.have.status(${test.expectedValue});`,
			`});`,
		];
	}

	if (test.action === "notEqual") {
		return [
			`pm.test("${title}", function () {`,
			`    pm.expect(pm.response.code).to.not.eql(${test.expectedValue});`,
			`});`,
		];
	}

	return comparisonTest(
		title,
		"pm.response.code",
		test.expectedValue,
		test.action,
	);
}

function buildResponseTimeTest(title: string, test: ITest): string[] {
	return comparisonTest(
		title,
		"pm.response.responseTime",
		test.expectedValue,
		test.action,
	);
}

function buildBodyTest(title: string, test: ITest): string[] {
	const value = JSON.stringify(test.expectedValue);

	switch (test.action) {
		case "equal":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(pm.response.text()).to.eql(${value});`,
				`});`,
			];

		case "notEqual":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(pm.response.text()).to.not.eql(${value});`,
				`});`,
			];

		case "contains":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(pm.response.text()).to.contain(${value});`,
				`});`,
			];

		case "regex":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(pm.response.text()).to.match(new RegExp(${value}));`,
				`});`,
			];

		case "isJSON":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(function(){ pm.response.json(); }).to.not.throw();`,
				`});`,
			];

		default:
			return [];
	}
}

function buildHeaderTest(title: string, header: string, test: ITest): string[] {
	const target = `pm.response.headers.get("${header}")`;
	const value = JSON.stringify(test.expectedValue);

	switch (test.action) {
		case "equal":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.eql(${value});`,
				`});`,
			];

		case "notEqual":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.not.eql(${value});`,
				`});`,
			];

		case "contains":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.contain(${value});`,
				`});`,
			];

		case "regex":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.match(new RegExp(${value}));`,
				`});`,
			];

		default:
			return [];
	}
}

function buildJsonTest(title: string, test: ITest): string[] {
	const path = test.customParameter ?? "";
	const value = JSON.stringify(test.expectedValue);

	const target = `json${buildJsAccessor(path)}`;

	switch (test.action) {
		case "equal":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.eql(${value});`,
				`});`,
			];

		case "notEqual":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.not.eql(${value});`,
				`});`,
			];

		case "contains":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.contain(${value});`,
				`});`,
			];

		case "notContains":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.not.contain(${value});`,
				`});`,
			];

		case "length":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}.length).to.eql(${Number(test.expectedValue)});`,
				`});`,
			];

		case "type":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.be.a(${JSON.stringify(test.expectedValue)});`,
				`});`,
			];

		case "regex":
			return [
				`pm.test("${title}", function () {`,
				`    pm.expect(${target}).to.match(new RegExp(${value}));`,
				`});`,
			];

		default:
			return comparisonTest(title, target, test.expectedValue, test.action);
	}
}

function comparisonTest(
	title: string,
	target: string,
	expected: string,
	action: string,
): string[] {
	const operators: Record<string, string> = {
		">": "above",
		">=": "least",
		"<": "below",
		"<=": "most",
	};

	const fn = operators[action];

	if (!fn) {
		return [];
	}

	return [
		`pm.test("${title}", function () {`,
		`    pm.expect(${target}).to.be.at.${fn}(${Number(expected)});`,
		`});`,
	];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

function isFolder(item: IHistory | IFolder): item is IFolder {
	return (item as IFolder).type === "folder";
}

function findItem(source: { data?: any[] }, id: string): IFolder | IHistory {
	for (const item of source.data ?? []) {
		if (item.id === id) {
			return item;
		}
		if (item.data !== undefined) {
			const found = findItem(item, id);
			if (found) {
				return found;
			}
		}
	}
	throw new Error(`Item with id "${id}" not found in collection.`);
}
