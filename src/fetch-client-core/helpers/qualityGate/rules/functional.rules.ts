import { IQGRuleDefinition } from "../qgEngineTypes";

// ─── Functional rules ─────────────────────────────────────────────────────────
// Note: rules 2-7 require a recorded response (matching the original early
// return behaviour when a request has never been executed).
export const functionalRules: IQGRuleDefinition[] = [
	{
		id: "no-response",
		dimension: "Functional",
		name: "Response received",
		description:
			"Fails when the request has never been executed and has no recorded response.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const has = !!input.response;
			return {
				applicable: true,
				passed: has,
				severity: has ? undefined : "High",
				issue: has
					? undefined
					: {
							description: "No response recorded for this request",
							impact:
								"Cannot evaluate functional correctness without a response",
							recommendation:
								"Run the request at least once before the Quality Gate analysis",
						},
			};
		},
	},
	{
		id: "network-error",
		dimension: "Functional",
		name: "No network errors",
		description:
			"Fails when the request could not reach the server (status code 0).",
		defaultSeverity: "Critical",
		evaluate: ({ input }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const status = r.response?.status ?? 0;
			const networkError = status === 0 || r.response?.isError;
			return {
				applicable: true,
				passed: !networkError,
				severity: networkError ? "Critical" : undefined,
				issue: networkError
					? {
							description: "Network / connection error - status code is 0",
							impact:
								"Request never reached the server; all downstream evaluations are unreliable",
							recommendation:
								"Verify the server is reachable and the URL is correct",
							suggestedFix:
								"Check URL scheme, network proxy, firewall, and SSL certificate",
						}
					: undefined,
			};
		},
	},
	{
		id: "server-error",
		dimension: "Functional",
		name: "No server errors",
		description: "Fails when the response status is 5xx.",
		defaultSeverity: "Critical",
		evaluate: ({ input }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const status = r.response?.status ?? 0;
			const serverError = status >= 500;
			return {
				applicable: true,
				passed: !serverError,
				severity: serverError ? "Critical" : undefined,
				issue: serverError
					? {
							description: `Server error ${status} - unhandled exception on the server`,
							impact:
								"API contract is broken; consumers cannot rely on this endpoint",
							recommendation:
								"Fix the server-side error and add proper global exception handling",
							suggestedFix: `Investigate server logs for the ${status} root cause`,
						}
					: undefined,
			};
		},
	},
	{
		id: "client-error",
		dimension: "Functional",
		name: "Request completed successfully",
		description: "Fails when the response status is 4xx.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const status = r.response?.status ?? 0;
			const clientError = status >= 400 && status < 500;
			return {
				applicable: true,
				passed: !clientError,
				severity: clientError ? "High" : undefined,
				issue: clientError
					? {
							description: `Client error ${status} returned`,
							impact:
								"API rejected the request; authentication, payload, or URL may be wrong",
							recommendation:
								"Validate that request parameters match the API contract",
						}
					: undefined,
			};
		},
	},
	{
		id: "no-tests-defined",
		dimension: "Functional",
		name: "Test assertions defined",
		description: "Fails when the request has no test assertions configured.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			if (!input.response) {
				return { applicable: false };
			}
			const definedTests =
				input.request.tests?.filter((t) => t.parameter !== "") ?? [];
			const passed = definedTests.length > 0;
			return {
				applicable: true,
				passed,
				severity: passed ? undefined : "Medium",
				issue: passed
					? undefined
					: {
							description: "No test assertions defined for this request",
							impact: "Response correctness is never automatically verified",
							recommendation:
								"Add at least a status-code check and a key-field presence assertion",
							suggestedFix:
								"Tests tab → Response Code equal 200 → Response Body contains 'id'",
						},
			};
		},
	},
	{
		id: "failing-tests",
		dimension: "Functional",
		name: "All test assertions passed",
		description:
			"Fails when one or more configured test assertions did not pass.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const failed =
				r.testResults?.filter((t) => !t.result && t.test !== "") ?? [];
			const passed = failed.length === 0;
			return {
				applicable: true,
				passed,
				severity: passed ? undefined : "High",
				issue: passed
					? undefined
					: {
							description: `${failed.length} test assertion(s) are currently failing`,
							impact:
								"API response does not meet the defined contract expectations",
							recommendation:
								"Fix the API response or update stale test expectations",
							suggestedFix: `Failed: ${failed
								.slice(0, 3)
								.map((t) => t.test)
								.join("; ")}`,
						},
			};
		},
	},
	{
		id: "empty-body-2xx",
		dimension: "Functional",
		name: "Successful response contains body",
		description: "Fails when a successful (2xx) response has an empty body.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const r = input.response;
			if (!r) {
				return { applicable: false };
			}
			const status = r.response?.status ?? 0;
			const method = input.request.method.toLowerCase();
			const emptyBody =
				status >= 200 &&
				status < 300 &&
				status !== 204 &&
				status !== 304 &&
				!r.response?.responseData &&
				!["head", "delete"].includes(method);
			return {
				applicable: true,
				passed: !emptyBody,
				severity: emptyBody ? "Medium" : undefined,
				issue: emptyBody
					? {
							description: "Empty response body on a successful (2xx) response",
							impact:
								"Clients cannot process an empty response from a data endpoint",
							recommendation:
								"Return an appropriate body, or use 204 No Content for intentional empty responses",
						}
					: undefined,
			};
		},
	},
];
