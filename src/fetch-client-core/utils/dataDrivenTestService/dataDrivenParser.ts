import { CsvSeparator, DataFileFormat, IDataParseResult } from "./dataDriven.types";

export const MAX_DATA_ROWS = 100;

export function parseDataFile(
	content: string,
	format: DataFileFormat,
	separator: CsvSeparator = ",",
): IDataParseResult {
	if (format === "csv") {
		return parseCSV(content, separator);
	}
	return parseJSON(content);
}

function parseCSVLine(line: string, separator: CsvSeparator): string[] {
	const result: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === '"') {
			if (inQuotes && line[i + 1] === '"') {
				current += '"';
				i++;
			} else {
				inQuotes = !inQuotes;
			}
		} else if (ch === separator && !inQuotes) {
			result.push(current.trim());
			current = "";
		} else {
			current += ch;
		}
	}
	result.push(current.trim());
	return result;
}

function parseCSV(content: string, separator: CsvSeparator): IDataParseResult {
	const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

	if (lines.length === 0) {
		return { rows: [], columns: [], rowCount: 0, error: "File is empty." };
	}

	const columns = parseCSVLine(lines[0], separator).map((col) =>
		col.replace(/^["']|["']$/g, ""),
	);

	if (columns.length === 0 || (columns.length === 1 && columns[0] === "")) {
		return {
			rows: [],
			columns: [],
			rowCount: 0,
			error: "No columns found in CSV header.",
		};
	}

	const dataLines = lines.slice(1);

	if (dataLines.length > MAX_DATA_ROWS) {
		return {
			rows: [],
			columns,
			rowCount: dataLines.length,
			error: `File contains ${dataLines.length} rows. Maximum allowed is ${MAX_DATA_ROWS}.`,
		};
	}

	const rows: Record<string, string>[] = dataLines.map((line) => {
		const values = parseCSVLine(line, separator);
		const row: Record<string, string> = {};
		columns.forEach((col, i) => {
			row[col] = values[i] !== undefined ? values[i].replace(/^["']|["']$/g, "") : "";
		});
		return row;
	});

	return { rows, columns, rowCount: rows.length };
}

function parseJSON(content: string): IDataParseResult {
	try {
		const parsed = JSON.parse(content);

		let rows: Record<string, unknown>[];

		if (Array.isArray(parsed)) {
			rows = parsed;
		} else if (typeof parsed === "object" && parsed !== null) {
			rows =
				(parsed as any).data ??
				(parsed as any).rows ??
				[(parsed as Record<string, unknown>)];
		} else {
			return {
				rows: [],
				columns: [],
				rowCount: 0,
				error: "Invalid JSON structure. Expected an array of objects.",
			};
		}

		if (rows.length === 0) {
			return {
				rows: [],
				columns: [],
				rowCount: 0,
				error: "No rows found in JSON.",
			};
		}

		if (rows.length > MAX_DATA_ROWS) {
			return {
				rows: [],
				columns: Object.keys(rows[0] ?? {}),
				rowCount: rows.length,
				error: `File contains ${rows.length} rows. Maximum allowed is ${MAX_DATA_ROWS}.`,
			};
		}

		const normalizedRows: Record<string, string>[] = rows.map((row) => {
			const normalized: Record<string, string> = {};
			Object.entries(row).forEach(([k, v]) => {
				normalized[k] = v === null || v === undefined ? "" : String(v);
			});
			return normalized;
		});

		const columns = Object.keys(normalizedRows[0] ?? {});

		return { rows: normalizedRows, columns, rowCount: normalizedRows.length };
	} catch (err) {
		return {
			rows: [],
			columns: [],
			rowCount: 0,
			error: `Invalid JSON: ${(err as Error).message}`,
		};
	}
}
