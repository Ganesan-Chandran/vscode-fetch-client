import {
	IQGConfig,
	IQGDimensionResult,
	IQGGateStatus,
	IQGReport,
	IQGRequestInput,
	IQGRuleResult,
	IQualityGateIssue,
	IQualityGateResult,
	QGDimension,
	QGSeverity,
	QGVerdict,
} from "../types/qualityGate.types";
import { ITableData } from "../types/common.types";

// ─── Default scoring weights (must sum to 1 for a 0-100 overall score) ───────
const DEFAULT_WEIGHTS: Record<QGDimension, number> = {
	Functional: 0.2,
	Security: 0.2,
	Performance: 0.15,
	Design: 0.15,
	Observability: 0.1,
	TestCoverage: 0.1,
	Maintainability: 0.1,
};

const DEDUCTIONS: Record<QGSeverity, number> = {
	Critical: 40,
	High: 20,
	Medium: 10,
	Low: 5,
};

// ─── Default thresholds (unchanged behaviour vs. the previous hardcoded values) ─
const DEFAULT_THRESHOLDS = {
	performance: {
		slowMs: 500,
		verySlowMs: 2000,
		timeoutMs: 5000,
		payloadWarnBytes: 102_400,
		payloadFailBytes: 1_048_576,
		compressionThresholdBytes: 10_240,
	},
	scoring: {
		passScore: 85,
		conditionalScore: 70,
	},
};

type ResolvedThresholds = {
	performance: Required<NonNullable<IQGConfig["thresholds"]>["performance"]>;
	scoring: Required<NonNullable<IQGConfig["thresholds"]>["scoring"]>;
};

function resolveThresholds(config: IQGConfig): ResolvedThresholds {
	return {
		performance: {
			...DEFAULT_THRESHOLDS.performance,
			...(config.thresholds?.performance ?? {}),
		},
		scoring: {
			...DEFAULT_THRESHOLDS.scoring,
			...(config.thresholds?.scoring ?? {}),
		},
	};
}

function resolveWeights(config: IQGConfig): Record<QGDimension, number> {
	return { ...DEFAULT_WEIGHTS, ...(config.weights ?? {}) };
}

// ─── Rule suppression ─────────────────────────────────────────────────────────
// Inline tags look like: "@qg-disable security/no-auth-mutation" or
// "@qg-disable security" (whole dimension) or "@qg-disable *" (everything),
// placed anywhere in the request's Notes field.
const DISABLE_TAG_RE = /@qg-disable\s+([a-z0-9*_-]+(?:\/[a-z0-9*_-]+)?)/gi;

function parseInlineDisabledRules(notes?: string): Set<string> {
	const set = new Set<string>();
	if (!notes) {
		return set;
	}
	let m: RegExpExecArray | null;
	DISABLE_TAG_RE.lastIndex = 0;
	while ((m = DISABLE_TAG_RE.exec(notes))) {
		set.add(m[1].toLowerCase());
	}
	return set;
}

