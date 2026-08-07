import { QGSeverity } from "../../../types/qualityGate.types";
import { IQGRuleDefinition, IQGRuleIssueDetail } from "../qgEngineTypes";
import { getHeader, parseSizeBytes } from "../qgHelpers";

// ─── Performance rules ────────────────────────────────────────────────────────
// All rules here require a recorded response (matching the original early
// return behaviour of checkPerformance()).
export const performanceRules: IQGRuleDefinition[] = [
	{
		id: "timeout-exceeded",
		dimension: "Performance",
		name: "Response within timeout",
		description:
			"Fails when the response duration exceeds the configured timeout threshold.",
		defaultSeverity: "Critical",
		evaluate: ({ input, thresholds }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const duration = r.response?.duration ?? 0;
			const timeoutExceeded = duration > thresholds.performance.timeoutMs;
			return {
				applicable: true,
				passed: !timeoutExceeded,
				severity: timeoutExceeded ? "Critical" : undefined,
				issue: timeoutExceeded
					? {
							description: `Response time ${duration}ms exceeds the ${thresholds.performance.timeoutMs}ms timeout threshold`,
							impact: "User-facing timeout; likely SLA breach",
							recommendation:
								"Profile database queries and N+1 patterns; add a caching layer",
							suggestedFix:
								"Target < 200 ms for read APIs, < 500 ms for write APIs",
						}
					: undefined,
			};
		},
	},
	{
		id: "slow-response",
		dimension: "Performance",
		name: "Response time acceptable",
		description:
			"Fails/warns when the response duration exceeds moderate/slow thresholds.",
		defaultSeverity: "Medium",
		evaluate: ({ input, thresholds }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const duration = r.response?.duration ?? 0;
			const { slowMs, verySlowMs, timeoutMs } = thresholds.performance;
			const timeoutExceeded = duration > timeoutMs;
			const slowResponse = duration > slowMs;
			const severity: QGSeverity | undefined =
				duration > verySlowMs ? "High" : slowResponse ? "Medium" : undefined;

			let issue: IQGRuleIssueDetail | undefined;
			if (duration > verySlowMs && !timeoutExceeded) {
				issue = {
					description: `Response time ${duration}ms exceeds ${verySlowMs}ms`,
					impact: "Poor user experience; potential timeout on slow connections",
					recommendation:
						"Add database indexes, use caching (Redis / CDN), paginate large datasets",
				};
			} else if (duration > slowMs && duration <= verySlowMs) {
				issue = {
					description: `Response time ${duration}ms exceeds ${slowMs}ms`,
					impact: "Suboptimal for interactive use",
					recommendation: "Review query complexity and reduce payload size",
				};
			}

			return { applicable: true, passed: !slowResponse, severity, issue };
		},
	},
	{
		id: "payload-size",
		dimension: "Performance",
		name: "Payload size optimized",
		description:
			"Fails/warns when the response payload exceeds warn/fail size thresholds.",
		defaultSeverity: "Medium",
		evaluate: ({ input, thresholds }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const sizeStr = String(r.response?.size ?? "0");
			const sizeBytes = parseSizeBytes(sizeStr);
			const { payloadWarnBytes, payloadFailBytes } = thresholds.performance;
			const payloadLarge = sizeBytes > payloadWarnBytes;
			const severity: QGSeverity | undefined =
				sizeBytes > payloadFailBytes
					? "High"
					: payloadLarge
						? "Medium"
						: undefined;

			let issue: IQGRuleIssueDetail | undefined;
			if (sizeBytes > payloadFailBytes) {
				issue = {
					description: `Payload size ${sizeStr} exceeds ${Math.round(
						payloadFailBytes / 1_048_576,
					)}MB`,
					impact: "Excessive bandwidth consumption; poor mobile experience",
					recommendation:
						"Implement pagination, sparse fieldsets, or response compression",
					suggestedFix: "Add ?limit=20&offset=0 or use GraphQL field selection",
				};
			} else if (sizeBytes > payloadWarnBytes) {
				issue = {
					description: `Payload size ${sizeStr} exceeds ${Math.round(
						payloadWarnBytes / 1024,
					)}KB`,
					impact: "Unnecessary data transfer; consider pagination or filtering",
					recommendation:
						"Add pagination parameters or implement field-level filtering",
				};
			}

			return { applicable: true, passed: !payloadLarge, severity, issue };
		},
	},
	{
		id: "no-cache-control",
		dimension: "Performance",
		name: "Cache-Control configured",
		description: "GET responses should include a Cache-Control header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const r = input.response;
			if (!r || input.request.method.toLowerCase() !== "get") {
				return { applicable: false };
			}
			const hasCacheControl = !!getHeader(r.headers ?? [], "cache-control");
			return {
				applicable: true,
				passed: hasCacheControl,
				severity: hasCacheControl ? undefined : "Medium",
				issue: hasCacheControl
					? undefined
					: {
							description: "No Cache-Control header on GET response",
							impact:
								"Every client re-fetches data; cacheable responses miss CDN / browser caching",
							recommendation:
								"Add Cache-Control: max-age=60 (or appropriate TTL) for cacheable GET endpoints",
						},
			};
		},
	},
	{
		id: "no-etag",
		dimension: "Performance",
		name: "Conditional caching enabled",
		description:
			"GET responses should include an ETag or Last-Modified header.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const r = input.response;
			if (!r || input.request.method.toLowerCase() !== "get") {
				return { applicable: false };
			}
			const headers = r.headers ?? [];
			const hasETag =
				!!getHeader(headers, "etag") || !!getHeader(headers, "last-modified");
			return {
				applicable: true,
				passed: hasETag,
				severity: hasETag ? undefined : "Low",
				issue: hasETag
					? undefined
					: {
							description: "No ETag or Last-Modified header on GET response",
							impact:
								"Clients cannot use conditional requests (304 Not Modified)",
							recommendation:
								"Add ETag or Last-Modified to enable conditional GET caching",
						},
			};
		},
	},
	{
		id: "no-compression",
		dimension: "Performance",
		name: "Response compression enabled",
		description: "Large GET responses should be compressed (Content-Encoding).",
		defaultSeverity: "Medium",
		evaluate: ({ input, thresholds }) => {
			const r = input.response;
			if (!r || input.request.method.toLowerCase() !== "get") {
				return { applicable: false };
			}
			const sizeStr = String(r.response?.size ?? "0");
			const sizeBytes = parseSizeBytes(sizeStr);
			const compressionRequired =
				sizeBytes > thresholds.performance.compressionThresholdBytes;
			const hasCompression = !!getHeader(r.headers ?? [], "content-encoding");
			const passed = !compressionRequired || hasCompression;
			return {
				applicable: true,
				passed,
				severity: compressionRequired && !hasCompression ? "Medium" : undefined,
				issue:
					compressionRequired && !hasCompression
						? {
								description: `Response body (${sizeStr}) is not compressed`,
								impact:
									"Uncompressed payloads waste bandwidth and slow down clients on slower networks",
								recommendation:
									"Enable gzip or Brotli compression (Content-Encoding: gzip or br) on the server",
							}
						: undefined,
			};
		},
	},
	{
		id: "missing-pagination",
		dimension: "Performance",
		name: "Pagination implemented",
		description:
			"List-style endpoints (/list, /all, /items, /results, /search) should support pagination parameters.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			if (!input.response) {
				return { applicable: false };
			}
			const urlLower = input.request.url.toLowerCase();
			const listKeywords = ["/list", "/all", "/items", "/results", "/search"];
			const hasListKeyword = listKeywords.some((k) => urlLower.includes(k));
			const paginationParamNames = [
				"page",
				"limit",
				"offset",
				"size",
				"per_page",
				"pagesize",
				"cursor",
			];
			const hasPaginationParam = input.request.params?.some(
				(p) => p.key && paginationParamNames.includes(p.key.toLowerCase()),
			);
			const paginationRequired = hasListKeyword;
			const passed = !paginationRequired || !!hasPaginationParam;
			return {
				applicable: true,
				passed,
				severity:
					paginationRequired && !hasPaginationParam ? "Medium" : undefined,
				issue:
					paginationRequired && !hasPaginationParam
						? {
								description:
									"List endpoint detected without pagination parameters",
								impact:
									"Unbounded queries may return millions of rows causing OOM or timeout",
								recommendation:
									"Add pagination: ?page=1&limit=20, or use cursor-based pagination",
							}
						: undefined,
			};
		},
	},
];
