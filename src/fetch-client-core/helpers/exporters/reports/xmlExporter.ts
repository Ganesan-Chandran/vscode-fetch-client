import { ExportPreFetchStep, ExportRequestResult, ExportReport } from "../../../types/export.types";

function escapeXml(value: string | number | undefined | null): string {
	const str = value === undefined || value === null ? "" : String(value);
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function renderPreFetchStep(step: ExportPreFetchStep, indent: string): string {
	const testsXml =
		step.tests.length > 0
			? `\n${indent}  <tests>\n${step.tests
				.map(
					(t) =>
						`${indent}    <test name="${escapeXml(t.name)}" result="${t.passed ? "Pass" : "Fail"}" actualValue="${escapeXml(t.actualValue ?? "")}" />`,
				)
				.join("\n")}\n${indent}  </tests>`
			: "";

	const childrenXml =
		step.children.length > 0
			? `\n${indent}  <steps>\n${step.children.map((c) => renderPreFetchStep(c, indent + "    ")).join("\n")}\n${indent}  </steps>`
			: "";

	return `${indent}<step name="${escapeXml(step.name)}" status="${step.status}" outcome="${step.passed ? "Passed" : "Failed"}">${testsXml}${childrenXml}\n${indent}</step>`;
}

function renderPreFetch(steps: ExportPreFetchStep[]): string {
	if (steps.length === 0) {
		return "";
	}
	const stepsXml = steps.map((s) => renderPreFetchStep(s, "      ")).join("\n");
	return `\n    <preFetch>\n${stepsXml}\n    </preFetch>`;
}

function renderRequest(r: ExportRequestResult): string {
	const detailsXml = r.details
		? `\n    <details>${escapeXml(r.details)}</details>`
		: "";

	const testsXml =
		r.tests.length > 0
			? `\n    <tests>\n${r.tests
				.map(
					(t) =>
						`      <test name="${escapeXml(t.name)}" result="${t.passed ? "Pass" : "Fail"}" actualValue="${escapeXml(t.actualValue ?? "")}" />`,
				)
				.join("\n")}\n    </tests>`
			: "";

	return `  <request name="${escapeXml(r.name)}" method="${escapeXml(r.method)}" url="${escapeXml(r.url)}" status="${r.status}" statusText="${escapeXml(r.statusText)}" durationMs="${r.durationMs}" sizeBytes="${r.sizeBytes}" outcome="${r.outcome}">${detailsXml}${testsXml}${renderPreFetch(r.preFetch)}\n  </request>`;
}

export function toXml(reports: ExportReport[]): string {
	if (reports.length === 0) {
		return `<?xml version="1.0" encoding="UTF-8"?>
<fetchClientReport />
`;
	}

	const context = reports[0].context;

	const summary = reports.reduce(
		(acc, report) => {
			acc.totalRequests += report.summary.totalRequests;
			acc.passedRequests += report.summary.passedRequests;
			acc.failedRequests += report.summary.failedRequests;
			acc.totalDurationMs += report.summary.totalDurationMs;
			acc.totalTests += report.summary.totalTests;
			acc.passedTests += report.summary.passedTests;
			acc.failedTests += report.summary.failedTests;

			return acc;
		},
		{
			totalRequests: 0,
			passedRequests: 0,
			failedRequests: 0,
			totalDurationMs: 0,
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			generatedAt: reports[0].summary.generatedAt,
		},
	);

	const iterationsXml = reports
		.map((report, index) => {
			const requestsXml = report.results.map(renderRequest).join("\n");

			return `  <iteration number="${index + 1}">
    <summary totalRequests="${report.summary.totalRequests}" passedRequests="${report.summary.passedRequests}" failedRequests="${report.summary.failedRequests}" totalDurationMs="${report.summary.totalDurationMs}" totalTests="${report.summary.totalTests}" passedTests="${report.summary.passedTests}" failedTests="${report.summary.failedTests}" generatedAt="${escapeXml(report.summary.generatedAt)}" />
${requestsXml}
  </iteration>`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<fetchClientReport scope="${escapeXml(context.scope)}" name="${escapeXml(context.name)}">
  <summary totalRequests="${summary.totalRequests}" passedRequests="${summary.passedRequests}" failedRequests="${summary.failedRequests}" totalDurationMs="${summary.totalDurationMs}" totalTests="${summary.totalTests}" passedTests="${summary.passedTests}" failedTests="${summary.failedTests}" generatedAt="${escapeXml(summary.generatedAt)}" />
${iterationsXml}
</fetchClientReport>
`;
}
