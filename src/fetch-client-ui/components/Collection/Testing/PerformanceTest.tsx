import "../style.css";
import "./style.css";
import {
	computeEndpointBreakdown,
	computeMetrics,
	exportPerfCSV,
	exportPerfHtml,
	exportPerfJson,
	exportPerfXml,
} from "../../../../fetch-client-core/utils/performanceTestService/perfHelper";
import { getMethodClassName } from "../../SideBar/util";
import { IPerfConfig, IPerfResultPoint } from "../../../../fetch-client-core/types/perfTest.types";
import { IRequestModel } from "../../../../fetch-client-core/types/request.types";
import { IVariable } from "../../../../fetch-client-core/types/sidebar.types";
import { PerformanceTestSettings } from "./PerformanceTestSettings";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import { ResponseTimeChart } from "./ResponseTimeChart";
import { shouldStopTest, computeVUsForWave } from "../../../../fetch-client-core/utils/performanceTestService/perfEngine";
import PanelLayout from "../../Common/Layout/panelLayout";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../../Common/vscodeAPI";

const DEFAULT_CONFIG: IPerfConfig = {
	scope: "collection",
	loadModel: "fixed",
	targetVUs: 5,
	iterations: 10,
	testDurationSec: 30,
	rampUpDurationSec: 20,
	rampSteps: 5,
	thinkTimeMs: 0,
};