function applySuppression(
	dims: IQGDimensionResult[],
	disabled: Set<string>,
): { dims: IQGDimensionResult[]; suppressed: IQualityGateIssue[] } {
	if (disabled.size === 0) {
		return { dims, suppressed: [] };
	}
	const suppressed: IQualityGateIssue[] = [];
	const filteredDims = dims.map((d) => {
		const dimKey = d.dimension.toLowerCase();
		const kept: IQualityGateIssue[] = [];
		for (const issue of d.issues) {
			const isSuppressed =
				disabled.has("*") || disabled.has(dimKey) || disabled.has(issue.ruleId);
			if (isSuppressed) {
				suppressed.push({ ...issue, suppressed: true });
			} else {
				kept.push(issue);
			}
		}
		return makeDim(d.dimension, kept, d.rules);
	});
	return { dims: filteredDims, suppressed };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
let _idCounter = 0;

function makeIssue(
	reqId: string,
	dim: QGDimension,
	ruleId: string,
	sev: QGSeverity,
	description: string,
	impact: string,
	recommendation: string,
	suggestedFix?: string,
): IQualityGateIssue {
	return {
		id: `qg_${reqId}_${dim.toLowerCase()}_${++_idCounter}`,
		ruleId: `${dim.toLowerCase()}/${ruleId}`,
		severity: sev,
		dimension: dim,
		description,
		impact,
		recommendation,
		suggestedFix,
	};
}

function scoreFrom(issues: IQualityGateIssue[]): number {
	return Math.max(
		0,
		100 - issues.reduce((s, i) => s + DEDUCTIONS[i.severity], 0),
	);
}

function makeDim(
	dimension: QGDimension,
	issues: IQualityGateIssue[],
	rules: IQGRuleResult[] = [],
): IQGDimensionResult {
	return { dimension, score: scoreFrom(issues), issues, rules };
}

function getHeader(headers: ITableData[], name: string): string | undefined {
	return headers.find((h) => h.key?.toLowerCase() === name.toLowerCase())
		?.value;
}

function safeParseJson(raw: unknown): Record<string, unknown> {
	if (raw && typeof raw === "object") {
		return raw as Record<string, unknown>;
	}
	if (typeof raw === "string" && raw.trim()) {
		try {
			return JSON.parse(raw);
		} catch {
			/* non-JSON body */
		}
	}
	return {};
}

// ─── Dimension Checkers ───────────────────────────────────────────────────────

function checkFunctional(
	input: IQGRequestInput,
	reqId: string,
): IQGDimensionResult {
	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];
	const r = input.response;

	// Rule 1: Response received
	rules.push({
		ruleId: "functional/no-response",
		name: "Response received",
		passed: !!r,
		severity: !r ? "High" : undefined,
	});

	if (!r) {
		issues.push(
			makeIssue(
				reqId,
				"Functional",
				"no-response",
				"High",
				"No response recorded for this request",
				"Cannot evaluate functional correctness without a response",
				"Run the request at least once before the Quality Gate analysis",
			),
		);
		return makeDim("Functional", issues, rules);
	}

	const status = r.response?.status ?? 0;
	const method = input.request.method.toLowerCase();

	// Rule 2: No network errors
	const networkError = status === 0 || r.response?.isError;
	rules.push({
		ruleId: "functional/network-error",
		name: "No network errors",
		passed: !networkError,
		severity: networkError ? "Critical" : undefined,
	});

	if (networkError) {
		issues.push(
			makeIssue(
				reqId,
				"Functional",
				"network-error",
				"Critical",
				"Network / connection error — status code is 0",
				"Request never reached the server; all downstream evaluations are unreliable",
				"Verify the server is reachable and the URL is correct",
				"Check URL scheme, network proxy, firewall, and SSL certificate",
			),
		);
	}

	// Rule 3: No server errors
	const serverError = status >= 500;
	rules.push({
		ruleId: "functional/server-error",
		name: "No server errors",
		passed: !serverError,
		severity: serverError ? "Critical" : undefined,
	});

	if (serverError) {
		issues.push(
			makeIssue(
				reqId,
				"Functional",
				"server-error",
				"Critical",
				`Server error ${status} — unhandled exception on the server`,
				"API contract is broken; consumers cannot rely on this endpoint",
				"Fix the server-side error and add proper global exception handling",
				`Investigate server logs for the ${status} root cause`,
			),
		);
	}

	// Rule 4: No client errors
	const clientError = status >= 400 && status < 500;
	rules.push({
		ruleId: "functional/client-error",
		name: "Request completed successfully",
		passed: !clientError,
		severity: clientError ? "High" : undefined,
	});

	if (clientError) {
		issues.push(
			makeIssue(
				reqId,
				"Functional",
				"client-error",
				"High",
				`Client error ${status} returned`,
				"API rejected the request; authentication, payload, or URL may be wrong",
				"Validate that request parameters match the API contract",
			),
		);
	}

	// Rule 5: Tests defined
	const definedTests = input.request.tests?.filter((t) => t.parameter !== "") ?? [];
	rules.push({
		ruleId: "functional/no-tests-defined",
		name: "Test assertions defined",
		passed: definedTests.length > 0,
		severity: definedTests.length === 0 ? "Medium" : undefined,
	});

	if (definedTests.length === 0) {
		issues.push(
			makeIssue(
				reqId,
				"Functional",
				"no-tests-defined",
				"Medium",
				"No test assertions defined for this request",
				"Response correctness is never automatically verified",
				"Add at least a status-code check and a key-field presence assertion",
				"Tests tab → Response Code equal 200 → Response Body contains 'id'",
			),
		);
	}

	// Rule 6: Tests passed
	const failed = r.testResults?.filter((t) => !t.result && t.test !== "") ?? [];
	rules.push({
		ruleId: "functional/failing-tests",
		name: "All test assertions passed",
		passed: failed.length === 0,
		severity: failed.length ? "High" : undefined,
	});

	if (failed.length > 0) {
		issues.push(
			makeIssue(
				reqId,
				"Functional",
				"failing-tests",
				"High",
				`${failed.length} test assertion(s) are currently failing`,
				"API response does not meet the defined contract expectations",
				"Fix the API response or update stale test expectations",
				`Failed: ${failed
					.slice(0, 3)
					.map((t) => t.test)
					.join("; ")}`,
			),
		);
	}

	// Rule 7: Response body exists
	const emptyBody =
		status >= 200 &&
		status < 300 &&
		status !== 204 &&
		status !== 304 &&
		!r.response?.responseData &&
		!["head", "delete"].includes(method);

	rules.push({
		ruleId: "functional/empty-body-2xx",
		name: "Successful response contains body",
		passed: !emptyBody,
		severity: emptyBody ? "Medium" : undefined,
	});

	if (emptyBody) {
		issues.push(
			makeIssue(
				reqId,
				"Functional",
				"empty-body-2xx",
				"Medium",
				"Empty response body on a successful (2xx) response",
				"Clients cannot process an empty response from a data endpoint",
				"Return an appropriate body, or use 204 No Content for intentional empty responses",
			),
		);
	}

	return makeDim("Functional", issues, rules);
}

