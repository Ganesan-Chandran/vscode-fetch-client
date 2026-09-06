import Chance from "chance";
import RandExp from "randexp";
import moment from "moment-mini";
import { IFakeDataColumn, IFakeDataGenerateResult } from "./fakeData.types";

const chance = new Chance();

function maskDigits(mask: string): string {
	return mask.replace(/#/g, () => String(chance.integer({ min: 0, max: 9 })));
}

function generateValue(col: IFakeDataColumn): string {
	switch (col.type) {
		case "name":
			return chance.name();
		case "email":
			return chance.email();
		case "phone":
			return col.format ? maskDigits(col.format) : chance.phone();
		case "uuid":
			return chance.guid();
		case "address":
			return chance.address();
		case "city":
			return chance.city();
		case "country":
			return chance.country({ full: true });
		case "date": {
			const randomDate = chance.date({
				year: chance.integer({ min: 1990, max: new Date().getFullYear() }),
			}) as Date;
			return moment(randomDate).format(col.format || "YYYY-MM-DD");
		}
		case "number": {
			const min = col.min ?? 0;
			const max = col.max ?? 100;
			return String(chance.integer({ min, max }));
		}
		case "boolean":
			return String(chance.bool());
		case "company":
			return chance.company();
		case "url":
			return chance.url();
		case "ip":
			return chance.ip();
		case "color":
			return chance.color({ format: "hex" });
		case "sentence":
			return chance.sentence();
		case "paragraph":
			return chance.paragraph();
		case "creditcard":
			return chance.cc();
		case "regex":
			try {
				return col.pattern ? new RandExp(col.pattern).gen() : "";
			} catch {
				return "";
			}
		default:
			return "";
	}
}

export function generateFakeData(
	columns: IFakeDataColumn[],
	rowCount: number,
): IFakeDataGenerateResult {
	const rows: Record<string, string>[] = [];
	for (let i = 0; i < rowCount; i++) {
		const row: Record<string, string> = {};
		for (const col of columns) {
			row[col.column] = generateValue(col);
		}
		rows.push(row);
	}
	return { rows, columns: columns.map((c) => c.column) };
}
