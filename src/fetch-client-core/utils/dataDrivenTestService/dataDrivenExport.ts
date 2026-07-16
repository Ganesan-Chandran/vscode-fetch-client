import { formatDate } from "../../helpers/dateTime.helper";
import {
	IDataDrivenConfig,
	IDataDrivenResult,
} from "./dataDriven.types";

export function exportDataDrivenJson(
	result: IDataDrivenResult,
	config: IDataDrivenConfig,
	testName: string,
): string {
	return JSON.stringify(
		{
			app: "Fetch Client",
			testType: "Data-Driven Test",
			testName,
			exportedDate: formatDate(),
			config,
			summary: {
				totalRows: result.totalRows,
				totalRequests: result.totalRequests,
				passedRequests: result.passedRequests,
				failedRequests: result.failedRequests,
			},
			results: result.rows,
		},
		null,
		2,
	);
}

export function exportDataDrivenCSV(result: IDataDrivenResult): string {
	const headers = [
		"Row",
		"Request Name",
		"Method",
		"URL",
		"Status",
		"Status Text",
		"Duration (ms)",
		"Tests (passed/total)",
		"Pass",
		"Error",
	];

	const csvRows = result.rows.map((r) => {
		const passLabel = r.isError
			? "FAIL"
			: r.testTotal === 0 || r.testPassed === r.testTotal
				? "PASS"
				: "FAIL";
		return [
			r.rowIndex,
			`"${(r.requestName ?? "").replace(/"/g, '""')}"`,
			r.method?.toUpperCase() ?? "",
			`"${(r.url ?? "").replace(/"/g, '""')}"`,
			r.status,
			r.statusText,
			r.duration,
			r.testTotal > 0 ? `${r.testPassed}/${r.testTotal}` : "-",
			passLabel,
			r.error ? `"${r.error.replace(/"/g, '""')}"` : "",
		].join(",");
	});

	return [headers.join(","), ...csvRows].join("\n");
}