function checkSecurity(
	input: IQGRequestInput,
	reqId: string,
): IQGDimensionResult {
	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];
	const { request, response: resp } = input;
	const url = request.url;
	const urlLower = url.toLowerCase();
	const isHttp = urlLower.startsWith("http://");
	const method = request.method.toLowerCase();
	const auth = request.auth;
	const responseHeaders = resp?.headers ?? [];
	const urlPath = urlLower.split("?")[0];
	const isGraphQL = /\/graphql\/?$/.test(urlPath);

	// 1. Credentials over plain HTTP
	const isHttpWithAuth = isHttp && auth?.authType && auth.authType !== "none";
	rules.push({
		ruleId: "security/credentials-over-http",
		name: "HTTPS used",
		passed: !isHttpWithAuth,
		severity: isHttpWithAuth ? "Critical" : undefined,
	});

	if (isHttpWithAuth) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"credentials-over-http",
				"Critical",
				"Credentials transmitted over plain HTTP (not HTTPS)",
				"Credentials are exposed to network interception (MITM attack) — OWASP API2",
				"Use HTTPS for all authenticated endpoints",
				"Change the URL scheme from http:// to https://",
			),
		);
	}

	// 2. API key / secret in query parameters
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
	const hasSensitiveParam = request.params?.some(
		(p) => p.key && sensitiveParamNames.includes(p.key.toLowerCase()),
	);

	rules.push({
		ruleId: "security/secret-in-query-param",
		name: "No secrets in query parameters",
		passed: !hasSensitiveParam,
		severity: hasSensitiveParam ? "High" : undefined,
	});

	if (hasSensitiveParam) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"secret-in-query-param",
				"High",
				"API key or secret passed as a query parameter",
				"Credentials are recorded in server access logs, browser history, and referrer headers",
				"Move API keys to the Authorization header or a custom X-Api-Key header",
				"Use: Headers → X-Api-Key: {{apiKey}}",
			),
		);
	}

	// 3. Sensitive keyword in URL path
	const sensitiveUrl = /password|secret|token|credential/.test(urlPath);
	rules.push({
		ruleId: "security/sensitive-keyword-in-path",
		name: "No sensitive data in URL",
		passed: !sensitiveUrl,
		severity: sensitiveUrl ? "Critical" : undefined,
	});

	if (sensitiveUrl) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"sensitive-keyword-in-path",
				"Critical",
				"Sensitive keyword detected in the URL path",
				"Sensitive data is permanently stored in server access logs — OWASP API3",
				"Remove sensitive data from the URL; use the request body or headers instead",
			),
		);
	}

	// 4. Authentication configured for mutating endpoints
	const mutatingMethods = ["post", "put", "patch", "delete"];
	const missingAuth =
		mutatingMethods.includes(method) &&
		!isGraphQL &&
		(!auth?.authType || auth.authType === "none");

	rules.push({
		ruleId: "security/no-auth-mutation",
		name: "Authentication configured",
		passed: !missingAuth,
		severity: missingAuth ? "High" : undefined,
	});

	if (missingAuth) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"no-auth-mutation",
				"High",
				"No authentication on a state-changing endpoint",
				"Unauthenticated writes violate OWASP API2:2023 Broken Authentication",
				"Add Bearer token, API key, or OAuth2 authentication",
				"Use the Auth tab to configure an authentication scheme",
			),
		);
	}

	// 5. Hardcoded bearer token
	const hardcodedToken =
		auth?.authType === "bearertoken" &&
		auth?.password &&
		!auth.password.includes("{{");

	rules.push({
		ruleId: "security/hardcoded-bearer-token",
		name: "Bearer token uses variables",
		passed: !hardcodedToken,
		severity: hardcodedToken ? "High" : undefined,
	});

	if (hardcodedToken) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"hardcoded-bearer-token",
				"High",
				"Bearer token appears hardcoded (not using a {{variable}})",
				"Credentials may be committed to version control or shared configurations",
				"Store credentials in collection variables: {{accessToken}}",
				"Auth tab → Bearer Token → Value: {{accessToken}}",
			),
		);
	}

	// 6. Weak / deprecated auth scheme (Basic Auth)
	const isBasicAuth = auth?.authType === "basic";
	rules.push({
		ruleId: "security/weak-auth-scheme",
		name: "Avoid Basic Authentication",
		passed: !isBasicAuth,
		severity: isBasicAuth ? "Medium" : undefined,
	});

	if (isBasicAuth) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"weak-auth-scheme",
				"Medium",
				"Basic Authentication in use",
				"Basic auth sends credentials base64-encoded (not encrypted) on every single request and has no built-in token expiry or rotation",
				"Prefer OAuth2 or Bearer tokens with expiry for production APIs; reserve Basic auth for internal/dev-only use",
			),
		);
	}

	// 7-9. Missing security response headers
	const secHeaders: Array<{ name: string; ruleId: string; msg: string; impact: string }> = [
		{
			name: "x-content-type-options",
			ruleId: "missing-header-x-content-type-options",
			msg: "Missing X-Content-Type-Options: nosniff response header",
			impact: "Browser MIME-sniffing attacks are possible — OWASP API7",
		},
		{
			name: "x-frame-options",
			ruleId: "missing-header-x-frame-options",
			msg: "Missing X-Frame-Options response header",
			impact: "Clickjacking attacks are possible",
		},
		{
			name: "strict-transport-security",
			ruleId: "missing-header-hsts",
			msg: "Missing Strict-Transport-Security (HSTS) response header",
			impact: "Clients may downgrade to plain HTTP — OWASP API7",
		},
	];

	if (resp) {
		for (const sh of secHeaders) {
			const hasHeader = !!getHeader(responseHeaders, sh.name);
			rules.push({
				ruleId: `security/${sh.ruleId}`,
				name: `Response contains ${sh.name}`,
				passed: hasHeader,
				severity: hasHeader ? undefined : "Medium",
			});

			if (!hasHeader) {
				issues.push(
					makeIssue(
						reqId,
						"Security",
						sh.ruleId,
						"Medium",
						sh.msg,
						sh.impact,
						`Configure the server to always include the ${sh.name} response header`,
					),
				);
			}
		}
	}

	// 10. Stack trace / sensitive data in response body
	const bodyRaw = resp?.response?.responseData;
	const bodyStr =
		typeof bodyRaw === "string" ? bodyRaw : JSON.stringify(bodyRaw ?? "");

	const hasStackTrace = /\tat [\w./\\]+\.(ts|js|java|py|cs):\d+/.test(bodyStr);
	rules.push({
		ruleId: "security/stack-trace-exposed",
		name: "No stack traces in response",
		passed: !hasStackTrace,
		severity: hasStackTrace ? "High" : undefined,
	});

	if (hasStackTrace) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"stack-trace-exposed",
				"High",
				"Stack trace exposed in the response body",
				"Internal implementation details aid attackers — OWASP API3:2023",
				"Catch all exceptions server-side; return generic error messages to clients",
				'Return: { "error": "Internal server error", "code": "ERR_INTERNAL" }',
			),
		);
	}

	// 11. Sensitive data leakage in response body
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

	let matchedPatternLabel: string | undefined;
	for (const p of secretPatterns) {
		if (p.re.test(bodyStr)) {
			matchedPatternLabel = p.label;
			break;
		}
	}

	rules.push({
		ruleId: "security/sensitive-data-leak",
		name: "No sensitive secrets in response body",
		passed: !matchedPatternLabel,
		severity: matchedPatternLabel ? "Critical" : undefined,
	});

	if (matchedPatternLabel) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"sensitive-data-leak",
				"Critical",
				`Potential ${matchedPatternLabel} exposed in the response body`,
				"Leaked credentials/secrets can be exploited immediately by anyone who can read logs or capture traffic — OWASP API3",
				"Never echo secrets/keys back in API responses; scrub logging middleware and response serializers",
			),
		);
	}

	// 12-13. CORS Rules
	const corsOrigin = getHeader(responseHeaders, "access-control-allow-origin");
	const corsCreds = getHeader(
		responseHeaders,
		"access-control-allow-credentials",
	);

	const corsWildcardMutation = corsOrigin === "*" && method !== "get";
	rules.push({
		ruleId: "security/cors-wildcard-mutation",
		name: "No CORS wildcard on mutations",
		passed: !corsWildcardMutation,
		severity: corsWildcardMutation ? "Medium" : undefined,
	});

	if (corsWildcardMutation) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"cors-wildcard-mutation",
				"Medium",
				"CORS wildcard (*) on a non-GET (state-changing) endpoint",
				"Any origin can make credentialed cross-origin requests — OWASP API7",
				"Restrict CORS to known, trusted origins on state-changing endpoints",
			),
		);
	}

	const corsWildcardCredentials = corsOrigin === "*" && corsCreds?.toLowerCase() === "true";
	rules.push({
		ruleId: "security/cors-wildcard-credentials",
		name: "No CORS wildcard with credentials",
		passed: !corsWildcardCredentials,
		severity: corsWildcardCredentials ? "Critical" : undefined,
	});

	if (corsWildcardCredentials) {
		issues.push(
			makeIssue(
				reqId,
				"Security",
				"cors-wildcard-credentials",
				"Critical",
				"CORS wildcard origin combined with Access-Control-Allow-Credentials: true",
				"Most browsers reject this combination, but some HTTP clients and misconfigured proxies do not — a high-risk misconfiguration that can leak credentialed responses to any origin",
				"Never combine a wildcard origin with credentialed CORS; echo back a specific, validated origin instead",
			),
		);
	}

	return makeDim("Security", issues, rules);
}

