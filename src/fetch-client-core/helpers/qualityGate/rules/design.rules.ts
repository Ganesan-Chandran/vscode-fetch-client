import { IQGRuleDefinition } from "../qgEngineTypes";
import { getHeader, safeParseJson } from "../qgHelpers";

// ─── Design rules ─────────────────────────────────────────────────────────────
export const designRules: IQGRuleDefinition[] = [
	{
		id: "uppercase-path",
		dimension: "Design",
		name: "Lowercase URL path",
		description: "Fails when the URL path contains uppercase letters.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const pathOnly = input.request.url.split("?")[0];
			const hasUppercase = pathOnly !== pathOnly.toLowerCase();
			return {
				applicable: true,
				passed: !hasUppercase,
				severity: hasUppercase ? "Medium" : undefined,
				issue: hasUppercase
					? {
							description: "URL path contains uppercase letters",
							impact:
								"Inconsistent URLs; some servers treat them as different resources",
							recommendation: "Use lowercase paths: /api/users not /api/Users",
							suggestedFix: `Suggested: ${pathOnly.toLowerCase()}`,
						}
					: undefined,
			};
		},
	},
	{
		id: "underscore-path",
		dimension: "Design",
		name: "Use hyphens instead of underscores",
		description: "Flags underscores in URL path segments.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const pathOnly = input.request.url.split("?")[0];
			const hasUnderscore = /\/[^/?#]*_[^/?#]*/.test(pathOnly);
			return {
				applicable: true,
				passed: !hasUnderscore,
				severity: hasUnderscore ? "Low" : undefined,
				issue: hasUnderscore
					? {
							description: "Underscores used in URL path segments",
							impact:
								"REST convention prefers hyphens over underscores for readability",
							recommendation: "Use hyphens: /user-profiles not /user_profiles",
						}
					: undefined,
			};
		},
	},
	{
		id: "no-api-version",
		dimension: "Design",
		name: "API versioning implemented",
		description:
			"Fails when no API version is detected in the URL path or an Api-Version header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const { request } = input;
			const urlLower = request.url.toLowerCase();
			const hasVersion =
				/\/v\d+\//.test(urlLower) ||
				request.headers?.some((h) => h.key?.toLowerCase() === "api-version");
			return {
				applicable: true,
				passed: !!hasVersion,
				severity: hasVersion ? undefined : "Medium",
				issue: hasVersion
					? undefined
					: {
							description: "No API versioning detected in URL path or headers",
							impact:
								"Breaking changes will affect all existing consumers simultaneously",
							recommendation:
								"Add a version to the URL path (/api/v1/) or use an Api-Version header",
						},
			};
		},
	},
	{
		id: "get-with-body",
		dimension: "Design",
		name: "GET request has no body",
		description: "Fails when a GET request has a request body.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const { request } = input;
			if (request.method.toLowerCase() !== "get") {
				return { applicable: false };
			}
			const hasBody =
				!!request.body?.raw?.data ||
				!!request.body?.formdata?.some((f) => f.key) ||
				!!request.body?.urlencoded?.some((f) => f.key);
			return {
				applicable: true,
				passed: !hasBody,
				severity: hasBody ? "High" : undefined,
				issue: hasBody
					? {
							description: "GET request has a request body",
							impact:
								"GET semantics prohibit side-effectful bodies; many proxies and CDNs strip them",
							recommendation:
								"Use POST for operations that require a body, or move data to query parameters",
						}
					: undefined,
			};
		},
	},
	{
		id: "mutation-verb-in-get",
		dimension: "Design",
		name: "GET endpoint is read-only",
		description:
			"Fails when a GET endpoint URL contains a state-changing verb (create/update/delete/...).",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const { request } = input;
			const urlLower = request.url.toLowerCase();
			const method = request.method.toLowerCase();
			const mutationKeywords = [
				"create",
				"update",
				"delete",
				"remove",
				"add",
				"insert",
				"modify",
			];
			const mutationGet =
				method === "get" && mutationKeywords.some((k) => urlLower.includes(k));
			return {
				applicable: true,
				passed: !mutationGet,
				severity: mutationGet ? "High" : undefined,
				issue: mutationGet
					? {
							description: "State-changing keyword detected in a GET endpoint",
							impact: "GET must be safe and idempotent",
							recommendation:
								"Use POST / PUT / PATCH / DELETE for state-changing operations",
						}
					: undefined,
			};
		},
	},
	{
		id: "verb-in-path",
		dimension: "Design",
		name: "Resource-oriented URL naming",
		description:
			"Flags verb-style URL segments (e.g. /getUser) instead of resource nouns.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const pathOnly = input.request.url.split("?")[0];
			const verbPath =
				/\/(get|create|update|delete|remove|fetch|list|find)[A-Z]/.test(
					pathOnly,
				);
			return {
				applicable: true,
				passed: !verbPath,
				severity: verbPath ? "Medium" : undefined,
				issue: verbPath
					? {
							description:
								"URL path uses a verb-style segment instead of a resource noun",
							impact: "Non-RESTful naming",
							recommendation: "Use resource-oriented nouns",
						}
					: undefined,
			};
		},
	},
	{
		id: "tech-specific-extension",
		dimension: "Design",
		name: "Clean resource URLs",
		description:
			"Flags technology-specific file extensions (.php, .asp, .jsp, ...) in the URL.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const urlLower = input.request.url.toLowerCase();
			const techExtension = /\.(php|asp|aspx|jsp|cfm)/.test(urlLower);
			return {
				applicable: true,
				passed: !techExtension,
				severity: techExtension ? "Medium" : undefined,
				issue: techExtension
					? {
							description: "Technology-specific file extension in URL",
							impact: "Exposes server technology",
							recommendation: "Use clean URLs without file extensions",
						}
					: undefined,
			};
		},
	},
	{
		id: "delete-missing-id",
		dimension: "Design",
		name: "DELETE targets a specific resource",
		description:
			"Fails when a DELETE endpoint has no resource identifier in its path.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const { request } = input;
			if (request.method.toLowerCase() !== "delete") {
				return { applicable: false };
			}
			const pathOnly = request.url.split("?")[0];
			const hasIdentifier =
				/{[^}]+}/.test(pathOnly) ||
				/\/\d+$/.test(pathOnly) ||
				/\/[\w-]{20,}$/.test(pathOnly);
			return {
				applicable: true,
				passed: hasIdentifier,
				severity: hasIdentifier ? undefined : "Medium",
				issue: hasIdentifier
					? undefined
					: {
							description:
								"DELETE endpoint appears to be missing a resource identifier",
							impact: "Mass-delete without an identifier is dangerous",
							recommendation: "Ensure DELETE targets a specific resource",
						},
			};
		},
	},
	{
		id: "inconsistent-content-type",
		dimension: "Design",
		name: "JSON request declares Content-Type",
		description:
			"Fails when a JSON request body is sent without a matching Content-Type header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const { request } = input;
			const rawBody = request.body?.raw?.data;
			const looksLikeJson =
				!!rawBody &&
				(() => {
					try {
						JSON.parse(rawBody);
						return true;
					} catch {
						return false;
					}
				})();
			if (!looksLikeJson) {
				return { applicable: false };
			}
			const contentType = getHeader(request.headers ?? [], "content-type");
			const validContentType =
				!!contentType && contentType.toLowerCase().includes("json");
			return {
				applicable: true,
				passed: validContentType,
				severity: validContentType ? undefined : "Medium",
				issue: validContentType
					? undefined
					: {
							description: "JSON body without Content-Type",
							impact: "Frameworks may not parse the payload correctly",
							recommendation: "Add Content-Type: application/json",
						},
			};
		},
	},
	{
		id: "non-standard-error-shape",
		dimension: "Design",
		name: "Standard error response format",
		description:
			"Fails when a 4xx/5xx (non-GraphQL) response doesn't use RFC7807 or a { code, message } shape.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const { request, response: resp } = input;
			const pathOnly = request.url.split("?")[0].toLowerCase();
			const isGraphQL = /\/graphql\/?$/.test(pathOnly);
			const status = resp?.response?.status ?? 0;
			if (!(status >= 400 && !isGraphQL)) {
				return { applicable: false };
			}
			const responseHeaders = resp?.headers ?? [];
			const contentType = (
				getHeader(responseHeaders, "content-type") ?? ""
			).toLowerCase();
			const isProblemJson = contentType.includes("application/problem+json");
			const body = safeParseJson(resp?.response?.responseData);
			const hasStandardShape =
				isProblemJson || ("code" in body && "message" in body);
			return {
				applicable: true,
				passed: hasStandardShape,
				severity: hasStandardShape ? undefined : "Low",
				issue: hasStandardShape
					? undefined
					: {
							description: "Error response does not follow a consistent schema",
							impact: "Clients must special-case error parsing",
							recommendation: "Adopt RFC7807 or { code, message }",
						},
			};
		},
	},
];
