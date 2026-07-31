import { IQGRuleDefinition } from "../qgEngineTypes";
import { getHeader, safeParseJson } from "../qgHelpers";

const correlationHeaders = [
	"x-request-id",
	"x-correlation-id",
	"traceparent",
	"request-id",
];

// ─── Observability rules ──────────────────────────────────────────────────────
// All rules here require a recorded response (matching the original early
// return behaviour of checkObservability()).
export const observabilityRules: IQGRuleDefinition[] = [
	{
		id: "correlation-id",
		dimension: "Observability",
		name: "Correlation ID returned",
		description: "Fails when the response has no correlation/trace ID header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			if (!input.response) {
				return { applicable: false };
			}
			const headers = input.response.headers ?? [];
			const hasCorrelation = correlationHeaders.some(
				(h) => !!getHeader(headers, h),
			);
			return {
				applicable: true,
				passed: hasCorrelation,
				severity: hasCorrelation ? undefined : "Medium",
				issue: hasCorrelation
					? undefined
					: {
							description: "Response does not include a Correlation ID",
							impact: "Troubleshooting distributed requests becomes difficult",
							recommendation: "Return X-Request-ID or Traceparent header",
						},
			};
		},
	},
	{
		id: "content-type",
		dimension: "Observability",
		name: "Content-Type header returned",
		description: "Fails when the response has no Content-Type header.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			if (!input.response) {
				return { applicable: false };
			}
			const headers = input.response.headers ?? [];
			const validContentType = !!getHeader(headers, "content-type");
			return {
				applicable: true,
				passed: validContentType,
				severity: validContentType ? undefined : "Medium",
				issue: validContentType
					? undefined
					: {
							description: "Response missing Content-Type header",
							impact: "Clients cannot reliably determine payload format",
							recommendation: "Always return Content-Type",
						},
			};
		},
	},
	{
		id: "error-message",
		dimension: "Observability",
		name: "Error response includes message",
		description:
			"Fails when a 4xx/5xx response has no message/error/title field.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const response = input.response;
			if (!response) {
				return { applicable: false };
			}
			const status = response.response?.status ?? 0;
			if (status < 400) {
				return { applicable: false };
			}
			const json = safeParseJson(response.response?.responseData);
			const hasMessage =
				typeof json.message === "string" ||
				typeof json.error === "string" ||
				typeof json.title === "string";
			return {
				applicable: true,
				passed: hasMessage,
				severity: hasMessage ? undefined : "Low",
				issue: hasMessage
					? undefined
					: {
							description: "Error response missing descriptive message",
							impact: "Developers cannot determine failure reason",
							recommendation: "Return message or title in error response",
						},
			};
		},
	},
	{
		id: "error-code",
		dimension: "Observability",
		name: "Error response includes code",
		description: "Fails when a 4xx/5xx response has no code/errorCode field.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const response = input.response;
			if (!response) {
				return { applicable: false };
			}
			const status = response.response?.status ?? 0;
			if (status < 400) {
				return { applicable: false };
			}
			const json = safeParseJson(response.response?.responseData);
			const hasCode = json.code !== undefined || json.errorCode !== undefined;
			return {
				applicable: true,
				passed: hasCode,
				severity: hasCode ? undefined : "Low",
				issue: hasCode
					? undefined
					: {
							description: "Error response missing application error code",
							impact: "Clients cannot distinguish failures programmatically",
							recommendation: "Return stable application error codes",
						},
			};
		},
	},
];
