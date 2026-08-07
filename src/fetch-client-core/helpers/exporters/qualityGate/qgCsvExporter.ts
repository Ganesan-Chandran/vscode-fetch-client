import { IQGReport } from "../../../types/qualityGate.types";

function csvEscape(s: string | number | undefined | null): string {
	const str = s === undefined || s === null ? "" : String(s);
	if (str.includes(",") || str.includes('"') || str.includes("\n")) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

export function toQGCsv(report: IQGReport): string {
	const rows: string[] = [
		[
			"# GateStatus",
			report.gateStatus?.passed ? "PASSED" : "FAILED",
			(report.gateStatus?.reasons ?? []).join(" | "),
		]
			.map(csvEscape)
			.join(","),
		[
			"RequestName",
			"Method",
			"URL",
			"OverallScore",
			"Verdict",
			"Dimension",
			"DimensionScore",
			"RuleId",
			"Severity",
			"Description",
			"Impact",
			"Recommendation",
			"SuggestedFix",
			"Suppressed",
		]
			.map(csvEscape)
			.join(","),
	];

	for (const result of report.results) {
		for (const dim of result.dimensions) {
			if (dim.issues.length === 0) {
				rows.push(
					[
						result.requestName,
						result.method,
						result.url,
						result.overallScore,
						result.verdict,
						dim.dimension,
						dim.score,
						"",
						"",
						"No issues",
						"",
						"",
						"",
						"",
					]
						.map(csvEscape)
						.join(","),
				);
			} else {
				for (const issue of dim.issues) {
					rows.push(
						[
							result.requestName,
							result.method,
							result.url,
							result.overallScore,
							result.verdict,
							dim.dimension,
							dim.score,
							issue.ruleId,
							issue.severity,
							issue.description,
							issue.impact,
							issue.recommendation,
							issue.suggestedFix ?? "",
							"",
						]
							.map(csvEscape)
							.join(","),
					);
				}
			}
		}
		for (const issue of result.suppressedIssues ?? []) {
			rows.push(
				[
					result.requestName,
					result.method,
					result.url,
					result.overallScore,
					result.verdict,
					issue.dimension,
					"",
					issue.ruleId,
					issue.severity,
					issue.description,
					issue.impact,
					issue.recommendation,
					issue.suggestedFix ?? "",
					"true",
				]
					.map(csvEscape)
					.join(","),
			);
		}
	}

	return rows.join("\r\n");
}
