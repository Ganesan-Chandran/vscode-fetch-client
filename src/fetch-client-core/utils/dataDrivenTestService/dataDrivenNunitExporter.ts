import { escapeXml } from "../escapeHelpers";
import { IDataDrivenResult, IDataDrivenRowResult } from "./dataDriven.types";

function isRowPassed(r: IDataDrivenRowResult): boolean {
	return !r.isError && (r.testTotal === 0 || r.testPassed === r.testTotal);
}

function renderTestCase(r: IDataDrivenRowResult, id: number): string {
	const passed = isRowPassed(r);
	const result = passed ? "Passed" : "Failed";
	const durationSeconds = (r.duration / 1000).toFixed(3);
	const name = `Row ${r.rowIndex} - ${r.requestName}`;
	const fullname = `${(r.method ?? "").toUpperCase()} ${r.url ?? ""} [row ${r.rowIndex}]`;

	let failureMessage = "";
	if (!passed) {
		failureMessage =
			r.error ??
			(r.testTotal > 0
				? `${r.testTotal - r.testPassed}/${r.testTotal} assertion(s) failed.`
				: `Expected status 2xx-3xx, got ${r.status} ${r.statusText}`);
	}

	const failureBlock = !passed
		? `
      <failure>
        <message><![CDATA[${failureMessage}]]></message>
      </failure>`
		: "";

	const propertiesBlock = `
      <properties>
        <property name="rowIndex" value="${r.rowIndex}" />
        <property name="testsPassed" value="${r.testPassed}/${r.testTotal}" />
      </properties>`;

	const body = `${failureBlock}${propertiesBlock}`;

	return `    <test-case id="${id}" name="${escapeXml(name)}" fullname="${escapeXml(fullname)}" classname="FetchClient.DataDriven" result="${result}" duration="${durationSeconds}" asserts="${r.testTotal}">
${body}
    </test-case>`;
}

export function toDataDrivenNUnit(result: IDataDrivenResult, testName: string): string {
	const total = result.rows.length;
	const passed = result.rows.filter(isRowPassed).length;
	const failed = total - passed;
	const overallResult = failed > 0 ? "Failed" : "Passed";
	const totalDurationSeconds = (
		result.rows.reduce((s, r) => s + r.duration, 0) / 1000
	).toFixed(3);

	let id = 1;
	const cases = result.rows.map((r) => renderTestCase(r, id++)).join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<test-run id="1" name="${escapeXml(testName)}" testcasecount="${total}" result="${overallResult}" total="${total}" passed="${passed}" failed="${failed}" inconclusive="0" skipped="0" duration="${totalDurationSeconds}" start-time="${escapeXml(result.startTime)}">
	<test-suite type="TestSuite" id="1000" name="${escapeXml(testName)}" fullname="${escapeXml(testName)}" testcasecount="${total}" result="${overallResult}" total="${total}" passed="${passed}" failed="${failed}" duration="${totalDurationSeconds}">
${cases}
	</test-suite>
</test-run>
`;
}
