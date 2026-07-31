import { IMockRoute } from "../../fetch-client-core/types/mockServer.types";
import { ICollections } from "../../fetch-client-core/types/sidebar.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import { v4 as uuidv4 } from "uuid";
import yaml from "js-yaml";
import fs from "fs";
import https from "https";
import http from "http";

// ---------------------------------------------------------------------------
// Generate routes from a Fetch Client collection
// ---------------------------------------------------------------------------
export function generateMockFromCollection(
	collection: ICollections,
): IMockRoute[] {
	const routes: IMockRoute[] = [];

	function processItems(items: any[]): void {
		if (!Array.isArray(items)) {
			return;
		}
		for (const item of items) {
			if (item.type === "folder") {
				processItems(item.data ?? []);
			} else {
				const req = item as IRequestModel;
				if (!req.url) {
					continue;
				}

				let routePath = "/";
				try {
					const parsed = new URL(
						req.url.startsWith("http") ? req.url : `http://localhost${req.url}`,
					);
					routePath = parsed.pathname || "/";
				} catch {
					routePath = req.url.startsWith("/") ? req.url : "/" + req.url;
				}

				routes.push({
					id: uuidv4(),
					name: req.name || `${req.method.toUpperCase()} ${routePath}`,
					method: req.method.toUpperCase() as IMockRoute["method"],
					path: sanitizePath(routePath),
					statusCode: 200,
					bodyType: "json",
					body: JSON.stringify({ message: "Mock response" }, null, 2),
					headers: [{ key: "Content-Type", value: "application/json" }],
					delayMs: 0,
					isEnabled: true,
					bodyMatcher: {
						enabled: false,
						matchType: "none",
						value: "",
					},
				});
			}
		}
	}

	processItems(collection.data ?? []);
	return deduplicateRoutes(routes);
}

// ---------------------------------------------------------------------------
// Generate routes from OpenAPI v3 spec (URL or file path)
// ---------------------------------------------------------------------------
export async function generateMockFromOpenAPI(input: {
	source: "url" | "file";
	value: string;
}): Promise<IMockRoute[]> {
	try {
		const raw = await loadOpenAPISource(input);
		const spec = parseSpec(raw);
		return extractRoutesFromSpec(spec);
	} catch (err) {
		writeLog("error::generateMockFromOpenAPI(): " + err);
		throw err;
	}
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadOpenAPISource(input: {
	source: "url" | "file";
	value: string;
}): Promise<string> {
	if (input.source === "file") {
		return fs.readFileSync(input.value, "utf8");
	}
	// URL fetch
	return new Promise<string>((resolve, reject) => {
		const get = input.value.startsWith("https") ? https.get : http.get;
		const req = get(input.value, { timeout: 10000 }, (res) => {
			let data = "";
			res.on("data", (chunk: string) => {
				data += chunk;
			});
			res.on("end", () => resolve(data));
		});
		req.on("error", reject);
		req.on("timeout", () => {
			req.destroy();
			reject(new Error("Request timed out"));
		});
	});
}

function parseSpec(raw: string): any {
	const trimmed = raw.trimStart();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		return JSON.parse(raw);
	}
	return yaml.load(raw);
}

function extractRoutesFromSpec(spec: any): IMockRoute[] {
	const routes: IMockRoute[] = [];
	const paths = spec?.paths ?? {};

	for (const [pathKey, pathItem] of Object.entries(paths)) {
		const methods = [
			"get",
			"post",
			"put",
			"patch",
			"delete",
			"options",
			"head",
		];
		for (const method of methods) {
			const operation: any = (pathItem as any)[method];
			if (!operation) {
				continue;
			}

			const statusCode = pickFirstSuccessStatus(operation.responses);
			const body = extractExampleBody(operation, statusCode);
			const contentType = pickContentType(operation, statusCode);

			routes.push({
				id: uuidv4(),
				name:
					operation.operationId ??
					operation.summary ??
					`${method.toUpperCase()} ${pathKey}`,
				method: method.toUpperCase() as IMockRoute["method"],
				path: openApiPathToExpressPath(pathKey),
				statusCode,
				bodyType: contentTypeToBodyType(contentType),
				body: body,
				headers: contentType
					? [{ key: "Content-Type", value: contentType }]
					: [],
				delayMs: 0,
				isEnabled: true,
				bodyMatcher: {
					enabled: false,
					matchType: "none",
					value: "",
				},
			});
		}
	}

	return deduplicateRoutes(routes);
}