function checkPerformance(
	input: IQGRequestInput,
	reqId: string,
	thresholds: ResolvedThresholds["performance"],
): IQGDimensionResult {
	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];

	const r = input.response;

	if (!r) {
		return makeDim(
			"Performance",
			issues,
			rules,
		);
	}

	const duration = r.response?.duration ?? 0;

	const sizeStr = String(r.response?.size ?? "0");

	const cleanSizeStr = sizeStr.replace(/,/g, "");

	const sizeMul =
		cleanSizeStr.toUpperCase().includes("MB")
			? 1_048_576
			: cleanSizeStr.toUpperCase().includes("KB")
				? 1024
				: 1;

	const sizeBytes =
		parseFloat(cleanSizeStr) * sizeMul;

	const method =
		input.request.method.toLowerCase();

	const responseHeaders =
		r.headers ?? [];

	// ---------------------------------------------------------------------
	// Response within timeout
	// ---------------------------------------------------------------------

	const timeoutExceeded =
		duration > thresholds.timeoutMs;

	rules.push({
		ruleId: "performance/timeout-exceeded",
		name: "Response within timeout",
		passed: !timeoutExceeded,
		severity: timeoutExceeded ? "Critical" : undefined,
	});

	if (timeoutExceeded) {
		issues.push(
			makeIssue(
				reqId,
				"Performance",
				"timeout-exceeded",
				"Critical",
				`Response time ${duration}ms exceeds the ${thresholds.timeoutMs}ms timeout threshold`,
				"User-facing timeout; likely SLA breach",
				"Profile database queries and N+1 patterns; add a caching layer",
				"Target < 200 ms for read APIs, < 500 ms for write APIs",
			),
		);
	}

	// ---------------------------------------------------------------------
	// Response time acceptable
	// ---------------------------------------------------------------------

	const slowResponse =
		duration > thresholds.slowMs;

	rules.push({
		ruleId: "performance/slow-response",
		name: "Response time acceptable",
		passed: !slowResponse,
		severity:
			duration > thresholds.verySlowMs
				? "High"
				: slowResponse
					? "Medium"
					: undefined,
	});

	if (
		duration > thresholds.verySlowMs &&
		!timeoutExceeded
	) {
		issues.push(
			makeIssue(
				reqId,
				"Performance",
				"slow-response",
				"High",
				`Response time ${duration}ms exceeds ${thresholds.verySlowMs}ms`,
				"Poor user experience; potential timeout on slow connections",
				"Add database indexes, use caching (Redis / CDN), paginate large datasets",
			),
		);
	}
	else if (
		duration > thresholds.slowMs &&
		duration <= thresholds.verySlowMs
	) {
		issues.push(
			makeIssue(
				reqId,
				"Performance",
				"moderate-response",
				"Medium",
				`Response time ${duration}ms exceeds ${thresholds.slowMs}ms`,
				"Suboptimal for interactive use",
				"Review query complexity and reduce payload size",
			),
		);
	}

	// ---------------------------------------------------------------------
	// Payload size optimized
	// ---------------------------------------------------------------------

	const payloadLarge =
		sizeBytes > thresholds.payloadWarnBytes;

	rules.push({
		ruleId: "performance/payload-size",
		name: "Payload size optimized",
		passed: !payloadLarge,
		severity:
			sizeBytes > thresholds.payloadFailBytes
				? "High"
				: payloadLarge
					? "Medium"
					: undefined,
	});

	if (
		sizeBytes > thresholds.payloadFailBytes
	) {
		issues.push(
			makeIssue(
				reqId,
				"Performance",
				"payload-too-large",
				"High",
				`Payload size ${sizeStr} exceeds ${Math.round(
					thresholds.payloadFailBytes / 1_048_576,
				)}MB`,
				"Excessive bandwidth consumption; poor mobile experience",
				"Implement pagination, sparse fieldsets, or response compression",
				"Add ?limit=20&offset=0 or use GraphQL field selection",
			),
		);
	}
	else if (
		sizeBytes > thresholds.payloadWarnBytes
	) {
		issues.push(
			makeIssue(
				reqId,
				"Performance",
				"payload-large",
				"Medium",
				`Payload size ${sizeStr} exceeds ${Math.round(
					thresholds.payloadWarnBytes / 1024,
				)}KB`,
				"Unnecessary data transfer; consider pagination or filtering",
				"Add pagination parameters or implement field-level filtering",
			),
		);
	}

	// ---------------------------------------------------------------------
	// GET-only rules
	// ---------------------------------------------------------------------

	if (method === "get") {

		// Cache-Control

		const hasCacheControl =
			!!getHeader(
				responseHeaders,
				"cache-control",
			);

		rules.push({
			ruleId: "performance/no-cache-control",
			name: "Cache-Control configured",
			passed: hasCacheControl,
			severity:
				hasCacheControl
					? undefined
					: "Medium",
		});

		if (!hasCacheControl) {
			issues.push(
				makeIssue(
					reqId,
					"Performance",
					"no-cache-control",
					"Medium",
					"No Cache-Control header on GET response",
					"Every client re-fetches data; cacheable responses miss CDN / browser caching",
					"Add Cache-Control: max-age=60 (or appropriate TTL) for cacheable GET endpoints",
				),
			);
		}

		// -------------------------------------------------------------

		// ETag

		const hasETag =
			!!getHeader(responseHeaders, "etag") ||
			!!getHeader(responseHeaders, "last-modified");

		rules.push({
			ruleId: "performance/no-etag",
			name: "Conditional caching enabled",
			passed: hasETag,
			severity:
				hasETag
					? undefined
					: "Low",
		});

		if (!hasETag) {
			issues.push(
				makeIssue(
					reqId,
					"Performance",
					"no-etag",
					"Low",
					"No ETag or Last-Modified header on GET response",
					"Clients cannot use conditional requests (304 Not Modified)",
					"Add ETag or Last-Modified to enable conditional GET caching",
				),
			);
		}

		// -------------------------------------------------------------

		// Compression

		const compressionRequired =
			sizeBytes >
			thresholds.compressionThresholdBytes;

		const hasCompression =
			!!getHeader(
				responseHeaders,
				"content-encoding",
			);

		rules.push({
			ruleId: "performance/no-compression",
			name: "Response compression enabled",
			passed:
				!compressionRequired ||
				hasCompression,
			severity:
				compressionRequired &&
					!hasCompression
					? "Medium"
					: undefined,
		});

		if (
			compressionRequired &&
			!hasCompression
		) {
			issues.push(
				makeIssue(
					reqId,
					"Performance",
					"no-compression",
					"Medium",
					`Response body (${sizeStr}) is not compressed`,
					"Uncompressed payloads waste bandwidth and slow down clients on slower networks",
					"Enable gzip or Brotli compression (Content-Encoding: gzip or br) on the server",
				),
			);
		}
	}

	// ---------------------------------------------------------------------
	// Pagination
	// ---------------------------------------------------------------------

	const urlLower =
		input.request.url.toLowerCase();

	const listKeywords = [
		"/list",
		"/all",
		"/items",
		"/results",
		"/search",
	];

	const hasListKeyword =
		listKeywords.some(k => urlLower.includes(k));

	const paginationParamNames = [
		"page",
		"limit",
		"offset",
		"size",
		"per_page",
		"pagesize",
		"cursor",
	];

	const hasPaginationParam =
		input.request.params?.some(
			p =>
				p.key &&
				paginationParamNames.includes(
					p.key.toLowerCase(),
				),
		);

	const paginationRequired =
		hasListKeyword;

	rules.push({
		ruleId: "performance/missing-pagination",
		name: "Pagination implemented",
		passed:
			!paginationRequired ||
			!!hasPaginationParam,
		severity:
			paginationRequired &&
				!hasPaginationParam
				? "Medium"
				: undefined,
	});

	if (
		paginationRequired &&
		!hasPaginationParam
	) {
		issues.push(
			makeIssue(
				reqId,
				"Performance",
				"missing-pagination",
				"Medium",
				"List endpoint detected without pagination parameters",
				"Unbounded queries may return millions of rows causing OOM or timeout",
				"Add pagination: ?page=1&limit=20, or use cursor-based pagination",
			),
		);
	}

	return makeDim(
		"Performance",
		issues,
		rules,
	);
}

