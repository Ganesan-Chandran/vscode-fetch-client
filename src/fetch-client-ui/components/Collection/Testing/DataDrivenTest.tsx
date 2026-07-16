import "../style.css";
import "./style.css";
import {
	exportDataDrivenCSV,
	exportDataDrivenJson,
} from "../../../../fetch-client-core/utils/dataDrivenTestService/dataDrivenExport";
import {
	parseDataFile,
} from "../../../../fetch-client-core/utils/dataDrivenTestService/dataDrivenParser";
import {
	validateVariables,
} from "../../../../fetch-client-core/utils/dataDrivenTestService/dataDrivenVariables";
import {
	CsvSeparator,
	DataFileFormat,
	IDataDrivenConfig,
	IDataDrivenResult,
	IDataDrivenRowResult,
	IDataParseResult,
	IValidationResult,
} from "../../../../fetch-client-core/utils/dataDrivenTestService/dataDriven.types";
import { DataDrivenTestSettings } from "./DataDrivenTestSettings";
import { getMethodClassName } from "../../SideBar/util";
import { IRequestModel } from "../../../../fetch-client-core/types/request.types";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import PanelLayout from "../../Common/Layout/panelLayout";
import React, { useCallback, useEffect, useRef, useState } from "react";
import vscode from "../../Common/vscodeAPI";

