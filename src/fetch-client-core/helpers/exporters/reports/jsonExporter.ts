import { ExportReport } from "../../../types/export.types";

export function toJson(reports: ExportReport[]): string {
	if (reports.length === 0) {
		return JSON.stringify({}, null, 2);
	}

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

	return JSON.stringify(
		{
			context: reports[0].context,
			summary,
			results: reports.map(({ summary, results }) => ({
				summary,
				results,
			})),
		},
		null,
		2,
	);
}