function checkDesign(
	input: IQGRequestInput,
	reqId: string,
): IQGDimensionResult {
	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];

	const { request, response: resp } = input;

	const url = request.url;
	const urlLower = url.toLowerCase();
	const method = request.method.toLowerCase();
	const pathOnly = url.split("?")[0];
	const isGraphQL = /\/graphql\/?$/.test(pathOnly.toLowerCase());

	// -------------------------------------------------------------------------
	// Lowercase URL path
	// -------------------------------------------------------------------------

	const hasUppercase = pathOnly !== pathOnly.toLowerCase();

	rules.push({
		ruleId: "design/uppercase-path",
		name: "Lowercase URL path",
		passed: !hasUppercase,
		severity: hasUppercase ? "Medium" : undefined,
	});

	if (hasUppercase) {
		issues.push(
			makeIssue(
				reqId,
				"Design",
				"uppercase-path",
				"Medium",
				"URL path contains uppercase letters",
				"Inconsistent URLs; some servers treat them as different resources",
				"Use lowercase paths: /api/users not /api/Users",
				`Suggested: ${pathOnly.toLowerCase()}`,
			),
		);
	}

	// -------------------------------------------------------------------------
	// No underscore in path
	// -------------------------------------------------------------------------

	const hasUnderscore =
		/\/[^/?#]*_[^/?#]*/.test(pathOnly);

	rules.push({
		ruleId: "design/underscore-path",
		name: "Use hyphens instead of underscores",
		passed: !hasUnderscore,
		severity: hasUnderscore ? "Low" : undefined,
	});

	if (hasUnderscore) {
		issues.push(
			makeIssue(
				reqId,
				"Design",
				"underscore-path",
				"Low",
				"Underscores used in URL path segments",
				"REST convention prefers hyphens over underscores for readability",
				"Use hyphens: /user-profiles not /user_profiles",
			),
		);
	}

	// -------------------------------------------------------------------------
	// API Version
	// -------------------------------------------------------------------------

	const hasVersion =
		/\/v\d+\//.test(urlLower) ||
		request.headers?.some(
			h => h.key?.toLowerCase() === "api-version",
		);

	rules.push({
		ruleId: "design/no-api-version",
		name: "API versioning implemented",
		passed: !!hasVersion,
		severity: hasVersion ? undefined : "Medium",
	});

	if (!hasVersion) {
		issues.push(
			makeIssue(
				reqId,
				"Design",
				"no-api-version",
				"Medium",
				"No API versioning detected in URL path or headers",
				"Breaking changes will affect all existing consumers simultaneously",
				"Add a version to the URL path (/api/v1/) or use an Api-Version header",
			),
		);
	}

	// -------------------------------------------------------------------------
	// GET Body
	// -------------------------------------------------------------------------

	if (method === "get") {

		const hasBody =
			request.body?.raw?.data ||
			request.body?.formdata?.some(f => f.key) ||
			request.body?.urlencoded?.some(f => f.key);

		rules.push({
			ruleId: "design/get-with-body",
			name: "GET request has no body",
			passed: !hasBody,
			severity: hasBody ? "High" : undefined,
		});

		if (hasBody) {
			issues.push(
				makeIssue(
					reqId,
					"Design",
					"get-with-body",
					"High",
					"GET request has a request body",
					"GET semantics prohibit side-effectful bodies; many proxies and CDNs strip them",
					"Use POST for operations that require a body, or move data to query parameters",
				),
			);
		}
	}

	// -------------------------------------------------------------------------
	// GET mutation
	// -------------------------------------------------------------------------

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
		method === "get" &&
		mutationKeywords.some(k => urlLower.includes(k));

	rules.push({
		ruleId: "design/mutation-verb-in-get",
		name: "GET endpoint is read-only",
		passed: !mutationGet,
		severity: mutationGet ? "High" : undefined,
	});

	if (mutationGet) {
		issues.push(
			makeIssue(
				reqId,
				"Design",
				"mutation-verb-in-get",
				"High",
				"State-changing keyword detected in a GET endpoint",
				"GET must be safe and idempotent",
				"Use POST / PUT / PATCH / DELETE for state-changing operations",
			),
		);
	}

	// -------------------------------------------------------------------------
	// Resource naming
	// -------------------------------------------------------------------------

	const verbPath =
		/\/(get|create|update|delete|remove|fetch|list|find)[A-Z]/.test(pathOnly);

	rules.push({
		ruleId: "design/verb-in-path",
		name: "Resource-oriented URL naming",
		passed: !verbPath,
		severity: verbPath ? "Medium" : undefined,
	});

	if (verbPath) {
		issues.push(
			makeIssue(
				reqId,
				"Design",
				"verb-in-path",
				"Medium",
				"URL path uses a verb-style segment instead of a resource noun",
				"Non-RESTful naming",
				"Use resource-oriented nouns",
			),
		);
	}

	// -------------------------------------------------------------------------
	// Technology extension
	// -------------------------------------------------------------------------

	const techExtension =
		/\.(php|asp|aspx|jsp|cfm)/.test(urlLower);

	rules.push({
		ruleId: "design/tech-specific-extension",
		name: "Clean resource URLs",
		passed: !techExtension,
		severity: techExtension ? "Medium" : undefined,
	});

	if (techExtension) {
		issues.push(
			makeIssue(
				reqId,
				"Design",
				"tech-specific-extension",
				"Medium",
				"Technology-specific file extension in URL",
				"Exposes server technology",
				"Use clean URLs without file extensions",
			),
		);
	}

	// -------------------------------------------------------------------------
	// DELETE id
	// -------------------------------------------------------------------------

	if (method === "delete") {

		const hasIdentifier =
			/{[^}]+}/.test(pathOnly) ||
			/\/\d+$/.test(pathOnly) ||
			/\/[\w-]{20,}$/.test(pathOnly);

		rules.push({
			ruleId: "design/delete-missing-id",
			name: "DELETE targets a specific resource",
			passed: hasIdentifier,
			severity: hasIdentifier ? undefined : "Medium",
		});

		if (!hasIdentifier) {
			issues.push(
				makeIssue(
					reqId,
					"Design",
					"delete-missing-id",
					"Medium",
					"DELETE endpoint appears to be missing a resource identifier",
					"Mass-delete without an identifier is dangerous",
					"Ensure DELETE targets a specific resource",
				),
			);
		}
	}

	// -------------------------------------------------------------------------
	// JSON Content-Type
	// -------------------------------------------------------------------------

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

	if (looksLikeJson) {

		const contentType =
			getHeader(request.headers ?? [], "content-type");

		const validContentType =
			!!contentType &&
			contentType.toLowerCase().includes("json");

		rules.push({
			ruleId: "design/inconsistent-content-type",
			name: "JSON request declares Content-Type",
			passed: validContentType,
			severity: validContentType ? undefined : "Medium",
		});

		if (!validContentType) {
			issues.push(
				makeIssue(
					reqId,
					"Design",
					"inconsistent-content-type",
					"Medium",
					"JSON body without Content-Type",
					"Frameworks may not parse the payload correctly",
					"Add Content-Type: application/json",
				),
			);
		}
	}

	// -------------------------------------------------------------------------
	// Standard Error Response
	// -------------------------------------------------------------------------

	const status = resp?.response?.status ?? 0;

	if (status >= 400 && !isGraphQL) {

		const responseHeaders = resp?.headers ?? [];

		const contentType =
			(
				getHeader(responseHeaders, "content-type") ??
				""
			).toLowerCase();

		const isProblemJson =
			contentType.includes("application/problem+json");

		const body =
			safeParseJson(resp?.response?.responseData);

		const hasStandardShape =
			isProblemJson ||
			("code" in body && "message" in body);

		rules.push({
			ruleId: "design/non-standard-error-shape",
			name: "Standard error response format",
			passed: hasStandardShape,
			severity: hasStandardShape ? undefined : "Low",
		});

		if (!hasStandardShape) {
			issues.push(
				makeIssue(
					reqId,
					"Design",
					"non-standard-error-shape",
					"Low",
					"Error response does not follow a consistent schema",
					"Clients must special-case error parsing",
					"Adopt RFC7807 or { code, message }",
				),
			);
		}
	}

	return makeDim(
		"Design",
		issues,
		rules,
	);
}