const PerformanceTest = () => {
	const [sourceColName, setSourceColName] = useState("");
	const refColIdState = useRef("");
	const refItemPaths = useRef<any>(null);
	const [loading, setLoading] = useState(false);

	const [req, setReq] = useState<IRequestModel[]>([]);
	const refReq = useRef(req);
	useEffect(() => {
		refReq.current = req;
	}, [req]);

	const [selectedVariable, setSelectedVariable] = useState<IVariable>();
	const refSelectedVariable = useRef(selectedVariable);
	useEffect(() => {
		refSelectedVariable.current = selectedVariable;
	}, [selectedVariable]);

	const [selectedReq, setSelectedReq] = useState<boolean[]>([]);
	const refSelectedReq = useRef(selectedReq);
	useEffect(() => {
		refSelectedReq.current = selectedReq;
	}, [selectedReq]);

	const [singleReqId, setSingleReqId] = useState<string>("");
	const refSingleReqId = useRef(singleReqId);
	useEffect(() => {
		refSingleReqId.current = singleReqId;
	}, [singleReqId]);

	const [config, _setConfig] = useState<IPerfConfig>(DEFAULT_CONFIG);
	const refConfig = useRef(config);
	const setConfig = (patch: Partial<IPerfConfig>) => {
		const updated = { ...refConfig.current, ...patch };
		refConfig.current = updated;
		_setConfig(updated);
	};

	const [selectedTab, setSelectedTab] = useState("Setup");
	const [resultTab, setResultTab] = useState<"Overall" | "Request Breakdown">("Overall");
	const [running, setRunning] = useState(false);
	const [done, setDone] = useState(false);
	const [cancelled, setCancelled] = useState(false);
	const [currentVUs, setCurrentVUs] = useState(0);
	const [elapsedDisplay, setElapsedDisplay] = useState(0);

	const [results, _setResults] = useState<IPerfResultPoint[]>([]);
	const refResults = useRef<IPerfResultPoint[]>([]);
	const setResults = (data: IPerfResultPoint[]) => {
		refResults.current = data;
		_setResults(data);
	};

	const refRunning = useRef(false);
	const refWaveIndex = useRef(0);
	const refTestStartTime = useRef(0);
	const refPendingWave = useRef<{ wave: number; reqData: IRequestModel[] }>(
		null,
	);
	const refTicker = useRef<any>(null);

	useEffect(() => {
		const parts = document.title.split("@:@");
		const colIdVal = parts[1]?.trim();
		const folderIdVal = parts[2]?.trim();
		const name = (parts[3] || "").trim();
		const varIdVal = parts[4]?.trim();
		const reqIdVal = parts[5]?.trim();

		setSourceColName(name);
		refColIdState.current = colIdVal;

		if (reqIdVal) {
			setSingleReqId(reqIdVal);
			setConfig({ scope: "single" });
		}

		const handleMessage = (event: MessageEvent) => {
			if (
				event.data &&
				event.data.type === responseTypes.getCollectionsByIdResponse
			) {
				setReq(event.data.collections as IRequestModel[]);
				refItemPaths.current = event.data.paths;
				setLoading(false);
			} else if (
				event.data &&
				event.data.type === responseTypes.getVariableItemResponse
			) {
				setSelectedVariable(event.data.data[0] as IVariable);
			} else if (
				event.data &&
				event.data.type === responseTypes.multipleApiResponse
			) {
				onWaveResponse(event.data);
			}
		};

		window.addEventListener("message", handleMessage);
		vscode.postMessage({
			type: requestTypes.getVariableItemRequest,
			data: { id: varIdVal, isGlobal: varIdVal ? false : true },
		});
		vscode.postMessage({
			type: requestTypes.getCollectionsByIdRequest,
			data: {
				colId: colIdVal,
				folderId: folderIdVal,
				type: name.includes("\\") ? "fol" : "col",
			},
		});
		setLoading(true);

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	useEffect(() => {
		if (req && req.length > 0 && selectedReq.length === 0) {
			setSelectedReq(req.map(() => true));
			if (!singleReqId) {
				setSingleReqId(req[0].id);
			}
		}
	}, [req]);

	// ---------- selection helpers (mirrors RunAll's getAllSelectedRequest) ----------

	// Reads from refs (not state) because this runs from fireNextWave/onWaveResponse, which are
	// ultimately triggered by the single stable `message` listener registered on mount. Reading
	// state directly here would close over whatever values existed at mount time.
	function getSelectedForWave(): {
		baseList: IRequestModel[];
		basePaths: any[];
	} {
		const currentReq = refReq.current;
		const currentPaths = refItemPaths.current;

		if (refConfig.current.scope === "single") {
			const idx = currentReq.findIndex((r) => r.id === refSingleReqId.current);
			if (idx === -1) {
				return { baseList: [], basePaths: [] };
			}
			return {
				baseList: [currentReq[idx]],
				basePaths: [currentPaths ? currentPaths[idx] : null],
			};
		}

		const baseList: IRequestModel[] = [];
		const basePaths: any[] = [];
		for (let i = 0; i < currentReq.length; i++) {
			if (refSelectedReq.current[i]) {
				baseList.push(currentReq[i]);
				basePaths.push(currentPaths ? currentPaths[i] : null);
			}
		}
		return { baseList, basePaths };
	}

	function buildWavePayload(vus: number) {
		const { baseList, basePaths } = getSelectedForWave();
		const reqData: IRequestModel[] = [];
		const paths: any[] = [];
		for (let v = 0; v < vus; v++) {
			baseList.forEach((r, idx) => {
				reqData.push(JSON.parse(JSON.stringify(r)));
				paths.push(basePaths[idx]);
			});
		}
		return { reqData, paths };
	}

	function isDisabled(): boolean {
		if (config.scope === "single") {
			return !singleReqId;
		}
		return !selectedReq || selectedReq.filter((v) => v === true).length === 0;
	}

	// ---------- run engine ----------

	function onStartClick() {
		setResults([]);
		refWaveIndex.current = 0;
		refTestStartTime.current = Date.now();
		refRunning.current = true;
		setRunning(true);
		setDone(false);
		setCancelled(false);
		setSelectedTab("Results");
		setResultTab("Overall");

		refTicker.current = setInterval(() => {
			setElapsedDisplay(Date.now() - refTestStartTime.current);
		}, 500);

		fireNextWave();
	}

	function onCancelClick() {
		refRunning.current = false;
		setRunning(false);
		setDone(true);
		setCancelled(true);
		if (refTicker.current) {
			clearInterval(refTicker.current);
		}
	}

	function finishTest() {
		refRunning.current = false;
		setRunning(false);
		setDone(true);
		if (refTicker.current) {
			clearInterval(refTicker.current);
		}
	}

	function fireNextWave() {
		if (!refRunning.current) {
			return;
		}

		const cfg = refConfig.current;
		const elapsedMs = Date.now() - refTestStartTime.current;
		const rampUpMs = cfg.rampUpDurationSec * 1000;
		const testDurationMs = cfg.testDurationSec * 1000;

		if (
			shouldStopTest(
				cfg.loadModel,
				refWaveIndex.current,
				elapsedMs,
				cfg.iterations,
				testDurationMs,
				rampUpMs,
			)
		) {
			finishTest();
			return;
		}

		const vus = computeVUsForWave(
			cfg.loadModel,
			cfg.targetVUs,
			elapsedMs,
			rampUpMs,
			cfg.rampSteps,
		);
		setCurrentVUs(vus);

		const { reqData, paths } = buildWavePayload(vus);
		if (reqData.length === 0) {
			finishTest();
			return;
		}

		refPendingWave.current = { wave: refWaveIndex.current, reqData };
		vscode.postMessage({
			type: requestTypes.multipleApiRequest,
			data: {
				reqData,
				variableData: refSelectedVariable.current
					? refSelectedVariable.current.data
					: null,
				colId: refColIdState.current,
				itemPaths: paths,
			},
		});
	}

	function onWaveResponse(data: any) {
		if (!data.output || data.output.length === 0 || !refPendingWave.current) {
			return;
		}

		const meta = refPendingWave.current;
		const timestampBase = Date.now() - refTestStartTime.current;

		const waveResults: IPerfResultPoint[] = data.output.map(
			(item: any, i: number) => {
				const reqItem = meta.reqData[i];
				const resp = item?.value?.response;
				return {
					wave: meta.wave,
					vuIndex: i,
					requestId: reqItem?.id ?? "unknown",
					requestName: reqItem?.name ?? "unknown",
					url: reqItem?.url ?? "unknown",
					method: reqItem?.method ?? "unknown",
					status: resp?.status ?? 0,
					statusText: resp?.statusText ?? "",
					duration: resp?.isError ? 0 : (resp?.duration ?? 0),
					isError: !!resp?.isError,
					timestamp: timestampBase,
				};
			},
		);

		setResults([...refResults.current, ...waveResults]);
		refWaveIndex.current += 1;

		if (!refRunning.current) {
			return; // cancelled while this wave was in flight
		}

		setTimeout(fireNextWave, refConfig.current.thinkTimeMs);
	}

	// ---------- export ----------

	function onExportJson(e: any) {
		e.preventDefault();
		const elapsedSec = elapsedDisplay / 1000;
		const metrics = computeMetrics(results, elapsedSec);
		const breakdown = computeEndpointBreakdown(results, elapsedSec);
		const data = exportPerfJson(
			config,
			results,
			metrics,
			breakdown,
			sourceColName,
		);
		vscode.postMessage({
			type: requestTypes.exportRunTestJsonRequest,
			data,
			name: `${sourceColName}-perf`,
		});
	}

	function onExportCSV(e: any) {
		e.preventDefault();
		const elapsedSec = elapsedDisplay / 1000;
		const metrics = computeMetrics(results, elapsedSec);
		const breakdown = computeEndpointBreakdown(results, elapsedSec);
		const data = exportPerfCSV(metrics, breakdown, sourceColName);
		vscode.postMessage({
			type: requestTypes.exportRunTestCSVRequest,
			data,
			name: `${sourceColName}-perf`,
		});
	}

	function onExportHtml(e: any) {
		e.preventDefault();
		const elapsedSec = elapsedDisplay / 1000;
		const metrics = computeMetrics(results, elapsedSec);
		const breakdown = computeEndpointBreakdown(results, elapsedSec);
		const data = exportPerfHtml(config, results, metrics, breakdown, sourceColName);
		vscode.postMessage({
			type: requestTypes.exportData,
			format: "html",
			data: data,
			name: `${sourceColName}-perf`,
		});
	}

	function onExportXml(e: any) {
		e.preventDefault();
		const elapsedSec = elapsedDisplay / 1000;
		const metrics = computeMetrics(results, elapsedSec);
		const breakdown = computeEndpointBreakdown(results, elapsedSec);
		const data = exportPerfXml(config, results, metrics, breakdown, sourceColName);
		vscode.postMessage({
			type: requestTypes.exportData,
			format: "xml",
			data: data,
			name: `${sourceColName}-runall`,
		});
	}

	// ---------- selection UI handlers ----------

	function onSelectChange(index: number) {
		const local = [...selectedReq];
		local[index] = !local[index];
		setSelectedReq(local);
	}

	// ---------- render ----------

	function renderHeader() {
		return (
			<>
				<div className="runall-col-name">
					<span className="addto-label">
						{sourceColName.includes("\\")
							? "Collection \\ Folder :"
							: "Collection :"}
					</span>
					<span className="addto-label">{sourceColName}</span>
					<span className="addto-label">Attached Variable :</span>
					<span className="addto-label">{selectedVariable?.name ?? "-"}</span>
				</div>
				<div>
					{["Setup", "Results"].map((tab) => (
						<button
							key={tab}
							className={selectedTab === tab ? "tab-menu selected" : "tab-menu"}
							onClick={() => setSelectedTab(tab)}
						>
							{tab}
						</button>
					))}
				</div>
			</>
		);
	}

	function renderScopeSelector() {
		if (config.scope === "single") {
			return (
				<div className="perf-settings-delay-panel">
					<label className="perf-settings-label">Request</label>
					<select
						className="runall-order-select perf-single-select"
						disabled={running}
						value={singleReqId}
						onChange={(e) => setSingleReqId(e.target.value)}
					>
						{req.map((r) => (
							<option key={r.id} value={r.id}>
								{r.method.toUpperCase()} - {r.name}
							</option>
						))}
					</select>
				</div>
			);
		}

		return (
			<div className="perf-tbl-panel">
				<table className="runall-tbl center" cellPadding={0} cellSpacing={0}>
					<thead>
						<tr>
							<th className="runall-col-0"></th>
							<th className="runall-col-1">Method</th>
							<th className="runall-col-2">Name</th>
						</tr>
					</thead>
					<tbody>
						{req.map((item, index) => (
							<tr
								key={item.id}
								className={
									selectedReq[index] ? "runall-enabled" : "runall-disabled"
								}
							>
								<td className="runall-col-1">
									<input
										type="checkbox"
										disabled={running}
										checked={
											selectedReq[index] !== undefined
												? selectedReq[index]
												: true
										}
										onChange={() => onSelectChange(index)}
									/>
								</td>
								<td className="runall-col-1">
									<span
										className={
											"runall-method-label " +
											getMethodClassName(
												item.method.toUpperCase(),
												selectedReq[index],
											)
										}
									>
										{item.method.toUpperCase()}
									</span>
								</td>
								<td className="runall-col-2">
									<span className="runall-label">{item.name}</span>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		);
	}

	function renderSetup() {
		return (
			<div className="perf-setup-panel">
				<PerformanceTestSettings
					config={config}
					disabled={running}
					onChange={setConfig}
				/>
				<label className="max-req">
					* Collection and folder pre-requests are not executed during
					performance tests
				</label>
				{renderScopeSelector()}
			</div>
		);
	}

	const progress = (() => {
		if (!running && !done) {
			return 0;
		}
		if (config.loadModel === "fixed") {
			return Math.min(
				100,
				(refWaveIndex.current / config.iterations) * 100,
			);
		}
		return Math.min(
			100,
			(elapsedDisplay / (config.testDurationSec * 1000)) * 100,
		);
	})();

	function renderResultTabs() {
		return (
			<div className="perf-result-tabs">
				{["Overall", "Request Breakdown"].map((tab) => (
					<button
						key={tab}
						className={
							resultTab === tab
								? "tab-menu selected"
								: "tab-menu"
						}
						onClick={() =>
							setResultTab(tab as "Overall" | "Request Breakdown")
						}
					>
						{tab}
					</button>
				))}
			</div>
		);
	}

	function renderResults() {
		const elapsedSec = elapsedDisplay / 1000;
		const metrics = computeMetrics(results, elapsedSec);
		const breakdown = computeEndpointBreakdown(results, elapsedSec);
		const showBreakdown = breakdown.length > 1;
		const showOverall = resultTab === "Overall";
		const showRequestBreakdown = resultTab === "Request Breakdown";

		return (
			<div className="perf-results-panel">
				{renderResultTabs()}
				{showOverall && (
					<>
						<div
							className={
								running
									? "perf-status-banner running"
									: done
										? cancelled
											? "perf-status-banner cancelled"
											: "perf-status-banner completed"
										: "perf-status-banner idle"
							}
						>
							<div className="perf-status-left">
								<span className="perf-status-icon">
									{running
										? "⏳"
										: done
											? cancelled
												? "🟠"
												: "✅"
											: "⚪"}
								</span>

								<div>
									<div className="perf-status-title">
										{running
											? "Performance Test Running..."
											: done
												? cancelled
													? "Performance Test Cancelled"
													: "Performance Test Completed"
												: "Performance Test Not Started"}
									</div>

									<div className="perf-status-subtitle">
										Virtual Users : {currentVUs}
										&nbsp;&nbsp;|&nbsp;&nbsp;
										Elapsed : {elapsedSec.toFixed(1)} sec
										{running && (
											<>
												&nbsp;&nbsp;|&nbsp;&nbsp;
												Wave : {refWaveIndex.current + 1}
											</>
										)}
									</div>
								</div>
							</div>

							{(running || done) && (
								<div className="perf-progress">
									<div
										className="perf-progress-fill"
										style={{ width: `${progress}%` }}
									/>
								</div>
							)}
						</div>

						<div className="perf-cards-grid">
							<div className="perf-card">
								<label>Processed Requests</label>
								<span>{metrics.total}</span>
							</div>
							<div className="perf-card">
								<label>Current Wave</label>
								<span>{refWaveIndex.current}</span>
							</div>
							<div className="perf-card">
								<label>Active VUs</label>
								<span>{currentVUs}</span>
							</div>
							<div className="perf-card perf-card-success">
								<label>Success</label>
								<span>{metrics.success}</span>
							</div>
							<div className="perf-card perf-card-error">
								<label>Failed</label>
								<span>{metrics.failed}</span>
							</div>
							<div className="perf-card">
								<label>Error Rate</label>
								<span>{metrics.errorRate.toFixed(1)}%</span>
							</div>
							<div className="perf-card">
								<label>Avg</label>
								<span>{metrics.avg.toFixed(0)} ms</span>
							</div>
							<div className="perf-card">
								<label>P95</label>
								<span>{metrics.p95.toFixed(0)} ms</span>
							</div>
							<div className="perf-card">
								<label>P99</label>
								<span>{metrics.p99.toFixed(0)} ms</span>
							</div>
							<div className="perf-card">
								<label>Throughput</label>
								<span>{metrics.rps.toFixed(1)} req/s</span>
							</div>
						</div>

						<div className="perf-chart-container">
							<label className="perf-settings-title">Response Time Trend</label>
							<ResponseTimeChart points={results.map((r) => r.duration)} />
						</div>
					</>
				)}
				{showRequestBreakdown && showBreakdown && (
					<div className="perf-tbl-panel">
						<label className="perf-settings-title">Breakdown by Request</label>
						<table
							className="runall-tbl req-breakdown-tbl center"
							cellPadding={0}
							cellSpacing={0}
						>
							<thead>
								<tr>
									<th className="runall-col-2">Request</th>
									<th className="runall-col-1">Total</th>
									<th className="runall-col-1">Errors</th>
									<th className="runall-col-1">Avg</th>
									<th className="runall-col-1">P95</th>
									<th className="runall-col-1">RPS</th>
								</tr>
							</thead>
							<tbody>
								{breakdown.map((b) => (
									<tr key={b.requestId}>
										<td className="runall-col-2">
											<span className="runall-label">{b.requestName}</span>
										</td>
										<td className="runall-col-1">{b.total}</td>
										<td className="runall-col-1">{b.failed}</td>
										<td className="runall-col-1">{b.avg.toFixed(0)} ms</td>
										<td className="runall-col-1">{b.p95.toFixed(0)} ms</td>
										<td className="runall-col-1">{b.rps.toFixed(1)}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		);
	}

	function renderBody() {
		return (
			<div className="runall-tab-items-panel">
				{selectedTab === "Setup" ? renderSetup() : renderResults()}
			</div>
		);
	}

	function renderFooter() {
		return (
			<div className="runall-btn-panel">
				<button
					type="button"
					className="submit-button reorder-btn run-all-button"
					onClick={onStartClick}
					disabled={running || isDisabled()}
				>
					{running ? "⏳ Running..." : "Start Test"}
				</button>
				<button
					type="button"
					className="submit-button reorder-btn run-all-button"
					onClick={onCancelClick}
					disabled={!running}
				>
					{running ? "Stop Test" : "Stop"}
				</button>
				<div className="runall-dropdown">
					<button
						className="submit-button reorder-btn run-all-button"
						disabled={!done || results.length === 0}
					>
						Export
					</button>
					{done && results.length > 0 && (
						<div className="runall-dropdown-content">
							<a onClick={onExportJson}>JSON</a>
							<a onClick={onExportCSV}>CSV</a>
							<a onClick={onExportHtml}>HTML</a>
							<a onClick={onExportXml}>XML</a>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<PanelLayout
			title="⚡ Performance Test"
			loading={loading}
			header={renderHeader()}
			footer={renderFooter()}
		>
			{renderBody()}
		</PanelLayout>
	);
};

export default PerformanceTest;
