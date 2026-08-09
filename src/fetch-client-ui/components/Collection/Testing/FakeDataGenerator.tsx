import "../style.css";
import "./style.css";
import {
	FakeDataSchemaFormat,
	IFakeDataColumn,
} from "../../../../fetch-client-core/utils/fakeDataService/fakeData.types";
import {
	FAKE_DATA_TYPES,
	MAX_FAKE_DATA_ROWS,
	parseFakeDataSchema,
} from "../../../../fetch-client-core/utils/fakeDataService/fakeDataSchemaParser";
import { generateFakeData } from "../../../../fetch-client-core/utils/fakeDataService/fakeDataGenerator";
import {
	exportFakeDataCSV,
	exportFakeDataJSON,
} from "../../../../fetch-client-core/utils/fakeDataService/fakeDataExport";
import { CsvSeparator } from "../../../../fetch-client-core/utils/dataDrivenTestService/dataDriven.types";
import { requestTypes, responseTypes } from "../../../../fetch-client-core/consts/requestTypes.consts";
import PanelLayout from "../../Common/Layout/panelLayout";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../../Common/vscodeAPI";

const FakeDataGenerator = () => {
	const [schemaFormat, setSchemaFormat] = useState<FakeDataSchemaFormat>("csv");
	const refSchemaFormat = useRef(schemaFormat);
	useEffect(() => {
		refSchemaFormat.current = schemaFormat;
	}, [schemaFormat]);

	const [csvSeparator, setCsvSeparator] = useState<CsvSeparator>(",");
	const refCsvSeparator = useRef(csvSeparator);
	useEffect(() => {
		refCsvSeparator.current = csvSeparator;
	}, [csvSeparator]);

	const [rawSchemaContent, setRawSchemaContent] = useState("");
	const refRawSchemaContent = useRef(rawSchemaContent);
	useEffect(() => {
		refRawSchemaContent.current = rawSchemaContent;
	}, [rawSchemaContent]);

	const [fileName, setFileName] = useState("");
	const [fileLoadError, setFileLoadError] = useState("");
	const [schemaColumns, setSchemaColumns] = useState<IFakeDataColumn[] | null>(null);
	const [schemaError, setSchemaError] = useState("");

	const [rowCount, setRowCount] = useState(10);

	const [columns, setColumns] = useState<string[]>([]);
	const [rows, setRows] = useState<Record<string, string>[]>([]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (!event.data) {
				return;
			}
			if (event.data.type === responseTypes.selectFileResponse) {
				const { path, fileData, error } = event.data as {
					path: string;
					fileData: string;
					error?: string;
				};
				if (error) {
					setFileLoadError(error);
					setFileName("");
					setRawSchemaContent("");
					setSchemaColumns(null);
					setSchemaError("");
					return;
				}
				if (!path || !fileData) {
					return;
				}
				setFileLoadError("");
				setFileName(path);
				setRawSchemaContent(fileData);
				const result = parseFakeDataSchema(
					fileData,
					refSchemaFormat.current,
					refCsvSeparator.current,
				);
				setSchemaColumns(result.error ? null : result.columns);
				setSchemaError(result.error ?? "");
				setColumns([]);
				setRows([]);
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	function reparseSchema(format: FakeDataSchemaFormat, sep: CsvSeparator) {
		const raw = refRawSchemaContent.current;
		if (!raw) {
			return;
		}
		const result = parseFakeDataSchema(raw, format, sep);
		setSchemaColumns(result.error ? null : result.columns);
		setSchemaError(result.error ?? "");
	}

	function onSchemaFormatChange(f: FakeDataSchemaFormat) {
		setSchemaFormat(f);
		refSchemaFormat.current = f;
		reparseSchema(f, refCsvSeparator.current);
	}

	function onSeparatorChange(s: CsvSeparator) {
		setCsvSeparator(s);
		refCsvSeparator.current = s;
		reparseSchema(refSchemaFormat.current, s);
	}

	function onBrowseFile() {
		vscode.postMessage({ type: requestTypes.selectFileRequest });
	}

	function onRowCountChange(v: string) {
		const parsed = Number(v);
		if (Number.isNaN(parsed)) {
			return;
		}
		setRowCount(Math.min(MAX_FAKE_DATA_ROWS, Math.max(1, Math.trunc(parsed))));
	}

	function onGenerate() {
		if (!schemaColumns || schemaColumns.length === 0) {
			return;
		}
		const result = generateFakeData(schemaColumns, rowCount);
		setColumns(result.columns);
		setRows(result.rows);
	}

	function onCellChange(rowIndex: number, column: string, value: string) {
		setRows((prev) => {
			const next = [...prev];
			next[rowIndex] = { ...next[rowIndex], [column]: value };
			return next;
		});
	}

	function onDownload(format: "csv" | "json") {
		const content =
			format === "csv"
				? exportFakeDataCSV(rows, columns, csvSeparator)
				: exportFakeDataJSON(rows);
		vscode.postMessage({
			type: requestTypes.exportData,
			format,
			data: content,
			name: "fake-data",
		});
	}

	const canGenerate = !!schemaColumns && schemaColumns.length > 0;
	const canDownload = rows.length > 0;

	const footer = (
		<div className="dd-footer-row">
			<button
				className="submit-button fake-gen-button"
				disabled={!canGenerate}
				onClick={onGenerate}
			>
				{rows.length > 0 ? "Regenerate" : "Generate"}
			</button>
			{canDownload && (
				<div className="runall-dropdown">
					<button className="submit-button reorder-btn run-all-button">
						Download
					</button>
					<div className="runall-dropdown-content">
						<a onClick={() => onDownload("csv")}>CSV</a>
						<a onClick={() => onDownload("json")}>JSON</a>
					</div>
				</div>
			)}
		</div>
	);

	return (
		<PanelLayout title="🧪 Fake Data Generator" footer={footer}>
			<div className="dd-setup-panel fake-panel">
				<div className="dd-settings-section">
					<div className="perf-settings-option">
						<label className="perf-settings-title">Schema Format</label>
						<input
							type="radio"							
							checked={schemaFormat === "csv"}
							onChange={() => onSchemaFormatChange("csv")}
						/>{" "}
						<span>CSV</span>
						<input
							type="radio"
							className="settings-option"
							checked={schemaFormat === "json"}
							onChange={() => onSchemaFormatChange("json")}
						/>{" "}
						<span>JSON</span>
					</div>
				</div>

				{schemaFormat === "csv" && (
					<div className="dd-settings-section">
						<div className="perf-settings-option">
							<label className="perf-settings-title">CSV Separator</label>
							<input
								type="radio"
								checked={csvSeparator === ","}
								onChange={() => onSeparatorChange(",")}
							/>{" "}
							<span>Comma ( , )</span>
							<input
								type="radio"
								className="settings-option"
								checked={csvSeparator === ";"}
								onChange={() => onSeparatorChange(";")}
							/>{" "}
							<span>Semicolon ( ; )</span>
							<input
								type="radio"
								className="settings-option"
								checked={csvSeparator === "\t"}
								onChange={() => onSeparatorChange("\t")}
							/>{" "}
							<span>Tab</span>
						</div>
					</div>
				)}

				<div className="dd-settings-section">
					<div className="perf-settings-delay-panel">
						<label className="perf-settings-title">Schema File</label>
						<button className="submit-button dd-browse-btn" onClick={onBrowseFile}>
							Browse
						</button>
						{fileName && (
							<span className="dd-file-name" title={fileName}>
								{fileName.split(/[\\/]/).pop()}
							</span>
						)}
						{fileLoadError && (
							<span className="dd-row-count dd-status-error">✗ {fileLoadError}</span>
						)}
						{schemaError && (
							<span className="dd-row-count dd-status-error">✗ {schemaError}</span>
						)}
						{schemaColumns && schemaColumns.length > 0 && (
							<span className="dd-row-count dd-status-ok">
								✓ {schemaColumns.length} column
								{schemaColumns.length !== 1 ? "s" : ""} detected
							</span>
						)}
					</div>
					{schemaColumns && schemaColumns.length > 0 && (
						<div className="dd-columns-preview">
							<span className="dd-columns-label">Columns: </span>
							{schemaColumns.map((c) => (
								<code key={c.column} className="dd-col-chip">
									{c.column}: {c.type}
								</code>
							))}
						</div>
					)}
				</div>

				<div className="dd-settings-section">
					<div className="perf-settings-option">
						<label className="perf-settings-title">Rows to generate</label>
						<input
							type="number"
							min={1}
							max={MAX_FAKE_DATA_ROWS}
							value={rowCount}
							onChange={(e) => onRowCountChange(e.target.value)}
							className="fd-row-count-input"
						/>
						<span className="dd-columns-label"> (max {MAX_FAKE_DATA_ROWS})</span>
					</div>
				</div>

				<div className="dd-notes-panel">
					<div className="dd-notes-title">Notes</div>
					<ul className="dd-notes-list">
						<li>
							Upload a schema file that defines each column and its fake data
							type. <strong>JSON</strong>: array of{" "}
							<code>{'{ "column", "type", ... }'}</code>. <strong>CSV</strong>:
							row 1 = column names, row 2 = type per column (e.g.{" "}
							<code>number:1-100</code>, <code>date:YYYY-MM-DD</code>,{" "}
							<code>phone:(###) ###-####</code>, <code>regex:^[A-Z]{"{3}"}$</code>
							).
						</li>
						<li>
							Supported types:{" "}
							{FAKE_DATA_TYPES.map((t) => (
								<code key={t} className="dd-col-chip">
									{t}
								</code>
							))}
						</li>
						<li>
							Generated data is editable in the preview table before download.
						</li>
						<li>
							Maximum <strong>{MAX_FAKE_DATA_ROWS} rows</strong> per generation.
						</li>
					</ul>
				</div>

				{rows.length > 0 && (
					<div className="dd-table-wrapper fd-preview-table-wrapper">
						<table className="dd-results-table">
							<thead>
								<tr>
									{columns.map((c) => (
										<th key={c}>{c}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{rows.map((row, i) => (
									<tr key={i}>
										{columns.map((c) => (
											<td key={c}>
												<input
													className="fd-cell-input"
													value={row[c] ?? ""}
													onChange={(e) => onCellChange(i, c, e.target.value)}
												/>
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</PanelLayout>
	);
};

export default FakeDataGenerator;