function checkObservability(
	input: IQGRequestInput,
	reqId: string,
): IQGDimensionResult {

	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];

	const response = input.response;

	if (!response) {
		return makeDim("Observability", issues, rules);
	}

	const headers = response.headers ?? [];
	const status = response.response?.status ?? 0;

	const json = safeParseJson(
		response.response?.responseData,
	);

	// -------------------------------------------------------------
	// Correlation ID
	// -------------------------------------------------------------

	const correlationHeaders = [
		"x-request-id",
		"x-correlation-id",
		"traceparent",
		"request-id",
	];

	const hasCorrelation =
		correlationHeaders.some(
			h => !!getHeader(headers, h),
		);

	rules.push({
		ruleId: "observability/correlation-id",
		name: "Correlation ID returned",
		passed: hasCorrelation,
		severity: hasCorrelation ? undefined : "Medium",
	});

	if (!hasCorrelation) {
		issues.push(
			makeIssue(
				reqId,
				"Observability",
				"correlation-id",
				"Medium",
				"Response does not include a Correlation ID",
				"Troubleshooting distributed requests becomes difficult",
				"Return X-Request-ID or Traceparent header",
			),
		);
	}

	// -------------------------------------------------------------
	// Content-Type
	// -------------------------------------------------------------

	const contentType =
		getHeader(headers, "content-type");

	const validContentType =
		!!contentType;

	rules.push({
		ruleId: "observability/content-type",
		name: "Content-Type header returned",
		passed: validContentType,
		severity: validContentType ? undefined : "Medium",
	});

	if (!validContentType) {
		issues.push(
			makeIssue(
				reqId,
				"Observability",
				"content-type",
				"Medium",
				"Response missing Content-Type header",
				"Clients cannot reliably determine payload format",
				"Always return Content-Type",
			),
		);
	}

	// -------------------------------------------------------------
	// Error message
	// -------------------------------------------------------------

	if (status >= 400) {

		const hasMessage =
			typeof json.message === "string" ||
			typeof json.error === "string" ||
			typeof json.title === "string";

		rules.push({
			ruleId: "observability/error-message",
			name: "Error response includes message",
			passed: hasMessage,
			severity: hasMessage ? undefined : "Low",
		});

		if (!hasMessage) {
			issues.push(
				makeIssue(
					reqId,
					"Observability",
					"error-message",
					"Low",
					"Error response missing descriptive message",
					"Developers cannot determine failure reason",
					"Return message or title in error response",
				),
			);
		}

		// ---------------------------------------------------------
		// Error code
		// ---------------------------------------------------------

		const hasCode =
			json.code !== undefined ||
			json.errorCode !== undefined;

		rules.push({
			ruleId: "observability/error-code",
			name: "Error response includes code",
			passed: hasCode,
			severity: hasCode ? undefined : "Low",
		});

		if (!hasCode) {
			issues.push(
				makeIssue(
					reqId,
					"Observability",
					"error-code",
					"Low",
					"Error response missing application error code",
					"Clients cannot distinguish failures programmatically",
					"Return stable application error codes",
				),
			);
		}
	}

	return makeDim(
		"Observability",
		issues,
		rules,
	);
}

