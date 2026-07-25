import { ExportRequestResult, ExportReport } from "../../../types/export.types";
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

/** Combines HTTP outcome + assertion results - this is what "passing a test" means. */
function testCaseResult(r: ExportRequestResult): "Passed" | "Failed" {
	const httpOk = r.outcome === "Passed";
	const testsOk = r.tests.every((t) => t.passed);
	return httpOk && testsOk ? "Passed" : "Failed";
}

function renderTestCase(
	r: ExportRequestResult,
	id: number,
): string {
	const result = testCaseResult(r);
	const durationSeconds = (r.durationMs / 1000).toFixed(3);
	const asserts = r.tests.length;

	let failureMessage = "";


	if (r.outcome !== "Passed") {
		failureMessage =
			r.details ??
			`Expected status 2xx-3xx, got ${r.status} ${r.statusText}`;
	} else {
		const failedTests = r.tests.filter((t) => !t.passed);

		if (failedTests.length === 1) {
			failureMessage = failedTests[0].name;
		} else if (failedTests.length > 1) {
			failureMessage = `${failedTests.length} assertions failed.`;
		}
	}

	const failureBlock =
		result === "Failed"
			? `
      <failure>
        <message><![CDATA[${failureMessage}]]></message>
      </failure>`
			: "";

	const assertionsBlock =
		r.tests.length > 0
			? `
      <assertions>
	${r.tests.map(
				(t) => `        <assertion result="${t.passed ? "Passed" : "Failed"}">
          <message><![CDATA[${t.name}${t.actualValue !== undefined
						? ` (actual: ${t.actualValue})`
						: ""
					}]]></message>
        </assertion>`,
			)
				.join("\n")}
      </assertions>`
			: "";

	const preFetchSummary = summarizePreFetch(r.preFetch);

	const propertiesBlock = preFetchSummary
		? `
      <properties>
        <property name="preFetch" value="${escapeXml(preFetchSummary)}" />
      </properties>`
		: "";

	const body = `${failureBlock}${assertionsBlock}${propertiesBlock}`;

	if (!body.trim()) {
		return `    <test-case id="${id}" name="${escapeXml(r.name)}" fullname="${escapeXml(`${r.method.toUpperCase()} ${r.url}`)}" method="${escapeXml(r.method.toUpperCase())}" classname="FetchClient.CLI" result="${result}" duration="${durationSeconds}" asserts="${asserts}"/>`;
	}

	return `    <test-case id="${id}" name="${escapeXml(r.name)}" fullname="${escapeXml(`${r.method.toUpperCase()} ${r.url}`)}" method="${escapeXml(r.method.toUpperCase())}" classname="FetchClient.CLI" result="${result}" duration="${durationSeconds}" asserts="${asserts}" >
${body}
    </test-case>`;
}

/**
 * NUnit3 test-run XML. Totals here are computed from each test-case's combined
 * HTTP + assertion result (testCaseResult), NOT from the HTTP-only summary -
 * otherwise a request that returns 200 but fails a test would make the suite
 * header say "passed" while its own test-case says "Failed".
 */
export function toNUnit(reports: ExportReport[]): string {

	const { context, summary } = reports[0];

	const allResults = reports.flatMap(r => r.results);

	const total = allResults.length;
	const passed = allResults.filter(r => testCaseResult(r) === "Passed").length;
	const failed = total - passed;
	const totalDurationSeconds = (allResults.reduce((s, r) => s + r.durationMs, 0) / 1000).toFixed(3);

	const overallResult = failed > 0 ? "Failed" : "Passed";
	let testCaseId = 1;
	const suites = reports
		.map((report, iteration) => {
			const cases = report.results
				.map((r) => renderTestCase(r, testCaseId++))
				.join("\n");

			const total = report.results.length;
			const passed = report.results.filter(
				r => testCaseResult(r) === "Passed",
			).length;
			const failed = total - passed;
			const duration = (
				report.results.reduce((s, r) => s + r.durationMs, 0) / 1000
			).toFixed(3);

			return `
        <test-suite
            type="TestSuite"
            id="${1001 + iteration}"
            name="Iteration ${iteration + 1}"
            fullname="${escapeXml(context.name)}.Iteration${iteration + 1}"
            testcasecount="${total}"
            result="${overallResult}"
            total="${total}"
            passed="${passed}"
            failed="${failed}"
            duration="${duration}">
${cases}
        </test-suite>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<test-run id="1" name="${escapeXml(context.name)}" testcasecount="${total}" result="${overallResult}" total="${total}" passed="${passed}" failed="${failed}" inconclusive="0" skipped="0" duration="${totalDurationSeconds}" start-time="${escapeXml(summary.generatedAt)}">
	<test-suite type="TestSuite" id="1000" name="${escapeXml(context.name)}" fullname="${escapeXml(context.name)}" testcasecount="${total}" result="${overallResult}" total="${total}" passed="${passed}" failed="${failed}" duration="${totalDurationSeconds}">
${suites}
	</test-suite>
</test-run>
`;
}
