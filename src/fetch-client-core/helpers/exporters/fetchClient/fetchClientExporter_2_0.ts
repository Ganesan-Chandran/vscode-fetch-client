import { IAuth } from "../../../types/auth.types";
import {
	IExportItem,
	IExportFolder,
	IExportRequest,
	HttpMethod,
	IExportCollectionSettings,
	IExportFolderDefaults,
	IExportAuth,
	IExportBody,
	IExportKeyValue,
	IExportAssertion,
	AssertionAction,
	AssertionSource,
	IExportVariableExtractor,
	IExportPreRunRequest,
	IFetchClientExportV2,
	IExportVariables,
} from "../../../types/fetchClient_2_0_types";
import { IFolder, ISettings, IVariable } from "../../../types/sidebar.types";
import { IRequestModel, IBodyData } from "../../../types/request.types";
import { ITableData } from "../../../types/common.types";
import { ITest, ISetVar, IPreFetch } from "../../../types/prefetch.types";
import { version } from "../../../../../package.json";

export function ExportBuilderV2(
	col: any,
	apiRequests: Collection<IRequestModel>,
	hisId: string,
	folderId: string,
	variable: IVariable,
): IFetchClientExportV2 {
	const items: IExportItem[] = [];

	if (hisId) {
		// Export a single request, optionally scoped inside a folder wrapper
		const requests = apiRequests
			.chain()
			.find({ id: { $in: [hisId] } })
			.data({ removeMeta: true }) as IRequestModel[];

		if (requests.length > 0) {
			if (folderId) {
				const folder = findItem(col, folderId) as IFolder;
				if (!folder) {
					throw new Error(`Item with id "${folderId}" not found.`);
				}
				// Folder itself at root, request nested inside it
				flattenFolder(folder, null, 1, [requests[0]], items);
			} else {
				// Scope is just this single request - no other item is part of the
				// export, so preRunRequests cannot resolve to anything and must be
				// omitted entirely rather than pruned down to an empty array.
				const mapped = mapRequest(requests[0], null, 1);
				delete mapped.preRunRequests;
				items.push(mapped);
			}
		}
	} else if (folderId) {
		// Export a specific folder and all its descendants
		const folder = findItem(col, folderId) as IFolder;
		if (!folder) {
			throw new Error(`Item with id "${folderId}" not found.`);
		}
		flattenFolder(folder, null, 1, null, items, apiRequests);
	} else {
		// Export the entire collection
		const rootData: (IHistory | IFolder)[] = col.data ?? [];
		rootData.forEach((item, index) => {
			flattenItem(item, null, index + 1, items, apiRequests);
		});
	}

	// preRunRequests may reference requests that live in other collections or
	// folders that are NOT part of this export. Those targets won't exist on
	// import, so strip any preRunRequest entry whose requestId isn't among the
	// items actually included in this export (collection settings, folder
	// defaults, and every request's own preRunRequests are all checked).
	const exportedIds = new Set(items.map((i) => i.id));

	let variables: IExportVariables = null;
	if (variable) {
		variables = {
			id: variable.id,
			name: variable.name,
			items: [],
		};
		for (const item of variable.data) {
			variables.items.push({
				key: item.key,
				value: item.value,
				enabled: true,
			});
		}
	}

	return {
		schemaVersion: 2,
		metadata: {
			id: col.id,
			name:
				col.name.toUpperCase().trim() === "DEFAULT"
					? "Default Export"
					: col.name,
			createdAt: toISO(col.createdTime),
			exportedAt: new Date().toISOString(),
			generator: `Fetch Client ${version}`,
		},
		settings: prunePreRunRequests(
			mapCollectionSettings(col.settings),
			exportedIds,
		),
		items: items.map((item) => pruneItemPreRunRequests(item, exportedIds)),
		variables,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-run request pruning
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strips preRunRequests whose requestId is not part of this export.
 * A request elsewhere in the user's collections that wasn't included won't
 * exist on import, so referencing it would produce a dangling reference.
 */
function prunePreRunRequests<
	T extends { preRunRequests?: IExportPreRunRequest[] },
>(target: T, exportedIds: Set<string>): T {
	if (!target.preRunRequests?.length) {
		return target;
	}

	const filtered = target.preRunRequests.filter((r) =>
		exportedIds.has(r.requestId),
	);

	if (filtered.length === target.preRunRequests.length) {
		return target;
	}

	const { preRunRequests, ...rest } = target;
	return filtered.length > 0
		? ({ ...rest, preRunRequests: filtered } as T)
		: (rest as T);
}

/** Applies prunePreRunRequests to a request item, or to a folder's defaults. */
function pruneItemPreRunRequests(
	item: IExportItem,
	exportedIds: Set<string>,
): IExportItem {
	if (item.type === "folder") {
		return {
			...item,
			defaults: prunePreRunRequests(item.defaults, exportedIds),
		};
	}
	return prunePreRunRequests(item, exportedIds);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tree flattening
// ─────────────────────────────────────────────────────────────────────────────

/** Dispatch a single IHistory or IFolder into the flat items array. */
function flattenItem(
	item: IHistory | IFolder,
	parentId: string | null,
	order: number,
	out: IExportItem[],
	apiRequests: Collection<IRequestModel>,
): void {
	if (isFolder(item)) {
		flattenFolder(item, parentId, order, null, out, apiRequests);
	} else {
		// IHistory - fetch the full request from the DB
		const requests = apiRequests
			.chain()
			.find({ id: { $in: [item.id] } })
			.data({ removeMeta: true }) as IRequestModel[];

		if (requests.length > 0) {
			out.push(mapRequest(requests[0], parentId, order));
		}
	}
}

/**
 * Recursively flatten a folder and all its children into the flat items array.
 * `overrideRequests` is used when we're exporting a single request wrapped in
 * a folder - we skip the DB lookup and use the already-fetched request.
 */
function flattenFolder(
	folder: IFolder,
	parentId: string | null,
	order: number,
	overrideRequests: IRequestModel[] | null,
	out: IExportItem[],
	apiRequests?: Collection<IRequestModel>,
): void {
	const exportFolder: IExportFolder = {
		id: folder.id,
		type: "folder",
		name: folder.name,
		createdAt: toISO(folder.createdTime),
		order,
		...(parentId !== null && { parentId }),
		defaults: mapFolderDefaults(folder.settings),
	};
	out.push(exportFolder);

	if (overrideRequests) {
		overrideRequests.forEach((req, i) => {
			out.push(mapRequest(req, folder.id, i + 1));
		});
		return;
	}

	const children = folder.data ?? [];
	children.forEach((child, index) => {
		flattenItem(child, folder.id, index + 1, out, apiRequests!);
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// IRequestModel → IExportRequest
// ─────────────────────────────────────────────────────────────────────────────

function mapRequest(
	req: IRequestModel,
	parentId: string | null,
	order: number,
): IExportRequest {
	const queryParams = mapKeyValues(req.params);
	const headers = mapKeyValues(req.headers);
	const assertions = mapAssertions(req.tests);
	const variableExtractors = mapVariableExtractors(req.setvar);
	const preRunRequests = mapPreRunRequests(req.preFetch);

	const result: IExportRequest = {
		id: req.id,
		type: "request",
		name: req.name,
		createdAt: toISO(req.createdTime),
		order,
		...(parentId !== null && { parentId }),
		method: req.method.toUpperCase() as HttpMethod,
		url: req.url,
		auth: mapAuth(req.auth),
		body: mapBody(req.body),
		// Omit empty optional arrays / strings per schema spec
		...(queryParams.length > 0 && { queryParams }),
		...(headers.length > 0 && { headers }),
		...(assertions.length > 0 && { assertions }),
		...(variableExtractors.length > 0 && { variableExtractors }),
		...(preRunRequests.length > 0 && { preRunRequests }),
		...(req.notes?.trim() && { notes: req.notes.trim() }),
	};

	return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings mappers
// ─────────────────────────────────────────────────────────────────────────────

function mapCollectionSettings(settings: ISettings): IExportCollectionSettings {
	const headers = mapKeyValues(settings.headers ?? []);
	const preRunRequests = mapPreRunRequests(settings.preFetch);

	return {
		auth: mapAuth(settings.auth),
		...(headers.length > 0 && { headers }),
		...(preRunRequests.length > 0 && { preRunRequests }),
	};
}

function mapFolderDefaults(settings: ISettings): IExportFolderDefaults {
	const headers = mapKeyValues(settings.headers ?? []);
	const preRunRequests = mapPreRunRequests(settings.preFetch);

	return {
		auth: mapAuth(settings.auth),
		...(headers.length > 0 && { headers }),
		...(preRunRequests.length > 0 && { preRunRequests }),
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth mapper
// ─────────────────────────────────────────────────────────────────────────────

function mapAuth(auth: IAuth): IExportAuth {
	switch (auth.authType) {
		case "noauth":
			return { type: "noauth" };

		case "inherit":
			return { type: "inherit" };

		case "basic":
			return {
				type: "basic",
				credentials: {
					username: auth.userName,
					password: auth.password,
				},
			};

		case "bearertoken":
			return {
				type: "bearertoken",
				credentials: {
					token: auth.password, // bearer token stored in password field
					prefix: auth.tokenPrefix,
				},
			};

		case "apikey":
			return {
				type: "apikey",
				credentials: {
					key: auth.userName, // key name stored in userName field
					value: auth.password, // key value stored in password field
					addTo: auth.addTo as "header" | "queryparams",
				},
			};

		case "aws": {
			const aws = auth.aws!;
			return {
				type: "aws",
				credentials: {
					service: aws.service,
					region: aws.region,
					accessKey: aws.accessKey,
					secretAccessKey: aws.secretAccessKey,
					...(aws.sessionToken && { sessionToken: aws.sessionToken }),
				},
			};
		}

		case "oauth2": {
			const o = auth.oauth!;
			return {
				type: "oauth2",
				credentials: {
					authorizationUrl: o.authorizationUrl,
					...(o.grantType === "authorization_code_pkce" && { codeChallengeMethod: o.codeChallengeMethod }),
					tokenName: o.tokenName,
					tokenUrl: o.tokenUrl,
					clientId: o.clientId,
					clientSecret: o.clientSecret,
					scope: o.scope,
					grantType: o.grantType,
					clientAuth: o.clientAuth,
					...(o.grantType === "password_credentials" && {
						username: o.username ?? "",
						password: o.password ?? "",
					}),
					...((o.advancedOpt?.audience || o.advancedOpt?.resource) && {
						advanced: {
							...(o.advancedOpt.audience && {
								audience: o.advancedOpt.audience,
							}),
							...(o.advancedOpt.resource && {
								resource: o.advancedOpt.resource,
							}),
						},
					}),
				},
			};
		}

		default:
			// Fallback - treat unknown authType as noauth so export never breaks
			return { type: "noauth" };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Body mapper
// ─────────────────────────────────────────────────────────────────────────────

function mapBody(body: IBodyData): IExportBody {
	switch (body.bodyType) {
		case "none":
			return { type: "none" };

		case "formdata": {
			const fields = mapKeyValues(body.formdata ?? []);
			return { type: "formdata", fields };
		}

		case "formurlencoded": {
			const fields = mapKeyValues(body.urlencoded ?? []);
			return { type: "formurlencoded", fields };
		}

		case "raw":
			return {
				type: "raw",
				content: body.raw?.data ?? "",
				language: body.raw?.lang ?? "text",
			};

		case "binary": {
			const bin = body.binary!;
			const ext = bin.fileName.split(".").pop()?.toLowerCase() ?? "";
			return {
				type: "binary",
				fileName: bin.fileName,
				contentType: resolveContentType(ext, bin.contentTypeOption),
				contentTypeOption:
					bin.contentTypeOption === "manual" ? "manual" : "auto",
			};
		}

		case "graphql":
			return {
				type: "graphql",
				query: body.graphql?.query ?? "",
				variables: body.graphql?.variables ?? "",
			};

		default:
			return { type: "none" };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Key-value mapper  (strips empty / placeholder rows)
// ─────────────────────────────────────────────────────────────────────────────

function mapKeyValues(rows: ITableData[]): IExportKeyValue[] {
	return rows
		.filter((r) => r.key.trim() !== "" || r.value.trim() !== "")
		.map((r) => ({
			key: r.key,
			value: r.value,
			enabled: r.isChecked ?? true,
		}));
}

// ─────────────────────────────────────────────────────────────────────────────
// Assertion mapper  (ITest[] → IExportAssertion[])
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps the internal `parameter` string to the export's `AssertionSource`.
 * "Header" and "JSON" carry an extra sub-path stored in `customParameter`.
 */
function mapAssertions(tests: ITest[]): IExportAssertion[] {
	return tests
		.filter((t) => t.parameter.trim() !== "" && t.action.trim() !== "")
		.map((t): IExportAssertion => {
			const { source, path } = resolveAssertionSource(
				t.parameter,
				t.customParameter,
			);
			return {
				source,
				...(path !== undefined && { path }),
				action: t.action as AssertionAction,
				expectedValue: t.expectedValue,
			};
		});
}

function resolveAssertionSource(
	parameter: string,
	customParameter?: string,
): { source: AssertionSource; path?: string } {
	switch (parameter) {
		case "Response Code":
			return { source: "response.status" };
		case "Response Body":
			return { source: "response.body" };
		case "Response Time":
			return { source: "response.duration" };
		case "Content-Type":
			return { source: "headers.Content-Type" };
		case "Content-Length":
			return { source: "headers.Content-Length" };
		case "Content-Encoding":
			return { source: "headers.Content-Encoding" };
		case "Header":
			// customParameter holds the specific header name
			return { source: "headers.custom", path: customParameter };
		case "JSON":
			// customParameter holds the JSONPath expression
			return { source: "body.jsonPath", path: customParameter };
		default:
			// Unknown parameter - use response.body as a safe fallback
			return { source: "response.body" };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Variable extractor mapper  (ISetVar[] → IExportVariableExtractor[])
// ─────────────────────────────────────────────────────────────────────────────

function mapVariableExtractors(setvars: ISetVar[]): IExportVariableExtractor[] {
	return setvars
		.filter((s) => s.parameter.trim() !== "" && s.variableName.trim() !== "")
		.map((s) => {
			const { source, path } = resolveAssertionSource(s.parameter, s.key);
			return {
				source,
				...(path !== undefined && { path }),
				variableName: s.variableName,
			};
		});
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-run requests mapper  (IPreFetch → IExportPreRunRequest[])
// ─────────────────────────────────────────────────────────────────────────────

function mapPreRunRequests(preFetch?: IPreFetch): IExportPreRunRequest[] {
	if (!preFetch?.requests?.length) {
		return [];
	}

	return preFetch.requests
		.filter((r) => r.reqId.trim() !== "")
		.map((r): IExportPreRunRequest => {
			const condition = mapRunCondition(r.condition);
			return {
				requestId: r.reqId,
				order: r.order,
				...(condition !== undefined && { condition }),
			};
		});
}

/**
 * Maps the ITest[] condition on a run-request to a single IExportAssertion.
 * Only the first valid condition is used (a single gate per pre-run entry).
 */
function mapRunCondition(conditions: ITest[]): IExportAssertion | undefined {
	if (!conditions?.length) {
		return undefined;
	}

	const first = conditions.find(
		(c) => c.parameter.trim() !== "" && c.action.trim() !== "",
	);
	if (!first) {
		return undefined;
	}

	const { source, path } = resolveAssertionSource(
		first.parameter,
		first.customParameter,
	);

	return {
		source,
		...(path !== undefined && { path }),
		action: first.action as AssertionAction,
		expectedValue: first.expectedValue,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts the app's "DD-Mon-YYYY HH:MM:SS" date strings to ISO-8601.
 * Falls back to the raw string if parsing fails so export never throws.
 */
function toISO(dateStr: string): string {
	if (!dateStr) {
		return new Date().toISOString();
	}
	const parsed = new Date(dateStr);
	return isNaN(parsed.getTime()) ? dateStr : parsed.toISOString();
}

/** Type guard: IFolder has a `type` field set to "folder". */
function isFolder(item: IHistory | IFolder): item is IFolder {
	return (item as IFolder).type === "folder";
}

/**
 * Resolves the MIME content type for a binary body.
 * Uses the same FileTypes map already in your codebase.
 */
function resolveContentType(ext: string, contentTypeOption: string): string {
	if (contentTypeOption === "manual") {
		return "application/octet-stream";
	}
	// Import FileTypes from your existing constants if available,
	// or inline a minimal lookup here as a fallback.
	const FileTypes: Record<string, string> = {
		json: "application/json",
		txt: "text/plain",
		text: "text/plain",
		csv: "text/csv",
		xml: "application/xml",
		pdf: "application/pdf",
		png: "image/png",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		gif: "image/gif",
		zip: "application/zip",
		// Add more or import from your existing FileTypes constant
	};
	return FileTypes[ext] ?? "application/octet-stream";
}

/**
 * Walks the collection tree to find an item by id.
 * Same logic as your existing `findItem` utility - kept here to avoid
 * cross-file dependencies. Replace with your existing `findItem` import
 * if preferred.
 */
function findItem(source: { data?: any[] }, id: string): IFolder | IHistory | undefined {
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
	return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal type alias (IHistory is not an IRequestModel)
// ─────────────────────────────────────────────────────────────────────────────
interface IHistory {
	id: string;
	method: string;
	name: string;
	url: string;
	createdTime: string;
}