function checkTestCoverage(
	input: IQGRequestInput,
	reqId: string,
): IQGDimensionResult {

	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];
	const tests = input.request.tests?.filter((t) => t.parameter !== "") ?? [];

	const failedTests = input.response?.testResults?.filter((t) => !t.result && t.test !== "") ?? [];

	// -------------------------------------------------------------
	// Tests defined
	// -------------------------------------------------------------

	const hasTests = tests.length > 0;

	rules.push({
		ruleId: "tests/tests-defined",
		name: "Tests defined",
		passed: hasTests,
		severity: hasTests ? undefined : "High",
	});

	if (!hasTests) {
		issues.push(
			makeIssue(
				reqId,
				"TestCoverage",
				"tests-defined",
				"High",
				"No test assertions defined",
				"Request behavior is never validated",
				"Add response validation tests",
			),
		);
	}

	// -------------------------------------------------------------
	// Status test
	// -------------------------------------------------------------

	const hasStatusTest = tests.some((t) => t.parameter === "Response Code");

	rules.push({
		ruleId: "tests/status-test",
		name: "Status code assertion",
		passed: hasStatusTest,
		severity: hasStatusTest ? undefined : "Medium",
	});

	if (!hasStatusTest) {
		issues.push(
			makeIssue(
				reqId,
				"TestCoverage",
				"status-test",
				"Medium",
				"No status code assertion",
				"Unexpected HTTP status may go unnoticed",
				"Assert expected response status",
			),
		);
	}

	// -------------------------------------------------------------
	// Body test
	// -------------------------------------------------------------

	const bodyParams = ["Response Body", "Response JSON Body"];
	const hasBodyTest = tests.some(
		(t) => bodyParams.includes(t.parameter) || t.customParameter,
	);

	rules.push({
		ruleId: "tests/body-test",
		name: "Response body assertion",
		passed: hasBodyTest,
		severity: hasBodyTest ? undefined : "Medium",
	});

	if (!hasBodyTest) {
		issues.push(
			makeIssue(
				reqId,
				"TestCoverage",
				"body-test",
				"Medium",
				"No response body validation",
				"Incorrect payloads may pass unnoticed",
				"Validate important response fields",
			),
		);
	}

	// -------------------------------------------------------------
	// Response time test
	// -------------------------------------------------------------

	const hasTimeTest = tests.some((t) => t.parameter === "Response Time");

	rules.push({
		ruleId: "tests/response-time",
		name: "Response time assertion",
		passed: hasTimeTest,
		severity: hasTimeTest ? undefined : "Low",
	});

	if (!hasTimeTest) {
		issues.push(
			makeIssue(
				reqId,
				"TestCoverage",
				"response-time",
				"Low",
				"No response time validation",
				"Performance regressions won't be detected",
				"Assert maximum response duration",
			),
		);
	}

	// -------------------------------------------------------------
	// Header test
	// -------------------------------------------------------------

	const hasHeaderTest = tests.some((t) => t.parameter === "Response Header");

	rules.push({
		ruleId: "tests/header-test",
		name: "Response header assertion",
		passed: hasHeaderTest,
		severity: hasHeaderTest ? undefined : "Low",
	});

	if (!hasHeaderTest) {
		issues.push(
			makeIssue(
				reqId,
				"TestCoverage",
				"header-test",
				"Low",
				"No response header validation",
				"Security or caching headers may regress unnoticed",
				"Validate important response headers",
			),
		);
	}

	// -------------------------------------------------------------
	// Existing tests pass
	// -------------------------------------------------------------

	rules.push({
		ruleId: "tests/tests-pass",
		name: "All tests passed",
		passed: failedTests.length === 0,
		severity:
			failedTests.length
				? "Critical"
				: undefined,
	});

	if (failedTests.length) {
		issues.push(
			makeIssue(
				reqId,
				"TestCoverage",
				"tests-pass",
				"Critical",
				`${failedTests.length} test(s) failed`,
				"API validation failed",
				"Fix failing assertions",
			),
		);
	}

	return makeDim(
		"TestCoverage",
		issues,
		rules,
	);
}