const DataDrivenTest = () => {
	const [sourceColName, setSourceColName] = useState("");
	const [colId, setColId] = useState("");
	const [folderId, setFolderId] = useState("");
	const [varId, setVarId] = useState("");
	const [loading, setLoading] = useState(false);

	// Request list
	const [req, setReq] = useState<IRequestModel[]>([]);
	const refReq = useRef(req);
	useEffect(() => { refReq.current = req; }, [req]);

	const [selectedReq, setSelectedReq] = useState<boolean[]>([]);
	const refSelectedReq = useRef(selectedReq);
	useEffect(() => { refSelectedReq.current = selectedReq; }, [selectedReq]);

	// Data file
	const [fileFormat, setFileFormat] = useState<DataFileFormat>("csv");
	const refFileFormat = useRef(fileFormat);
	useEffect(() => { refFileFormat.current = fileFormat; }, [fileFormat]);

	const [csvSeparator, setCsvSeparator] = useState<CsvSeparator>(",");
	const refCsvSeparator = useRef(csvSeparator);
	useEffect(() => { refCsvSeparator.current = csvSeparator; }, [csvSeparator]);

	const [fileName, setFileName] = useState("");
	// FIX #1: Store raw file content so re-parsing on format/separator change doesn't need a new dialog
	const [rawFileContent, setRawFileContent] = useState("");
	const refRawFileContent = useRef(rawFileContent);
	useEffect(() => { refRawFileContent.current = rawFileContent; }, [rawFileContent]);

	const [parseResult, setParseResult] = useState<IDataParseResult | null>(null);
	const refParseResult = useRef(parseResult);
	useEffect(() => { refParseResult.current = parseResult; }, [parseResult]);

	// FIX #6: track file load error separately from parse errors
	const [fileLoadError, setFileLoadError] = useState("");

	// Config
	const [maxRows, setMaxRows] = useState(100);
	const [stopOnRowFailure, setStopOnRowFailure] = useState(false);

	// Validation
	const [validationResult, setValidationResult] = useState<IValidationResult | null>(null);

	// Execution
	const [running, setRunning] = useState(false);
	const refRunning = useRef(running);
	useEffect(() => { refRunning.current = running; }, [running]);

	const [done, setDone] = useState(false);
	const [cancelled, setCancelled] = useState(false);
	// FIX #4: track total expected rows for progress display
	const [expectedRowCount, setExpectedRowCount] = useState(0);

	// Results
	const [results, _setResults] = useState<IDataDrivenRowResult[]>([]);
	const refResults = useRef(results);
	const setResults = (data: IDataDrivenRowResult[]) => {
		refResults.current = data;
		_setResults(data);
	};
	const [finalResult, setFinalResult] = useState<IDataDrivenResult | null>(null);

	// UI
	const [selectedTab, setSelectedTab] = useState<"Setup" | "Results">("Setup");

	// ── Init ──────────────────────────────────────────────────────────────────
	useEffect(() => {
		const parts = document.title.split("@:@");
		const colIdVal = parts[1]?.trim();
		const folderIdVal = parts[2]?.trim();
		const nameVal = (parts[3] || "").trim();
		const varIdVal = parts[4]?.trim();

		setColId(colIdVal);
		setFolderId(folderIdVal);
		setSourceColName(nameVal);
		setVarId(varIdVal);

		const handleMessage = (event: MessageEvent) => {
			if (!event.data) { return; }

			if (event.data.type === responseTypes.getCollectionsByIdResponse) {
				const collections = event.data.collections as IRequestModel[];
				setReq(collections);
				setSelectedReq(collections.map(() => true));
				setLoading(false);
			} else if (event.data.type === responseTypes.selectFileResponse) {
				const { path, fileData, error } = event.data as { path: string; fileData: string; error?: string };
				// FIX #6: handle explicit load error from extension host
				if (error) {
					setFileLoadError(error);
					setFileName("");
					setRawFileContent("");
					setParseResult(null);
					setValidationResult(null);
					return;
				}
				if (!path || !fileData) {
					// Dialog was dismissed without selecting a file — do nothing
					return;
				}
				setFileLoadError("");
				setFileName(path);
				setRawFileContent(fileData);
				refRawFileContent.current = fileData;
				const result = parseDataFile(
					fileData,
					refFileFormat.current,
					refCsvSeparator.current,
				);
				setParseResult(result);
				setValidationResult(null);
			} else if (event.data.type === responseTypes.dataDrivenRowResultResponse) {
				const rowResult = event.data.data as IDataDrivenRowResult;
				setResults([...refResults.current, rowResult]);
			} else if (event.data.type === responseTypes.dataDrivenCompleteResponse) {
				if (event.data.data) {
					setFinalResult(event.data.data as IDataDrivenResult);
				}
				setRunning(false);
				// FIX #3: always mark done (even after cancel with partial results)
				setDone(true);
				setSelectedTab("Results");
			}
		};

		window.addEventListener("message", handleMessage);

		// Load requests for this collection/folder
		vscode.postMessage({
			type: requestTypes.getCollectionsByIdRequest,
			data: {
				colId: colIdVal,
				folderId: folderIdVal,
				type: nameVal.includes("\\") ? "fol" : "col",
			},
		});
		setLoading(true);

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// ── Helpers ───────────────────────────────────────────────────────────────
	const getSelectedRequests = () =>
		req.filter((_, i) => selectedReq[i]);

	const buildRequestMap = (): Map<string, IRequestModel> =>
		new Map<string, IRequestModel>(req.map((r) => [r.id, r]));

	const canRun = () =>
		!running &&
		!!parseResult &&
		!parseResult.error &&
		parseResult.rowCount > 0 &&
		getSelectedRequests().length > 0;

	// FIX #1/#2: re-parse stored content, never re-open dialog
	const reparseCurrentFile = useCallback((fmt: DataFileFormat, sep: CsvSeparator) => {
		const raw = refRawFileContent.current;
		if (!raw) { return; }
		const result = parseDataFile(raw, fmt, sep);
		setParseResult(result);
		setValidationResult(null);
	}, []);

	// ── Actions ───────────────────────────────────────────────────────────────
	function onBrowseFile() {
		vscode.postMessage({ type: requestTypes.selectFileRequest });
	}

	function onFileFormatChange(f: DataFileFormat) {
		setFileFormat(f);
		refFileFormat.current = f;
		// FIX #2: re-parse stored content instead of reopening dialog
		reparseCurrentFile(f, refCsvSeparator.current);
	}

	function onSeparatorChange(s: CsvSeparator) {
		setCsvSeparator(s);
		refCsvSeparator.current = s;
		// FIX #1: re-parse stored content with new separator
		reparseCurrentFile(refFileFormat.current, s);
	}

	function onValidate() {
		if (!parseResult || parseResult.error || parseResult.columns.length === 0) {
			return;
		}
		const selected = getSelectedRequests();
		if (selected.length === 0) {
			return;
		}
		const requestMap = buildRequestMap();
		const result = validateVariables(selected, requestMap, parseResult.columns);
		setValidationResult(result);
	}

	function onRun() {
		if (!canRun()) { return; }

		setResults([]);
		setFinalResult(null);
		setDone(false);
		setCancelled(false);
		setRunning(true);
		setSelectedTab("Results");

		const selected = getSelectedRequests();
		const limitedRows = parseResult.rows.slice(0, maxRows);
		// FIX #4: store expected total so progress indicator can show "X / Y"
		setExpectedRowCount(limitedRows.length);

		const config: IDataDrivenConfig = {
			fileFormat,
			csvSeparator,
			maxRows,
			stopOnRowFailure,
			selectedRequestIds: selected.map((r) => r.id),
		};

		vscode.postMessage({
			type: requestTypes.runDataDrivenRunRequest,
			data: {
				colId,
				folderId,
				varId,
				selectedRequestIds: selected.map((r) => r.id),
				// FIX #8: slice here only; runner should not slice again
				dataRows: limitedRows,
				config,
				testName: sourceColName,
			},
		});
	}

	function onCancel() {
		vscode.postMessage({ type: requestTypes.runDataDrivenCancelRequest });
		setRunning(false);
		setCancelled(true);
		// FIX #3: transition to done with partial results so export is available
		setDone(true);
	}

	function buildPartialResult(): IDataDrivenResult {
		const rows = refResults.current;
		const passed = rows.filter(
			(r) => !r.isError && (r.testTotal === 0 || r.testPassed === r.testTotal),
		).length;
		return {
			testName: sourceColName,
			startTime: "",
			endTime: "",
			totalRows: expectedRowCount,
			totalRequests: rows.length,
			passedRequests: passed,
			failedRequests: rows.length - passed,
			rows,
		};
	}

	function onExportJson() {
		// FIX #3: export partial results when cancelled
		const result = finalResult ?? buildPartialResult();
		const config: IDataDrivenConfig = {
			fileFormat,
			csvSeparator,
			maxRows,
			stopOnRowFailure,
			selectedRequestIds: getSelectedRequests().map((r) => r.id),
		};
		const json = exportDataDrivenJson(result, config, sourceColName);
		vscode.postMessage({
			type: requestTypes.exportRunTestJsonRequest,
			name: sourceColName,
			data: json,
		});
	}

	function onExportCSV() {
		// FIX #3: export partial results when cancelled
		const result = finalResult ?? buildPartialResult();
		const csv = exportDataDrivenCSV(result);
		vscode.postMessage({
			type: requestTypes.exportRunTestCSVRequest,
			name: sourceColName,
			data: csv,
		});
	}

	// ── Render helpers ────────────────────────────────────────────────────────
	function renderStatusBadge(status: number) {
		let cls = "dd-status-badge";
		if (status === 0) { cls += " dd-badge-error"; }
		else if (status < 300) { cls += " dd-badge-ok"; }
		else if (status < 400) { cls += " dd-badge-warn"; }
		else { cls += " dd-badge-error"; }
		return <span className={cls}>{status || "ERR"}</span>;
	}

	function renderPassBadge(r: IDataDrivenRowResult) {
		if (r.isError) {
			return <span className="dd-badge dd-badge-error">FAIL</span>;
		}
		if (r.testTotal === 0 || r.testPassed === r.testTotal) {
			return <span className="dd-badge dd-badge-ok">PASS</span>;
		}
		return <span className="dd-badge dd-badge-error">FAIL</span>;
	}

	function renderSetupTab() {
		return (
			<div className="dd-setup-panel">
				{/* Settings */}
				<DataDrivenTestSettings
					fileFormat={fileFormat}
					csvSeparator={csvSeparator}
					maxRows={maxRows}
					stopOnRowFailure={stopOnRowFailure}
					parseResult={parseResult}
					fileName={fileName}
					fileLoadError={fileLoadError}
					disabled={running}
					onFileFormatChange={onFileFormatChange}
					onSeparatorChange={onSeparatorChange}
					onMaxRowsChange={setMaxRows}
					onStopOnRowFailureChange={setStopOnRowFailure}
					onBrowseFile={onBrowseFile}
				/>

				{/* Request list */}
				{req.length > 0 && (
					<div className="dd-req-panel">
						<div className="dd-section-title">
							Requests
							<span className="dd-select-all-links">
								<button
									className="dd-link-btn"
									disabled={running}
									onClick={() => {
										setSelectedReq(req.map(() => true));
										setValidationResult(null);
									}}
								>
									Select All
								</button>
								<button
									className="dd-link-btn"
									disabled={running}
									onClick={() => {
										setSelectedReq(req.map(() => false));
										setValidationResult(null);
									}}
								>
									Deselect All
								</button>
							</span>
						</div>
						<div className="dd-req-list">
							{req.map((r, i) => (
								<label key={r.id} className="dd-req-item">
									<input
										type="checkbox"
										disabled={running}
										checked={selectedReq[i] ?? true}
										onChange={(e) => {
											const next = [...selectedReq];
											next[i] = e.target.checked;
											setSelectedReq(next);
											setValidationResult(null);
										}}
									/>
									<span
										className={
											"activity-method dd-req-method " +
											getMethodClassName(r.method.toUpperCase())
										}
									>
										{r.method.toUpperCase()}
									</span>
									<span className="dd-req-name" title={r.url}>
										{r.name || r.url}
									</span>
								</label>
							))}
						</div>
					</div>
				)}

				{/* Validation result */}
				{validationResult && (
					<div
						className={
							"dd-validation-panel " +
							(validationResult.valid ? "dd-validation-ok" : "dd-validation-fail")
						}
					>
						{validationResult.valid ? (
							<span>✓ All variables are present in the data file.</span>
						) : (
							<>
								<div>✗ Missing columns in data file:</div>
								<div className="dd-missing-vars">
									{validationResult.missingVars.map((v) => (
										<code key={v}>{`{{${v}}}`}</code>
									))}
								</div>
							</>
						)}
						{validationResult.presentVars.length > 0 && (
							<div className="dd-present-vars">
								<span>✓ Present: </span>
								{validationResult.presentVars.map((v) => (
									<code key={v}>{`{{${v}}}`}</code>
								))}
							</div>
						)}
					</div>
				)}

				{/* Notes */}
				<div className="dd-notes-panel">
					<div className="dd-notes-title">Notes &amp; Assumptions</div>
					<ul className="dd-notes-list">
						<li>Maximum <strong>100 data rows</strong> are supported per run.</li>
						<li>
							<strong>JSON format</strong>: supports a top-level array{" "}
							<code>{"[{...}]"}</code>, or an object with a{" "}
							<code>data</code> / <code>rows</code> key.
						</li>
						<li>
							Variables set by pre-requests (setvar) must have an <strong>empty
							column</strong> in your CSV / JSON — the runner will fill the value
							at runtime.
						</li>
						<li>
							Variables from the attached collection variable set are merged with
							the row data. <strong>Row data takes precedence.</strong>
						</li>
						<li>Requests run <strong>sequentially</strong> per row.</li>
						<li>
							Use <em>Validate</em> to check that all{" "}
							<code>{"{{variable}}"}</code> placeholders in selected requests are
							present in your data file before running.
						</li>
					</ul>
				</div>
			</div>
		);
	}

	function renderResultsTab() {
		if (running && results.length === 0) {
			return (
				<div className="dd-running-indicator">
					<div className="spinner loading" />
					<span>Running data-driven test…</span>
				</div>
			);
		}

		const passed = results.filter(
			(r) => !r.isError && (r.testTotal === 0 || r.testPassed === r.testTotal),
		).length;
		const failed = results.length - passed;
		// FIX #4: show progress counter; use finalResult.totalRows when available
		const totalRowsKnown = finalResult?.totalRows ?? expectedRowCount;

		return (
			<div className="dd-results-panel">
				{/* Summary */}
				<div className="dd-summary-row">
					<span className="dd-summary-item">
						Rows: <strong>{totalRowsKnown}</strong>
					</span>
					<span className="dd-summary-item">
						Requests: <strong>{results.length}</strong>
						{/* FIX #4: progress counter while running */}
						{running && expectedRowCount > 0 && (
							<span className="dd-progress-hint">
								{" "}(row {Math.ceil(results.length / Math.max(1, getSelectedRequests().length))} / {expectedRowCount})
							</span>
						)}
					</span>
					<span className="dd-summary-item dd-badge-ok">
						Passed: <strong>{passed}</strong>
					</span>
					<span className="dd-summary-item dd-badge-error">
						Failed: <strong>{failed}</strong>
					</span>
					{cancelled && (
						<span className="dd-summary-item dd-badge-warn">Cancelled</span>
					)}
					{running && (
						<span className="dd-summary-item">
							<span className="dd-running-dot" /> Running…
						</span>
					)}
				</div>

				{/* Results table */}
				<div className="dd-table-wrapper">
					<table className="dd-results-table">
						<thead>
							<tr>
								<th>Row</th>
								<th>Request</th>
								<th>Method</th>
								<th>Status</th>
								<th>Time (ms)</th>
								<th>Tests</th>
								<th>Result</th>
								<th>Error</th>
							</tr>
						</thead>
						<tbody>
							{results.map((r, i) => (
								<tr
									key={i}
									className={r.isError ? "dd-row-fail" : "dd-row-pass"}
								>
									<td>{r.rowIndex}</td>
									<td title={r.url}>{r.requestName}</td>
									<td>
										<span
											className={
												"activity-method " +
												getMethodClassName(r.method?.toUpperCase() ?? "GET")
											}
										>
											{r.method?.toUpperCase()}
										</span>
									</td>
									<td>{renderStatusBadge(r.status)}</td>
									<td>{r.duration}</td>
									<td>
										{r.testTotal > 0
											? `${r.testPassed}/${r.testTotal}`
											: "-"}
									</td>
									<td>{renderPassBadge(r)}</td>
									<td className="dd-error-cell" title={r.error}>
										{r.error ?? ""}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* FIX #3: show export when done OR cancelled with partial results */}
				{done && results.length > 0 && (
					<div className="dd-export-row">
						<button className="submit-button" onClick={onExportJson}>
							Export JSON
						</button>
						<button className="submit-button" onClick={onExportCSV}>
							Export CSV
						</button>
					</div>
				)}
			</div>
		);
	}

	// ── Main render ───────────────────────────────────────────────────────────
	const tabTitle = (
		<div className="dd-tab-bar">
			{(["Setup", "Results"] as const).map((tab) => (
				<button
					key={tab}
					className={
						"dd-tab-btn" +
						(selectedTab === tab ? " dd-tab-btn-active" : "")
					}
					onClick={() => setSelectedTab(tab)}
				>
					{tab}
				</button>
			))}
		</div>
	);

	const footer = (
		<div className="dd-footer-row">
			{selectedTab === "Setup" && (
				<>
					<button
						className="submit-button"
						disabled={!parseResult || !!parseResult.error || getSelectedRequests().length === 0 || running}
						onClick={onValidate}
					>
						Validate
					</button>
					<button
						className="submit-button"
						disabled={!canRun()}
						onClick={onRun}
					>
						Run
					</button>
				</>
			)}
			{running && (
				<button className="cancel-button" onClick={onCancel}>
					Cancel
				</button>
			)}
		</div>
	);

	return (
		<PanelLayout
			title={
				<div className="dd-header">
					<span>Data-Driven Test — {sourceColName}</span>
				</div>
			}
			loading={loading}
			footer={footer}
		>
			{tabTitle}
			{selectedTab === "Setup" ? renderSetupTab() : renderResultsTab()}
		</PanelLayout>
	);
};

export default DataDrivenTest;
