import { IQGRuleDefinition } from "../qgEngineTypes";

// ─── Test Coverage rules ───────────────────────────────────────────────────────
export const testCoverageRules: IQGRuleDefinition[] = [
	{
		id: "tests-defined",
		dimension: "TestCoverage",
		name: "Tests defined",
		description: "Fails when the request has no test assertions configured.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const tests =
				input.request.tests?.filter((t) => t.parameter !== "") ?? [];
			const hasTests = tests.length > 0;
			return {
				applicable: true,
				passed: hasTests,
				severity: hasTests ? undefined : "High",
				issue: hasTests
					? undefined
					: {
							description: "No test assertions defined",
							impact: "Request behavior is never validated",
							recommendation: "Add response validation tests",
						},
			};
		},
	},
	{
		id: "status-test",
		dimension: "TestCoverage",
		name: "Status code assertion",
		description: "Fails when there is no 'Response Code' test assertion.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const tests =
				input.request.tests?.filter((t) => t.parameter !== "") ?? [];
			const hasStatusTest = tests.some((t) => t.parameter === "Response Code");
			return {
				applicable: true,
				passed: hasStatusTest,
				severity: hasStatusTest ? undefined : "Medium",
				issue: hasStatusTest
					? undefined
					: {
							description: "No status code assertion",
							impact: "Unexpected HTTP status may go unnoticed",
							recommendation: "Assert expected response status",
						},
			};
		},
	},
	{
		id: "body-test",
		dimension: "TestCoverage",
		name: "Response body assertion",
		description: "Fails when there is no response body assertion.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const tests =
				input.request.tests?.filter((t) => t.parameter !== "") ?? [];
			const bodyParams = ["Response Body", "Response JSON Body"];
			const hasBodyTest = tests.some(
				(t) => bodyParams.includes(t.parameter) || t.customParameter,
			);
			return {
				applicable: true,
				passed: hasBodyTest,
				severity: hasBodyTest ? undefined : "Medium",
				issue: hasBodyTest
					? undefined
					: {
							description: "No response body validation",
							impact: "Incorrect payloads may pass unnoticed",
							recommendation: "Validate important response fields",
						},
			};
		},
	},
	{
		id: "response-time",
		dimension: "TestCoverage",
		name: "Response time assertion",
		description: "Fails when there is no 'Response Time' test assertion.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const tests =
				input.request.tests?.filter((t) => t.parameter !== "") ?? [];
			const hasTimeTest = tests.some((t) => t.parameter === "Response Time");
			return {
				applicable: true,
				passed: hasTimeTest,
				severity: hasTimeTest ? undefined : "Low",
				issue: hasTimeTest
					? undefined
					: {
							description: "No response time validation",
							impact: "Performance regressions won't be detected",
							recommendation: "Assert maximum response duration",
						},
			};
		},
	},
	{
		id: "header-test",
		dimension: "TestCoverage",
		name: "Response header assertion",
		description: "Fails when there is no 'Response Header' test assertion.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const tests =
				input.request.tests?.filter((t) => t.parameter !== "") ?? [];
			const hasHeaderTest = tests.some(
				(t) => t.parameter === "Response Header",
			);
			return {
				applicable: true,
				passed: hasHeaderTest,
				severity: hasHeaderTest ? undefined : "Low",
				issue: hasHeaderTest
					? undefined
					: {
							description: "No response header validation",
							impact: "Security or caching headers may regress unnoticed",
							recommendation: "Validate important response headers",
						},
			};
		},
	},
	{
		id: "tests-pass",
		dimension: "TestCoverage",
		name: "All tests passed",
		description:
			"Fails when one or more configured test assertions did not pass.",
		defaultSeverity: "Critical",
		evaluate: ({ input }) => {
			const failedTests =
				input.response?.testResults?.filter(
					(t) => !t.result && t.test !== "",
				) ?? [];
			const passed = failedTests.length === 0;
			return {
				applicable: true,
				passed,
				severity: passed ? undefined : "Critical",
				issue: passed
					? undefined
					: {
							description: `${failedTests.length} test(s) failed`,
							impact: "API validation failed",
							recommendation: "Fix failing assertions",
						},
			};
		},
	},
];