function checkMaintainability(
	input: IQGRequestInput,
	reqId: string,
): IQGDimensionResult {

	const issues: IQualityGateIssue[] = [];
	const rules: IQGRuleResult[] = [];

	const request = input.request;

	// -------------------------------------------------------------
	// Request Name
	// -------------------------------------------------------------

	const hasName =
		!!request.name?.trim();

	rules.push({
		ruleId: "maintainability/request-name",
		name: "Request has a meaningful name",
		passed: hasName,
		severity: hasName ? undefined : "Medium",
	});

	if (!hasName) {
		issues.push(
			makeIssue(
				reqId,
				"Maintainability",
				"request-name",
				"Medium",
				"Request name is empty",
				"Unnamed requests are difficult to identify in large collections",
				"Give every request a meaningful name",
			),
		);
	}

	// -------------------------------------------------------------
	// Notes / Description
	// -------------------------------------------------------------

	const hasNotes = !!request.notes?.trim();

	rules.push({
		ruleId: "maintainability/request-notes",
		name: "Request contains documentation",
		passed: hasNotes,
		severity: hasNotes ? undefined : "Low",
	});

	if (!hasNotes) {
		issues.push(
			makeIssue(
				reqId,
				"Maintainability",
				"request-notes",
				"Low",
				"Request has no documentation",
				"Future developers may not understand the purpose of this request",
				"Add request notes or description",
			),
		);
	}

	// -------------------------------------------------------------
	// Environment Variable URL
	// -------------------------------------------------------------

	const usesVariableUrl =
		/{{.+?}}/.test(request.url);

	rules.push({
		ruleId: "maintainability/url-variable",
		name: "URL uses environment variables",
		passed: usesVariableUrl,
		severity: usesVariableUrl ? undefined : "Medium",
	});

	if (!usesVariableUrl) {
		issues.push(
			makeIssue(
				reqId,
				"Maintainability",
				"url-variable",
				"Medium",
				"Request URL contains hardcoded values",
				"Changing environments requires editing every request",
				"Use variables such as {{baseUrl}}",
			),
		);
	}

	// -------------------------------------------------------------
	// Token Variable
	// -------------------------------------------------------------

	let tokenUsesVariable = true;

	const auth = request.auth;

	if (
		auth?.authType === "bearertoken" &&
		auth.password
	) {
		tokenUsesVariable =
			auth.password.includes("{{");
	}

	rules.push({
		ruleId: "maintainability/token-variable",
		name: "Authentication uses variables",
		passed: tokenUsesVariable,
		severity:
			tokenUsesVariable
				? undefined
				: "High",
	});

	if (!tokenUsesVariable) {
		issues.push(
			makeIssue(
				reqId,
				"Maintainability",
				"token-variable",
				"High",
				"Bearer token is hardcoded",
				"Tokens expire and cannot easily be shared between environments",
				"Store tokens in variables such as {{accessToken}}",
			),
		);
	}

	// -------------------------------------------------------------
	// Empty Headers
	// -------------------------------------------------------------

	const emptyHeaders =
		request.headers?.filter(
			h =>
				h.isChecked !== false &&
				(
					!h.key?.trim() ||
					!h.value?.trim()
				),
		) ?? [];

	rules.push({
		ruleId: "maintainability/empty-headers",
		name: "No empty headers",
		passed: emptyHeaders.length === 0,
		severity:
			emptyHeaders.length
				? "Low"
				: undefined,
	});

	if (emptyHeaders.length) {
		issues.push(
			makeIssue(
				reqId,
				"Maintainability",
				"empty-headers",
				"Low",
				`${emptyHeaders.length} empty header(s) found`,
				"Unused headers increase maintenance effort",
				"Remove empty or unused headers",
			),
		);
	}

	return makeDim(
		"Maintainability",
		issues,
		rules,
	);
}

// ─── CI/CD gate status (independent of PASS/CONDITIONAL_PASS/FAIL verdict) ───

function computeGateStatus(
	results: IQualityGateResult[],
	aggregateScore: number,
	config: IQGConfig,
	scoringThresholds: ResolvedThresholds["scoring"],
): IQGGateStatus {
	const reasons: string[] = [];

	const totalCritical = results.reduce((s, r) => s + r.summary.critical, 0);
	const totalHigh = results.reduce((s, r) => s + r.summary.high, 0);

	const maxCritical = config.failOn?.critical ?? 0;
	const maxHigh = config.failOn?.high;
	const minScore = config.failOn?.minScore ?? scoringThresholds.conditionalScore;

	if (totalCritical > maxCritical) {
		reasons.push(
			`${totalCritical} critical issue(s) found (max allowed: ${maxCritical})`,
		);
	}
	if (maxHigh !== undefined && totalHigh > maxHigh) {
		reasons.push(
			`${totalHigh} high-severity issue(s) found (max allowed: ${maxHigh})`,
		);
	}
	if (aggregateScore < minScore) {
		reasons.push(
			`Aggregate score ${aggregateScore} is below the minimum required ${minScore}`,
		);
	}

	const passed = reasons.length === 0;
	return { passed, exitCode: passed ? 0 : 1, reasons };
}

// ─── Main entry points ────────────────────────────────────────────────────────

export function runQualityGate(
	input: IQGRequestInput,
	config: IQGConfig = {},
): IQualityGateResult {
	// Reset per-run counter so IDs are deterministic within a single gate run.
	_idCounter = 0;

	const reqId = input.request.id;
	const thresholds = resolveThresholds(config);
	const weights = resolveWeights(config);

	console.log({
		request: input.request.name,
		hasResponse: !!input.response,
	});
	console.log(input.response);

	const rawDimensions = [
		checkFunctional(input, reqId),
		checkSecurity(input, reqId),
		checkPerformance(input, reqId, thresholds.performance),
		checkDesign(input, reqId),
		checkObservability(input, reqId),
		checkTestCoverage(input, reqId),
		checkMaintainability(input, reqId),
	];

	const disabled = new Set<string>([
		...(config.disabledRules ?? []).map((r) => r.toLowerCase()),
		...parseInlineDisabledRules(input.request.notes),
	]);
	const { dims: dimensions, suppressed } = applySuppression(
		rawDimensions,
		disabled,
	);

	const overallScore = Math.round(
		dimensions.reduce((acc, d) => acc + d.score * (weights[d.dimension] ?? 0), 0),
	);

	const allIssues = dimensions.flatMap((d) => d.issues);
	const summary = {
		critical: allIssues.filter((i) => i.severity === "Critical").length,
		high: allIssues.filter((i) => i.severity === "High").length,
		medium: allIssues.filter((i) => i.severity === "Medium").length,
		low: allIssues.filter((i) => i.severity === "Low").length,
		total: allIssues.length,
	};

	const verdict: QGVerdict =
		summary.critical > 0 || overallScore < thresholds.scoring.conditionalScore
			? "FAIL"
			: overallScore < thresholds.scoring.passScore
				? "CONDITIONAL_PASS"
				: "PASS";

	return {
		requestId: reqId,
		requestName: input.request.name,
		method: input.request.method.toUpperCase(),
		url: input.request.url,
		timestamp: new Date().toISOString(),
		dimensions,
		overallScore,
		verdict,
		summary,
		suppressedIssues: suppressed.length ? suppressed : undefined,
	};
}

export function runQualityGateForCollection(
	name: string,
	inputs: IQGRequestInput[],
	config: IQGConfig = {},
): IQGReport {
	const thresholds = resolveThresholds(config);
	const results = inputs.map((i) => runQualityGate(i, config));

	const aggregateScore = results.length
		? Math.round(
			results.reduce((s, r) => s + r.overallScore, 0) / results.length,
		)
		: 0;
	const hasCritical = results.some((r) => r.summary.critical > 0);
	const aggregateVerdict: QGVerdict =
		hasCritical || aggregateScore < thresholds.scoring.conditionalScore
			? "FAIL"
			: aggregateScore < thresholds.scoring.passScore
				? "CONDITIONAL_PASS"
				: "PASS";

	const gateStatus = computeGateStatus(
		results,
		aggregateScore,
		config,
		thresholds.scoring,
	);

	return {
		name,
		runAt: new Date().toISOString(),
		results,
		aggregateScore,
		aggregateVerdict,
		config,
		gateStatus,
	};
}
