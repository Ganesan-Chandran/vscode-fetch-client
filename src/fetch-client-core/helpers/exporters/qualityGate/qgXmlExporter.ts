import {
	IQGReport,
	IQualityGateResult,
	QGVerdict,
} from "../../../types/qualityGate.types";

function esc(s: string | number | undefined | null): string {
	const str = s === undefined || s === null ? "" : String(s);
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

function classAttr(v: QGVerdict): string {
	return v === "PASS" ? "passed" : "failed";
}

function renderRequest(r: IQualityGateResult, suiteId: string): string {
	const cls = classAttr(r.verdict);
	const durationSec = "0.000"; // quality gate is static; no real duration
	const allIssues = r.dimensions.flatMap((d) => d.issues);
	const failureMsg =
		r.verdict !== "PASS"
			? `<failure message="${esc(
					`Score ${r.overallScore}/100 · Critical:${r.summary.critical} High:${r.summary.high}`,
				)}" type="QualityGateViolation"><![CDATA[${allIssues
					.map(
						(i) =>
							`[${i.severity}][${i.ruleId}] ${i.description}\n  → ${i.recommendation}`,
					)
					.join("\n")}]]></failure>`
			: "";

	// Suggested fixes surfaced as system-out so CI runners (Jenkins, GitLab, GH Actions)
	// display them directly in the test-summary / build-log tab.
	const fixesOut = allIssues
		.filter((i) => i.suggestedFix)
		.map((i) => `[${i.ruleId}] ${i.suggestedFix}`)
		.join("\n");
	const systemOut = fixesOut
		? `<system-out><![CDATA[${fixesOut}]]></system-out>`
		: "";

	const propertiesBlock = r.dimensions
		.map(
			(d) => `<property name="${esc(d.dimension)}Score" value="${d.score}" />`,
		)
		.join("\n      ");

	const suppressedBlock = (r.suppressedIssues ?? [])
		.map(
			(i) =>
				`<property name="suppressed" value="${esc(`${i.ruleId}: ${i.description}`)}" />`,
		)
		.join("\n      ");

	return `		<testcase name="${esc(r.requestName)} [${esc(r.method)} ${esc(r.url)}]"
							classname="${esc(suiteId)}"
							time="${durationSec}"
							status="${cls}">
			<properties>
				<property name="overallScore" value="${r.overallScore}" />
				<property name="verdict" value="${esc(r.verdict)}" />
				${propertiesBlock}
				${suppressedBlock}
			</properties>
			${failureMsg}
			${systemOut}
		</testcase>`;
}

export function toQGXml(report: IQGReport): string {
	const passed = report.results.filter((r) => r.verdict === "PASS").length;
	const failed = report.results.length - passed;
	const ts = report.runAt;

	const testCases = report.results
		.map((r) => renderRequest(r, report.name))
		.join("\n");

	const gatePassed = report.gateStatus?.passed ?? failed === 0;

	return `<?xml version="1.0" encoding="utf-8"?>
<testsuites name="API Quality Gate" tests="${report.results.length}" failures="${failed}" timestamp="${esc(ts)}"
						gateStatus="${gatePassed ? "passed" : "failed"}">
	<testsuite name="${esc(report.name)}" tests="${report.results.length}" failures="${failed}" passed="${passed}"
							timestamp="${esc(ts)}" aggregateScore="${report.aggregateScore}" verdict="${esc(report.aggregateVerdict)}"
							gateStatus="${gatePassed ? "passed" : "failed"}">
${testCases}
	</testsuite>
</testsuites>`;
}
