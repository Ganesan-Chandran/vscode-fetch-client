import { IQGRuleDefinition } from "../qgEngineTypes";
import { getHeader } from "../qgHelpers";

const sensitiveParamNames = [
	"apikey",
	"api_key",
	"key",
	"token",
	"secret",
	"password",
	"passwd",
	"pwd",
	"access_token",
];

const secretPatterns: Array<{ re: RegExp; label: string }> = [
	{ re: /AKIA[0-9A-Z]{16}/, label: "AWS access key ID" },
	{
		re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
		label: "JWT",
	},
	{ re: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, label: "private key" },
	{
		re: /"(api[_-]?key|secret|password)"\s*:\s*"[^"]{6,}"/i,
		label: "API key/secret field",
	},
];

// ─── Security rules ───────────────────────────────────────────────────────────
export const securityRules: IQGRuleDefinition[] = [
	{
		id: "credentials-over-http",
		dimension: "Security",
		name: "HTTPS used",
		description:
			"Fails when authentication is configured on a plain HTTP (non-TLS) URL.",
		defaultSeverity: "Critical",
		evaluate: ({ input }) => {
			const { request } = input;
			const urlLower = request.url.toLowerCase();
			const isHttp = urlLower.startsWith("http://");
			const auth = request.auth;
			const isHttpWithAuth =
				isHttp && !!auth?.authType && auth.authType !== "none";
			return {
				applicable: true,
				passed: !isHttpWithAuth,
				severity: isHttpWithAuth ? "Critical" : undefined,
				issue: isHttpWithAuth
					? {
							description:
								"Credentials transmitted over plain HTTP (not HTTPS)",
							impact:
								"Credentials are exposed to network interception (MITM attack) - OWASP API2",
							recommendation: "Use HTTPS for all authenticated endpoints",
							suggestedFix: "Change the URL scheme from http:// to https://",
						}
					: undefined,
			};
		},
	},
	{
		id: "secret-in-query-param",
		dimension: "Security",
		name: "No secrets in query parameters",
		description:
			"Fails when an API key/secret/token is passed as a query parameter.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const hasSensitiveParam = input.request.params?.some(
				(p) => p.key && sensitiveParamNames.includes(p.key.toLowerCase()),
			);
			return {
				applicable: true,
				passed: !hasSensitiveParam,
				severity: hasSensitiveParam ? "High" : undefined,
				issue: hasSensitiveParam
					? {
							description: "API key or secret passed as a query parameter",
							impact:
								"Credentials are recorded in server access logs, browser history, and referrer headers",
							recommendation:
								"Move API keys to the Authorization header or a custom X-Api-Key header",
							suggestedFix: "Use: Headers → X-Api-Key: {{apiKey}}",
						}
					: undefined,
			};
		},
	},
	{
		id: "sensitive-keyword-in-path",
		dimension: "Security",
		name: "No sensitive data in URL",
		description:
			"Fails when a sensitive keyword (password/secret/token/credential) appears in the URL path.",
		defaultSeverity: "Critical",
		evaluate: ({ input }) => {
			const urlPath = input.request.url.toLowerCase().split("?")[0];
			const sensitiveUrl = /password|secret|token|credential/.test(urlPath);
			return {
				applicable: true,
				passed: !sensitiveUrl,
				severity: sensitiveUrl ? "Critical" : undefined,
				issue: sensitiveUrl
					? {
							description: "Sensitive keyword detected in the URL path",
							impact:
								"Sensitive data is permanently stored in server access logs - OWASP API3",
							recommendation:
								"Remove sensitive data from the URL; use the request body or headers instead",
						}
					: undefined,
			};
		},
	},
	{
		id: "no-auth-mutation",
		dimension: "Security",
		name: "Authentication configured",
		description:
			"Fails when a state-changing (POST/PUT/PATCH/DELETE) endpoint has no authentication configured.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const { request } = input;
			const method = request.method.toLowerCase();
			const urlPath = request.url.toLowerCase().split("?")[0];
			const isGraphQL = /\/graphql\/?$/.test(urlPath);
			const auth = request.auth;
			const mutatingMethods = ["post", "put", "patch", "delete"];
			const missingAuth =
				mutatingMethods.includes(method) &&
				!isGraphQL &&
				(!auth?.authType || auth.authType === "none");
			return {
				applicable: true,
				passed: !missingAuth,
				severity: missingAuth ? "High" : undefined,
				issue: missingAuth
					? {
							description: "No authentication on a state-changing endpoint",
							impact:
								"Unauthenticated writes violate OWASP API2:2023 Broken Authentication",
							recommendation:
								"Add Bearer token, API key, or OAuth2 authentication",
							suggestedFix:
								"Use the Auth tab to configure an authentication scheme",
						}
					: undefined,
			};
		},
	},
	{
		id: "hardcoded-bearer-token",
		dimension: "Security",
		name: "Bearer token uses variables",
		description:
			"Fails when a Bearer token is hardcoded instead of using a {{variable}}.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const auth = input.request.auth;
			const hardcodedToken =
				auth?.authType === "bearertoken" &&
				!!auth?.password &&
				!auth.password.includes("{{");
			return {
				applicable: true,
				passed: !hardcodedToken,
				severity: hardcodedToken ? "High" : undefined,
				issue: hardcodedToken
					? {
							description:
								"Bearer token appears hardcoded (not using a {{variable}})",
							impact:
								"Credentials may be committed to version control or shared configurations",
							recommendation:
								"Store credentials in collection variables: {{accessToken}}",
							suggestedFix: "Auth tab → Bearer Token → Value: {{accessToken}}",
						}
					: undefined,
			};
		},
	},
	{
		id: "weak-auth-scheme",
		dimension: "Security",
		name: "Avoid Basic Authentication",
		description: "Flags requests using Basic Authentication.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const isBasicAuth = input.request.auth?.authType === "basic";
			return {
				applicable: true,
				passed: !isBasicAuth,
				severity: isBasicAuth ? "Medium" : undefined,
				issue: isBasicAuth
					? {
							description: "Basic Authentication in use",
							impact:
								"Basic auth sends credentials base64-encoded (not encrypted) on every single request and has no built-in token expiry or rotation",
							recommendation:
								"Prefer OAuth2 or Bearer tokens with expiry for production APIs; reserve Basic auth for internal/dev-only use",
						}
					: undefined,
			};
		},
	},
	{
		id: "missing-header-x-content-type-options",
		dimension: "Security",
		name: "Response contains x-content-type-options",
		description:
			"Fails when the response is missing the X-Content-Type-Options: nosniff header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			if (!input.response) {
				return { applicable: false };
			}
			const hasHeader = !!getHeader(
				input.response.headers ?? [],
				"x-content-type-options",
			);
			return {
				applicable: true,
				passed: hasHeader,
				severity: hasHeader ? undefined : "Medium",
				issue: hasHeader
					? undefined
					: {
							description:
								"Missing X-Content-Type-Options: nosniff response header",
							impact: "Browser MIME-sniffing attacks are possible - OWASP API7",
							recommendation:
								"Configure the server to always include the x-content-type-options response header",
						},
			};
		},
	},
	{
		id: "missing-header-x-frame-options",
		dimension: "Security",
		name: "Response contains x-frame-options",
		description:
			"Fails when the response is missing the X-Frame-Options header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			if (!input.response) {
				return { applicable: false };
			}
			const hasHeader = !!getHeader(
				input.response.headers ?? [],
				"x-frame-options",
			);
			return {
				applicable: true,
				passed: hasHeader,
				severity: hasHeader ? undefined : "Medium",
				issue: hasHeader
					? undefined
					: {
							description: "Missing X-Frame-Options response header",
							impact: "Clickjacking attacks are possible",
							recommendation:
								"Configure the server to always include the x-frame-options response header",
						},
			};
		},
	},
	{
		id: "missing-header-hsts",
		dimension: "Security",
		name: "Response contains strict-transport-security",
		description:
			"Fails when the response is missing the Strict-Transport-Security (HSTS) header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			if (!input.response) {
				return { applicable: false };
			}
			const hasHeader = !!getHeader(
				input.response.headers ?? [],
				"strict-transport-security",
			);
			return {
				applicable: true,
				passed: hasHeader,
				severity: hasHeader ? undefined : "Medium",
				issue: hasHeader
					? undefined
					: {
							description:
								"Missing Strict-Transport-Security (HSTS) response header",
							impact: "Clients may downgrade to plain HTTP - OWASP API7",
							recommendation:
								"Configure the server to always include the strict-transport-security response header",
						},
			};
		},
	},
	{
		id: "stack-trace-exposed",
		dimension: "Security",
		name: "No stack traces in response",
		description:
			"Fails when the response body appears to contain a stack trace.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const bodyRaw = input.response?.response?.responseData;
			const bodyStr =
				typeof bodyRaw === "string" ? bodyRaw : JSON.stringify(bodyRaw ?? "");
			const hasStackTrace = /\tat [\w./\\]+\.(ts|js|java|py|cs):\d+/.test(
				bodyStr,
			);
			return {
				applicable: true,
				passed: !hasStackTrace,
				severity: hasStackTrace ? "High" : undefined,
				issue: hasStackTrace
					? {
							description: "Stack trace exposed in the response body",
							impact:
								"Internal implementation details aid attackers - OWASP API3:2023",
							recommendation:
								"Catch all exceptions server-side; return generic error messages to clients",
							suggestedFix:
								'Return: { "error": "Internal server error", "code": "ERR_INTERNAL" }',
						}
					: undefined,
			};
		},
	},
	{
		id: "sensitive-data-leak",
		dimension: "Security",
		name: "No sensitive secrets in response body",
		description:
			"Fails when the response body appears to contain AWS keys, JWTs, private keys, or secret fields.",
		defaultSeverity: "Critical",
		evaluate: ({ input }) => {
			const bodyRaw = input.response?.response?.responseData;
			const bodyStr =
				typeof bodyRaw === "string" ? bodyRaw : JSON.stringify(bodyRaw ?? "");
			let matchedPatternLabel: string | undefined;
			for (const p of secretPatterns) {
				if (p.re.test(bodyStr)) {
					matchedPatternLabel = p.label;
					break;
				}
			}
			return {
				applicable: true,
				passed: !matchedPatternLabel,
				severity: matchedPatternLabel ? "Critical" : undefined,
				issue: matchedPatternLabel
					? {
							description: `Potential ${matchedPatternLabel} exposed in the response body`,
							impact:
								"Leaked credentials/secrets can be exploited immediately by anyone who can read logs or capture traffic - OWASP API3",
							recommendation:
								"Never echo secrets/keys back in API responses; scrub logging middleware and response serializers",
						}
					: undefined,
			};
		},
	},
	{
		id: "cors-wildcard-mutation",
		dimension: "Security",
		name: "No CORS wildcard on mutations",
		description:
			"Fails when Access-Control-Allow-Origin is * on a non-GET (state-changing) endpoint.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const responseHeaders = input.response?.headers ?? [];
			const method = input.request.method.toLowerCase();
			const corsOrigin = getHeader(
				responseHeaders,
				"access-control-allow-origin",
			);
			const corsWildcardMutation = corsOrigin === "*" && method !== "get";
			return {
				applicable: true,
				passed: !corsWildcardMutation,
				severity: corsWildcardMutation ? "Medium" : undefined,
				issue: corsWildcardMutation
					? {
							description:
								"CORS wildcard (*) on a non-GET (state-changing) endpoint",
							impact:
								"Any origin can make credentialed cross-origin requests - OWASP API7",
							recommendation:
								"Restrict CORS to known, trusted origins on state-changing endpoints",
						}
					: undefined,
			};
		},
	},
	{
		id: "cors-wildcard-credentials",
		dimension: "Security",
		name: "No CORS wildcard with credentials",
		description:
			"Fails when Access-Control-Allow-Origin is * combined with Access-Control-Allow-Credentials: true.",
		defaultSeverity: "Critical",
		evaluate: ({ input }) => {
			const responseHeaders = input.response?.headers ?? [];
			const corsOrigin = getHeader(
				responseHeaders,
				"access-control-allow-origin",
			);
			const corsCreds = getHeader(
				responseHeaders,
				"access-control-allow-credentials",
			);
			const corsWildcardCredentials =
				corsOrigin === "*" && corsCreds?.toLowerCase() === "true";
			return {
				applicable: true,
				passed: !corsWildcardCredentials,
				severity: corsWildcardCredentials ? "Critical" : undefined,
				issue: corsWildcardCredentials
					? {
							description:
								"CORS wildcard origin combined with Access-Control-Allow-Credentials: true",
							impact:
								"Most browsers reject this combination, but some HTTP clients and misconfigured proxies do not - a high-risk misconfiguration that can leak credentialed responses to any origin",
							recommendation:
								"Never combine a wildcard origin with credentialed CORS; echo back a specific, validated origin instead",
						}
					: undefined,
			};
		},
	},
];
