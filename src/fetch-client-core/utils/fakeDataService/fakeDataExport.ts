import { CsvSeparator } from "../dataDrivenTestService/dataDriven.types";

function escapeCsvValue(value: string, separator: CsvSeparator): string {
	if (
		value.includes('"') ||
		value.includes(separator) ||
		value.includes("\n")
	) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function exportFakeDataCSV(
	rows: Record<string, string>[],
	columns: string[],
	separator: CsvSeparator = ",",
): string {
	const header = columns
		.map((c) => escapeCsvValue(c, separator))
		.join(separator);
	const lines = rows.map((row) =>
		columns.map((c) => escapeCsvValue(row[c] ?? "", separator)).join(separator),
	);
	return [header, ...lines].join("\n");
}

export function exportFakeDataJSON(rows: Record<string, string>[]): string {
	return JSON.stringify(rows, null, 2);
}
