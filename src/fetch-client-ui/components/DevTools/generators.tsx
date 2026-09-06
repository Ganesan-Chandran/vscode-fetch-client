import React, { useState } from "react";
import Chance from "chance";
import RandExp from "randexp";
import moment from "moment-mini";
import { v1 as uuidV1, v4 as uuidV4, v7 as uuidV7 } from "uuid";
import { withPanelLayout } from "./withPanelLayout";
import { copyText, formatTimestamp } from "./utils";
import type { IRandomDataColumn } from "./devTools.types";

const chance = new Chance();

function maskDigits(mask: string): string {
	return mask.replace(/#/g, () => String(chance.integer({ min: 0, max: 9 })));
}

function generateValue(col: IRandomDataColumn): string {
	switch (col.type) {
		case "name":
			return chance.name();
		case "firstName":
			return chance.first();
		case "lastName":
			return chance.last();
		case "username":
			return chance.twitter();
		case "password":
			return chance.string({
				length: 16,
				pool: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%",
			});
		case "email":
			return chance.email();
		case "phone":
			return col.format ? maskDigits(col.format) : chance.phone();
		case "uuid":
			return uuidV4();
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
		case "timestamp":
			return String(Date.now());
		case "number":
			return String(chance.integer({ min: col.min ?? 0, max: col.max ?? 100 }));
		case "float":
			return String(
				chance.floating({ min: col.min ?? 0, max: col.max ?? 100, fixed: 2 }),
			);
		case "boolean":
			return String(chance.bool());
		case "company":
			return chance.company();
		case "url":
			return chance.url();
		case "ip":
		case "ipv4":
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

export const UuidGenerator = withPanelLayout(() => {
	const [version, setVersion] = useState<"v1" | "v4" | "v7">("v7");
	const [count, setCount] = useState(5);
	const [output, setOutput] = useState("");

	const generate = () => {
		const values = Array.from(
			{ length: Math.max(1, Math.min(1000, count)) },
			() => {
				if (version === "v1") {
					return uuidV1();
				}
				if (version === "v4") {
					return uuidV4();
				}
				return uuidV7();
			},
		);
		setOutput(values.join("\n"));
	};

	const setCountValue = (e: any) => {
		let val = Number(e.target.value);
		if (val > 1000) {
			val = 1000;
		}
		setCount(val);
	};

	return (
		<div className="dev-tool">
			<div className="dev-tool-toolbar">
				<label className="dev-tool-label">Version</label>
				<select
					value={version}
					onChange={(e) => setVersion(e.target.value as typeof version)}
				>
					<option value="v1">UUID v1</option>
					<option value="v4">UUID v4</option>
					<option value="v7">UUID v7</option>
				</select>
				<label className="dev-tool-label">Count</label>
				<input
					type="number"
					min={1}
					max={1000}
					value={count}
					onChange={setCountValue}
				/>
			</div>
			<div className="dev-tool-actions">
				<button type="button" onClick={generate}>
					Generate
				</button>
			</div>
			<textarea value={output} readOnly />
			<div className="dev-tool-actions">
				<button type="button" onClick={() => copyText(output)}>
					Copy All
				</button>
			</div>
		</div>
	);
}, "🆔 UUID Generator");

export const TimestampGenerator = withPanelLayout(() => {
	const [value, setValue] = useState(String(Date.now()));
	const ms = Number(value);
	const formatted = Number.isFinite(ms) ? formatTimestamp(ms) : null;

	return (
		<div className="dev-tool">
			<input value={value} onChange={(e) => setValue(e.target.value)} />
			{formatted ? (
				<pre className="dev-tool-output">
					{JSON.stringify(formatted, null, 2)}
				</pre>
			) : (
				<div className="dev-tool-error">
					Enter a valid millisecond timestamp.
				</div>
			)}
			<div className="dev-tool-actions">
				<button type="button" onClick={() => setValue(String(Date.now()))}>
					Now
				</button>
			</div>
		</div>
	);
}, "⏱️ Timestamp Generator");

const defaultColumns: IRandomDataColumn[] = [
	{ column: "id", type: "uuid" },
	{ column: "name", type: "name" },
	{ column: "email", type: "email" },
	{ column: "age", type: "number", min: 18, max: 60 },
];

export const RandomDataGenerator = withPanelLayout(() => {
	const [columns, setColumns] = useState(defaultColumns);
	const [rows, setRows] = useState(10);
	const [output, setOutput] = useState("");

	const generate = () => {
		const generated = Array.from(
			{ length: Math.max(1, Math.min(10000, rows)) },
			() => {
				const row: Record<string, string> = {};
				for (const column of columns) {
					row[column.column] = generateValue(column);
				}
				return row;
			},
		);
		setOutput(JSON.stringify(generated, null, 2));
	};

	const updateColumn = (index: number, patch: Partial<IRandomDataColumn>) => {
		setColumns((items) =>
			items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
		);
	};

	const setRowsValue = (e: any) => {
		let val = Number(e.target.value);
		if (val > 1000) {
			val = 1000;
		}
		setRows(val);
	};

	return (
		<div className="dev-tool">
			<div className="dev-tool-toolbar">
				<label>Rows</label>
				<input
					type="number"
					min={1}
					max={1000}
					value={rows}
					onChange={setRowsValue}
				/>
				<div className="dev-tool-actions">
					<button
						type="button"
						onClick={() =>
							setColumns([
								...columns,
								{ column: `field${columns.length + 1}`, type: "name" },
							])
						}
					>
						Add Field
					</button>
				</div>
			</div>

			<div className="dev-tool-table-container">
				<table className="dev-tool-table">
					<thead>
						<tr>
							<th>Name</th>
							<th>Type</th>
							<th>Format</th>
							<th />
						</tr>
					</thead>
					<tbody>
						{columns.map((column, index) => (
							<tr key={index}>
								<td>
									<input
										value={column.column}
										onChange={(e) =>
											updateColumn(index, { column: e.target.value })
										}
									/>
								</td>
								<td>
									<select
										value={column.type}
										onChange={(e) =>
											updateColumn(index, { type: e.target.value })
										}
									>
										{[
											"name",
											"firstName",
											"lastName",
											"username",
											"password",
											"email",
											"phone",
											"uuid",
											"address",
											"city",
											"country",
											"date",
											"timestamp",
											"number",
											"float",
											"boolean",
											"company",
											"url",
											"ip",
											"color",
											"sentence",
											"paragraph",
											"creditcard",
											"regex",
										].map((type) => (
											<option key={type} value={type}>
												{type}
											</option>
										))}
									</select>
								</td>
								<td>
									<input
										value={column.format || ""}
										onChange={(e) =>
											updateColumn(index, { format: e.target.value })
										}
									/>
								</td>
								<td>
									<button
										type="button"
										onClick={() =>
											setColumns(columns.filter((_, i) => i !== index))
										}
									>
										Remove
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="dev-tool-actions">
				<button type="button" onClick={generate}>
					Generate
				</button>
			</div>
			<textarea value={output} readOnly />
			<div className="dev-tool-actions">
				<button type="button" onClick={() => copyText(output)}>
					Copy JSON
				</button>
			</div>
		</div>
	);
}, "🎲 Random Data Generator");