function pickFirstSuccessStatus(responses: any): number {
	if (!responses) {
		return 200;
	}
	for (const code of ["200", "201", "202", "204"]) {
		if (responses[code]) {
			return parseInt(code, 10);
		}
	}
	const keys = Object.keys(responses).filter((k) => k.startsWith("2"));
	return keys.length > 0 ? parseInt(keys[0], 10) : 200;
}

function pickContentType(operation: any, statusCode: number): string {
	const response =
		operation?.responses?.[statusCode] ?? operation?.responses?.["default"];
	if (!response?.content) {
		return "application/json";
	}
	const types = Object.keys(response.content);
	const preferred = [
		"application/json",
		"application/xml",
		"text/plain",
		"text/html",
	];
	for (const t of preferred) {
		if (types.includes(t)) {
			return t;
		}
	}
	return types[0] ?? "application/json";
}

function extractExampleBody(operation: any, statusCode: number): string {
	const response =
		operation?.responses?.[statusCode] ?? operation?.responses?.["default"];
	if (!response?.content) {
		return "{}";
	}

	for (const [, mediaType] of Object.entries<any>(response.content)) {
		// Named examples
		if (mediaType?.examples) {
			const first = Object.values<any>(mediaType.examples)[0];
			if (first?.value !== undefined) {
				return JSON.stringify(first.value, null, 2);
			}
		}
		// Inline example
		if (mediaType?.example !== undefined) {
			return JSON.stringify(mediaType.example, null, 2);
		}
		// Schema default / generate minimal example
		if (mediaType?.schema) {
			return JSON.stringify(schemaToExample(mediaType.schema), null, 2);
		}
	}

	return "{}";
}

function schemaToExample(schema: any, depth = 0): unknown {
	if (!schema || depth > 4) {
		return null;
	}

	if (schema.example !== undefined) {
		return schema.example;
	}
	if (schema.default !== undefined) {
		return schema.default;
	}
	if (schema.enum && schema.enum.length > 0) {
		return schema.enum[0];
	}
	if (schema.const !== undefined) {
		return schema.const;
	}

	switch (schema.type) {
		case "object": {
			const obj: Record<string, unknown> = {};
			for (const [key, val] of Object.entries<any>(schema.properties ?? {})) {
				obj[key] = schemaToExample(val, depth + 1);
			}
			return obj;
		}
		case "array":
			return [schemaToExample(schema.items, depth + 1)];
		case "string":
			return schema.format === "date-time"
				? new Date().toISOString()
				: "string";
		case "integer":
		case "number":
			return 0;
		case "boolean":
			return true;
		default:
			return null;
	}
}

function openApiPathToExpressPath(openApiPath: string): string {
	// Convert {param} → :param
	return openApiPath.replace(/\{([^}]+)\}/g, ":$1");
}

function contentTypeToBodyType(ct: string): IMockRoute["bodyType"] {
	if (ct.includes("json")) {
		return "json";
	}
	if (ct.includes("xml")) {
		return "xml";
	}
	if (ct.includes("html")) {
		return "html";
	}
	if (ct.includes("text")) {
		return "text";
	}
	return "json";
}

function sanitizePath(p: string): string {
	// Ensure path starts with /
	const clean = p.startsWith("/") ? p : "/" + p;
	// Remove query strings
	return clean.split("?")[0] || "/";
}

function deduplicateRoutes(routes: IMockRoute[]): IMockRoute[] {
	const seen = new Set<string>();
	return routes.filter((r) => {
		const key = `${r.method}:${r.path}`;
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}
