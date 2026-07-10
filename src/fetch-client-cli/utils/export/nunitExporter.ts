import { ExportRequestResult, ExportReport } from "../../types/export.types";
import { summarizePreFetch } from "./preFetchSummary";

function escapeXml(value: string | number | undefined | null): string {
	const str = value === undefined || value === null ? "" : String(value);
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Combines HTTP outcome + assertion results — this is what "passing a test" means. */
function testCaseResult(r: ExportRequestResult): "Passed" | "Failed" {
	const httpOk = r.outcome === "Passed";
	const testsOk = r.tests.every((t) => t.passed);
	return httpOk && testsOk ? "Passed" : "Failed";
}

function renderTestCase(r: ExportRequestResult, id: number): string {
	const result = testCaseResult(r);
	const durationSeconds = (r.durationMs / 1000).toFixed(3);
	const asserts = r.tests.length;

	const failureBlock =
		result === "Failed"
			? `\n      <failure>
				<message><![CDATA[${r.details ?? `Expected status 2xx-3xx, got ${r.status} ${r.statusText}`}]]></message>
			</failure>`
			: "";

	const assertionsBlock =
		r.tests.length > 0
			? `\n      <assertions>\n${r.tests
					.map(
						(t) =>
							`        <assertion result="${t.passed ? "Passed" : "Failed"}">\n          <message><![CDATA[${t.name}${t.actualValue !== undefined ? ` (actual: ${t.actualValue})` : ""}]]></message>\n        </assertion>`,
					)
					.join("\n")}\n      </assertions>`
			: "";

	const preFetchSummary = summarizePreFetch(r.preFetch);
	const propertiesBlock = preFetchSummary
		? `\n      <properties>\n        <property name="preFetch" value="${escapeXml(preFetchSummary)}" />\n      </properties>`
		: "";

	return `    <test-case id="${id}" name="${escapeXml(r.name)}" fullname="${escapeXml(`${r.method} ${r.url}`)}" methodname="${escapeXml(r.name)}" classname="FetchClient.CLI" result="${result}" duration="${durationSeconds}" asserts="${asserts}">${failureBlock}${assertionsBlock}${propertiesBlock}
		</test-case>`;
}

/**
 * NUnit3 test-run XML. Totals here are computed from each test-case's combined
 * HTTP + assertion result (testCaseResult), NOT from the HTTP-only summary —
 * otherwise a request that returns 200 but fails a test would make the suite
 * header say "passed" while its own test-case says "Failed".
 */
export function toNUnit(report: ExportReport): string {
	const { context, summary, results } = report;

	const testCases = results
		.map((r, idx) => renderTestCase(r, idx + 1))
		.join("\n");

	const total = results.length;
	const passed = results.filter((r) => testCaseResult(r) === "Passed").length;
	const failed = total - passed;
	const totalDurationSeconds = (
		results.reduce((sum, r) => sum + r.durationMs, 0) / 1000
	).toFixed(3);
	const overallResult = failed > 0 ? "Failed" : "Passed";

	return `<?xml version="1.0" encoding="UTF-8"?>
<test-run id="1" name="${escapeXml(context.name)}" testcasecount="${total}" result="${overallResult}" total="${total}" passed="${passed}" failed="${failed}" inconclusive="0" skipped="0" duration="${totalDurationSeconds}" start-time="${escapeXml(summary.generatedAt)}">
	<test-suite type="TestSuite" id="1000" name="${escapeXml(context.name)}" fullname="${escapeXml(context.name)}" testcasecount="${total}" result="${overallResult}" total="${total}" passed="${passed}" failed="${failed}" duration="${totalDurationSeconds}">
${testCases}
	</test-suite>
</test-run>
`;
}
