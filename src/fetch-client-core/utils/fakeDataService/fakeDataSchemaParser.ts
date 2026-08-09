import { CsvSeparator } from "../dataDrivenTestService/dataDriven.types";
import {
	FakeDataSchemaFormat,
	FakeDataType,
	IFakeDataColumn,
	IFakeDataSchemaParseResult,
} from "./fakeData.types";

export const FAKE_DATA_TYPES: FakeDataType[] = [
	"name",
	"email",
	"phone",
	"uuid",
	"address",
	"date",
	"number",
	"boolean",
	"company",
	"url",
	"ip",
	"color",
	"sentence",
	"paragraph",
	"city",
	"country",
	"creditcard",
	"regex",
];

export const MAX_FAKE_DATA_ROWS = 100;

function isValidType(type: string): type is FakeDataType {
	return (FAKE_DATA_TYPES as string[]).includes(type);
}

function parseTypeSpec(
	column: string,
	spec: string,
): IFakeDataColumn | { error: string } {
	const trimmed = spec.trim();
	const sepIdx = trimmed.indexOf(":");
	const type = (sepIdx === -1 ? trimmed : trimmed.slice(0, sepIdx))
		.trim()
		.toLowerCase();
	const rest = sepIdx === -1 ? "" : trimmed.slice(sepIdx + 1).trim();

	if (!isValidType(type)) {
		return {
			error: `Column "${column}": unsupported type "${type || spec}".`,
		};
	}

	const result: IFakeDataColumn = { column, type };

	if (type === "number") {
		const [minStr, maxStr] = rest.split("-").map((s) => s.trim());
		result.min = minStr ? Number(minStr) : 0;
		result.max = maxStr ? Number(maxStr) : 100;
	} else if ((type === "date" || type === "phone") && rest) {
		result.format = rest;
	} else if (type === "regex") {
		if (!rest) {
			return {
				error: `Column "${column}": regex type requires a pattern, e.g. "regex:^[A-Z]{3}\\d{4}$".`,
			};
		}
		result.pattern = rest;
	}

	return result;
}

export function parseFakeDataSchema(
	content: string,
	format: FakeDataSchemaFormat,
	csvSeparator: CsvSeparator = ",",
): IFakeDataSchemaParseResult {
	if (format === "json") {
		return parseJsonSchema(content);
	}
	return parseCsvSchema(content, csvSeparator);
}

function stripQuotes(value: string): string {
	return value.trim().replace(/^["']|["']$/g, "");
}

function parseCsvSchema(
	content: string,
	separator: CsvSeparator,
): IFakeDataSchemaParseResult {
	const lines = content.split(/\r?\n/).filter((l) => l.trim() !== "");

	if (lines.length === 0) {
		return { columns: [], error: "File is empty." };
	}

	const names = lines[0].split(separator).map(stripQuotes);
	if (names.length === 0 || (names.length === 1 && names[0] === "")) {
		return { columns: [], error: "No columns found in header row." };
	}

	const typeLine = lines[1];
	if (!typeLine) {
		return {
			columns: [],
			error:
				"Missing type row (row 2) defining the fake data type for each column.",
		};
	}
	const specs = typeLine.split(separator).map(stripQuotes);

	const columns: IFakeDataColumn[] = [];
	const errors: string[] = [];
	names.forEach((name, i) => {
		const parsed = parseTypeSpec(name, specs[i] ?? "");
		if ("error" in parsed) {
			errors.push(parsed.error);
		} else {
			columns.push(parsed);
		}
	});

	if (errors.length > 0) {
		return { columns: [], error: errors.join(" ") };
	}
	return { columns };
}

function parseJsonSchema(content: string): IFakeDataSchemaParseResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (err) {
		return { columns: [], error: `Invalid JSON: ${(err as Error).message}` };
	}

	if (!Array.isArray(parsed)) {
		return {
			columns: [],
			error:
				'Invalid JSON structure. Expected an array of { "column", "type" } objects.',
		};
	}
	if (parsed.length === 0) {
		return { columns: [], error: "No columns found in JSON schema." };
	}

	const columns: IFakeDataColumn[] = [];
	const errors: string[] = [];

	parsed.forEach((item: any, i: number) => {
		const column = item?.column;
		const type = (item?.type ?? "").toString().toLowerCase();

		if (!column) {
			errors.push(`Entry ${i + 1}: missing "column" name.`);
			return;
		}
		if (!isValidType(type)) {
			errors.push(`Column "${column}": unsupported type "${type}".`);
			return;
		}
		if (type === "regex" && !item.pattern) {
			errors.push(`Column "${column}": regex type requires a "pattern" property.`);
			return;
		}

		columns.push({
			column,
			type,
			format: item.format,
			min: item.min,
			max: item.max,
			pattern: item.pattern,
		});
	});

	if (errors.length > 0) {
		return { columns: [], error: errors.join(" ") };
	}
	return { columns };
}
