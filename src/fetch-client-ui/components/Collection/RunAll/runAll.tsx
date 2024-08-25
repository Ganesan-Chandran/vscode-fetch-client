import React, { useEffect, useRef, useState } from "react";
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import vscode from "../../Common/vscodeAPI";
import { IRequestModel } from "../../RequestUI/redux/types";
import { GetResponseTime } from "../../ResponseUI/OptionsPanel/OptionTab/util";
import { IReponseModel } from "../../ResponseUI/redux/types";
import { ISettings, IVariable } from "../../SideBar/redux/types";
import { getMethodClassName } from "../../SideBar/util";
import { executeTests, setVariable } from "../../TestUI/TestPanel/helper";
import "../style.css";
import { exportCSV, exportJson } from "./helper";
import { RunAllSettings } from "./runAllSettings";

const RunAll = () => {

	const [sourceColName, setSourceColName] = useState("");
	const [processing, setProcessing] = useState(false);
	const [start, setStart] = useState(false);
	const [done, setDone] = useState(false);
	const [varId, setVarId] = useState("");
	const [colId, setColId] = useState("");
	const [folderId, setFolderId] = useState("");
	const [itemPaths, setItemPaths] = useState(null);

	const [loading, _setLoading] = useState(false);
	const refLoading = useRef(loading);
	const setLoading = (data: boolean) => {
		refLoading.current = data;
		_setLoading(refLoading.current);
	};

	const [req, _setReq] = useState<IRequestModel[]>([]);
	const refReq = useRef(req);
	const setReq = (data: IRequestModel[]) => {
		refReq.current = data;
		_setReq(refReq.current);
	};

	const [parentSettings, _setParentSettings] = useState<ISettings>();
	const refParentSettings = useRef(parentSettings);
	const setParentSettings = (data: ISettings) => {
		refParentSettings.current = data;
		_setParentSettings(refParentSettings.current);
	};

	const [selectedVariable, _setSelectedVariable] = useState<IVariable>();
	const refSelectedVariable = useRef(selectedVariable);
	const setSelectedVariable = (data: IVariable) => {
		refSelectedVariable.current = data;
		_setSelectedVariable(refSelectedVariable.current);
	};

	const [curIndex, _setCurIndex] = useState(0);
	const refCurIndex = useRef(curIndex);
	const setCurIndex = (data: number) => {
		refCurIndex.current = data;
		_setCurIndex(refCurIndex.current);
	};

	const [res, _setRes] = useState<IReponseModel[][]>([[]]);
	const refRes = useRef(res);
	const setRes = (data: IReponseModel[][]) => {
		refRes.current = data;
		_setRes(refRes.current);
	};

	const [selectedReq, _setSelectedReq] = useState<boolean[]>([]);
	const refSelectedReq = useRef(selectedReq);
	const setSelectedReq = (data: boolean[]) => {
		refSelectedReq.current = data;
		_setSelectedReq(refSelectedReq.current);
	};

	const [selectedTab, setSelectedTab] = useState("Runner");
	const [selectedOption, setSelectedOption] = useState(1);

	const [totalIteration, setTotalIteration] = useState(1);
	const [requestDelay, setRequsetDelay] = useState(0);
	const [iterationDelay, setIterationDelay] = useState(0);

	const [processIteration, _setProcessIteration] = useState(0);
	const refProcessIteration = useRef(processIteration);
	const setProcessIteration = (data: number) => {
		refProcessIteration.current = data;
		_setProcessIteration(refProcessIteration.current);
	};

	const [selectedIteration, setSelectedIteration] = useState(0);

	const [cancelled, setCancelled] = useState(false);

	useEffect(() => {
		const colId = document.title.split("@:@")[1];
		const folderId = document.title.split("@:@")[2];
		const name = document.title.split("@:@")[3];
		const varId = document.title.split("@:@")[4];

		setSourceColName(name.trim());
		setVarId(varId?.trim());
		setFolderId(folderId?.trim());
		setColId(colId?.trim());

		window.addEventListener("message", (event) => {
			if (event.data && event.data.type === responseTypes.getCollectionsByIdResponse) {
				setReq((event.data.collections as IRequestModel[]));
				setItemPaths(event.data.paths);
			} else if (event.data && event.data.type === responseTypes.apiResponse) {
				setResponse(event.data);
				setProcessing(false);
			} else if (event.data && event.data.type === responseTypes.getVariableItemResponse) {
				setSelectedVariable(event.data.data[0] as IVariable);
			} else if (event.data && event.data.type === responseTypes.multipleApiResponse) {
				if (event.data.output && event.data.output.length > 0) {
					event.data.output.forEach((item, index: number) => {
						let enabledIndex: number;
						if (index === 0) {
							enabledIndex = refSelectedReq.current.findIndex(item => item === true);
						} else {
							enabledIndex = getNextIndex(refCurIndex.current, refSelectedReq.current);
						}

						setCurIndex(enabledIndex);
						setResponse(item.value);
					});
					setProcessing(false);
				}
			} else if (event.data && event.data.type === responseTypes.getParentSettingsResponse) {
				setParentSettings(event.data.settings as ISettings);
				setLoading(false);
			}
		});

		vscode.postMessage({ type: requestTypes.getVariableItemRequest, data: { id: varId, isGlobal: varId ? false : true } });
		vscode.postMessage({ type: requestTypes.getCollectionsByIdRequest, data: { colId: colId, folderId: folderId, type: name.trim().includes("\\") ? "fol" : "col" } });
		setLoading(true);
	}, []);

	function setResponse(data: any) {
		let local = [...refRes.current];
		let newRes: IReponseModel = {
			response: data.response,
			headers: data.headers,
			cookies: data.cookies
		};
		if (refReq.current[refCurIndex.current].tests.length - 1 > 0) {
			newRes.testResults = executeTests(refReq.current[refCurIndex.current].tests, newRes, refSelectedVariable.current.data);
		} else {
			newRes.testResults = [];
		}

		if (refReq.current[refCurIndex.current].setvar.length - 1 > 0) {
			let variable = setVariable(refSelectedVariable.current, refReq.current[refCurIndex.current].setvar, newRes);
			setSelectedVariable(variable);
		}

		if (!local[refProcessIteration.current]) {
			local.push([]);
		}

		local[refProcessIteration.current][refCurIndex.current] = newRes;

		if (refCurIndex.current === refReq.current.length - 1) {
			vscode.postMessage({ type: requestTypes.updateVariableRequest, data: refSelectedVariable.current });
		}
		setRes(local);
	}

	function onSubmitClick() {
		setStart(true);
		setProcessing(true);
		if (selectedOption === 1) {
			sequentialRun();
		} else {
			parallelRun();
		}
	}

	function onCancelClick() {
		setProcessing(false);
		setStart(false);
		setDone(true);
		setCancelled(true);
	}

	function sequentialRun() {
		let enabledIndex = selectedReq.findIndex(item => item === true);
		if (enabledIndex !== -1) {
			setCurIndex(enabledIndex);
			let id = itemPaths[req[enabledIndex].id].split(";")[1];
			if (id === colId) {
				id = "";
			}
			setProcessing(true);
			vscode.postMessage({ type: requestTypes.apiRequest, data: { settings: parentSettings, reqData: req[enabledIndex], variableData: selectedVariable, colId: colId, folderId: id } });
		}
	}

	function parallelRun() {
		const { selectedRequest, selectedPaths } = getAllSelectedRequest();
		vscode.postMessage({ type: requestTypes.multipleApiRequest, data: { reqData: selectedRequest, variableData: selectedVariable ? selectedVariable.data : null, colId: colId, itemPaths: selectedPaths } });
	}

	function getAllSelectedRequest(): { selectedRequest: IRequestModel[], selectedPaths: any[] } {
		let enabledIndex = selectedReq.findIndex(item => item === true);
		if (enabledIndex === -1) {
			return null;
		}

		let selectedRequest: IRequestModel[] = [];
		let selectedPaths = [];
		for (let i = 0; i < selectedReq.length; i++) {
			if (selectedReq[i]) {
				selectedRequest.push(req[i]);
				selectedPaths.push(itemPaths[i]);
			}
		}

		return { selectedRequest: selectedRequest, selectedPaths: selectedPaths };
	}

	function getNextIndex(currentInex: number, selectedReq: boolean[]) {
		for (let i = currentInex + 1; i < selectedReq.length; i++) {
			if (selectedReq[i]) {
				return i;
			}
		}

		return -1;
	}

	function nextParallelCall() {
		const { selectedRequest, selectedPaths } = getAllSelectedRequest();
		setProcessing(true);
		setProcessIteration(processIteration + 1);
		vscode.postMessage({ type: requestTypes.multipleApiRequest, data: { reqData: selectedRequest, variableData: selectedVariable ? selectedVariable.data : null, colId: colId, itemPaths: selectedPaths } });
	}

	useEffect(() => {
		if (!start) {
			return;
		}

		if (selectedOption === 2) {
			if (res[processIteration].length === req.length && (processIteration + 1) < totalIteration) {
				setTimeout(nextParallelCall, iterationDelay);
			}

			if ((processIteration + 1) >= totalIteration) {
				setStart(false);
				setDone(true);
			}

			return;
		} else {
			if (res[processIteration].length - 1 === curIndex) {
				if (req.length - 1 > curIndex) {
					let enabledIndex = getNextIndex(curIndex, selectedReq);
					if (enabledIndex !== -1) {
						let id = itemPaths[req[enabledIndex].id].split(";")[1];
						if (id === colId) {
							id = "";
						}
						setTimeout(() => {
							setProcessing(true);
							vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: req[enabledIndex], variableData: selectedVariable, colId: colId, folderId: id, settings: parentSettings } });
							setCurIndex(enabledIndex);
						}, requestDelay);

					} else {
						setStart(false);
						setDone(true);
					}
				} else {

					if ((processIteration + 1) < totalIteration) {
						setProcessIteration(processIteration + 1);
						setTimeout(sequentialRun, iterationDelay);
						return;
					}

					setStart(false);
					setDone(true);
				}
			} else {
				setStart(false);
			}
		}
	}, [res]);

	useEffect(() => {
		if (req && req.length > 0 && selectedReq.length === 0) {
			let selected = [];
			req.forEach(() => {
				selected.push(true);
			});

			setSelectedReq(selected);
		}
	}, [req]);

	function getResponseStatus(index: number) {
		if (cancelled) {
			if ((processIteration + 1) < totalIteration && selectedIteration > processIteration && selectedReq[index]) {
				return "CANCELLED";
			}

			if (!(res[selectedIteration] && res[selectedIteration][index]) && selectedReq[index]) {
				return "CANCELLED";
			}

		}
		return res[selectedIteration] && res[selectedIteration][index] ? res[selectedIteration][index].response.isError ? "ERROR" : (res[selectedIteration][index].response.status === 0 ? "" : (res[selectedIteration][index].response.status + " " + res[selectedIteration][index].response.statusText)) : "";
	}

	function getResponseDuration(index: number) {
		if (cancelled) {
			if ((processIteration + 1) < totalIteration && selectedIteration > processIteration && selectedReq[index]) {
				return "CANCELLED";
			}

			if (!(res[selectedIteration] && res[selectedIteration][index]) && selectedReq[index]) {
				return "CANCELLED";
			}

		}
		return res[selectedIteration] && res[selectedIteration][index] ? res[selectedIteration][index]?.response.isError ? "0 ms" : GetResponseTime(res[selectedIteration][index].response.duration) : "";
	}

	function getStatusClassName(index: number): string {
		if (cancelled) {
			if (((processIteration + 1) < totalIteration) && (selectedIteration > processIteration)) {
				return "runall-status-error";
			}

			if (!(res[selectedIteration] && res[selectedIteration][index])) {
				return "runall-status-error";
			}
		}

		if (!res[selectedIteration][index] || (selectedOption === 2 && processing)) {
			return "runall-status-normal";
		}

		if (res[selectedIteration][index].response.isError) {
			return "runall-status-error";
		}

		if (res[selectedIteration][index].response.status <= 399) {
			return "runall-status-success";
		}

		return "runall-status-error";
	}

	function getClassName(index: number): string {
		if (cancelled) {
			if ((processIteration + 1) < totalIteration && selectedIteration > processIteration) {
				return "runall-status-error";
			}

			if (!(res[selectedIteration] && res[selectedIteration][index])) {
				return "runall-status-error";
			}
		}

		if (!res[selectedIteration][index] || (processing && selectedOption === 2)) {
			return "runall-status-normal";
		}

		if (res[selectedIteration][index].response.isError) {
			return "runall-status-error";
		}

		return "runall-status-success";
	}

	function onRowClick(index: number) {
		if (res[selectedIteration] && res[selectedIteration][index]) {
			vscode.postMessage({ type: requestTypes.openRunRequest, data: { reqData: req[index], resData: res[selectedIteration][index], id: req[index].id, varId: varId, colId: colId, folderId: folderId } });
		}
	}

	function onClickExportJson(e: any) {
		e.preventDefault();
		let exportData = exportJson(req, selectedReq, res, sourceColName, selectedVariable, totalIteration);
		vscode.postMessage({ type: requestTypes.exportRunTestJsonRequest, data: exportData, name: sourceColName });
	}

	function onClickExportCSV(e: any) {
		e.preventDefault();
		let data = exportCSV(req, selectedReq, res, sourceColName, selectedVariable, totalIteration);
		vscode.postMessage({ type: requestTypes.exportRunTestCSVRequest, data: data, name: sourceColName });
	}

	function getTestClassName(index: number) {
		let total = refReq.current[index].tests.length - 1;

		if (!selectedReq[index]) {
			return "runall-test-disabled";
		}

		if (total === 0) {
			return "runall-test-normal";
		}

		if (res[index]) {
			let pass = res[selectedIteration][index].testResults?.filter(item => item.result === true).length;

			if (total === pass) {
				return "runall-test-pass";
			}
			return "runall-test-fail";
		} else {
			return "runall-test-normal";
		}
	}

	function getTestResult(index: number) {
		let total = refReq.current[index].tests.length - 1;
		if (total === 0) {
			return "No Tests";
		}
		if (res[index]) {
			let pass = res[selectedIteration][index].testResults?.filter(item => item.result === true).length;
			return `${pass} / ${total}`;
		}
		return `${0}/${total}`;
	}

	function onSelectChange(_e: any, index: number) {
		let localReq = [...selectedReq];
		localReq[index] = !localReq[index];
		setSelectedReq(localReq);
	}

	function onSelect(e: any, index: number) {
		e.preventDefault();
		e.stopPropagation();
		let localReq = [...req];
		var element = localReq[index];
		localReq.splice(index, 1);
		localReq.splice(e.target.value, 0, element);


		let localSelectedReq = [...selectedReq];
		var eleReq = localSelectedReq[index];
		localSelectedReq.splice(index, 1);
		localSelectedReq.splice(e.target.value, 0, eleReq);


		setReq(localReq);
		setSelectedReq(localSelectedReq);
	}

	function isDisabled() {
		if (selectedReq) {
			return selectedReq.filter(item => item === true).length === 0 ? true : false;
		}

		return true;
	}

	function onSelectedTab(tab: string) {
		setSelectedTab(tab);
	}

	function renderHeader() {
		return (
			<>
				<div className="runall-col-name">
					<span className="addto-label">{sourceColName.includes("\\") ? "Collection \\ Folder :" : "Collection :"}</span>
					<span className="addto-label">{sourceColName}</span>
					<span className="addto-label">{"Attached Variable :"}</span>
					<span className="addto-label">{selectedVariable ? selectedVariable.name : "-"}</span>
				</div>
				{getTabRender()}
			</>
		);
	}

	function getTabRender() {
		return (
			<div>
				{["Runner", "Settings"].map((tab) => {
					return (
						<button key={tab} className={selectedTab === tab ? "tab-menu selected" : "tab-menu"} onClick={() => onSelectedTab(tab)}>{tab}</button>
					);
				})}
			</div>
		);
	}

	function renderBody() {
		return (
			<div className="runall-tab-items-panel">
				{
					selectedTab === "Runner"
						?
						renderRunAllTable()
						:
						renderSettings()
				}
			</div>
		);
	}

	function setDelayValue(e: any) {
		if (e.target.validity.valid) {
			setRequsetDelay(e.target.value);
		}
	}

	function setDelayValueBlur(e: any) {
		if (e.target.validity.valid) {
			setRequsetDelay(e.target.value === "" ? 0 : (e.target.value > 300000 ? 300000 : e.target.value));
		}
	}

	function setIterationValue(e: any) {
		if (e.target.validity.valid) {
			setTotalIteration(e.target.value);
			if (e.target.value < 2) {
				setIterationDelay(0);
			}
		}
	}

	function setIterationValueBlur(e: any) {
		if (e.target.validity.valid) {
			setTotalIteration(e.target.value === "" || e.target.value === 0 ? 1 : (e.target.value > 10 ? 10 : e.target.value));
			if (e.target.value === "" || e.target.value < 2) {
				setIterationDelay(0);
			}
		}
	}

	function setIterationDelayValue(e: any) {
		if (e.target.validity.valid) {
			setIterationDelay(e.target.value);
		}
	}

	function setIterationDelayValueBlur(e: any) {
		if (e.target.validity.valid) {
			setIterationDelay(e.target.value === "" ? 0 : (e.target.value > 300000 ? 300000 : e.target.value));
		}
	}

	function renderSettings() {
		return (
			<RunAllSettings
				selectedOption={selectedOption}
				iteration={totalIteration}
				iterationDelay={iterationDelay}
				delay={requestDelay}
				setSelectedOption={setSelectedOption}
				setIterationValue={setIterationValue}
				setIterationValueBlur={setIterationValueBlur}
				setIterationDelayValue={setIterationDelayValue}
				setIterationDelayValueBlur={setIterationDelayValueBlur}
				setDelayValue={setDelayValue}
				setDelayValueBlur={setDelayValueBlur}
			/>
		);
	}

	function onPrevClick(value: number) {
		if (value >= 0) {
			setSelectedIteration(value);
		}
	}

	function onNextClick(value: number) {
		if (value < totalIteration) {
			setSelectedIteration(value);
		}
	}

	function renderRunAllTable() {
		return (
			<>
				<div className="runall-iteration-process-text">
					<label>Processing Iteration : </label>
					{(start || done) && <label>{processIteration + 1} / {totalIteration}</label>}
					{!start && !done && <label>-</label>}
				</div>
				<div className="runall-iteration-selector-panel">
					<label>Iteration : </label>
					<button className="runall-iteration-prevButton" type="button" disabled={!done} onClick={() => onPrevClick(selectedIteration - 1)}>{"<"}</button>
					<input className="runall-iteration-text" type="text" value={selectedIteration + 1} readOnly={true} />
					<button className="runall-iteration-nextButton" type="button" disabled={!done} onClick={() => onNextClick(selectedIteration + 1)}>{">"}</button>
				</div>
				<div className="runall-tbl-panel">
					<table className="runall-tbl center" cellPadding={0} cellSpacing={0}>
						<thead>
							<tr>
								<th className="runall-col-0"></th>
								<th className="runall-col-2">Path</th>
								<th className="runall-col-1">Method</th>
								<th className="runall-col-2">Name</th>
								<th className="runall-col-1">Status</th>
								<th className="runall-col-1">Duration</th>
								<th className="runall-col-1">Tests (Pass / Total)</th>
								{selectedOption === 1 && <th className="runall-col-5">Order</th>}
							</tr>
						</thead>
						<tbody>
							{
								req.map((item, index) => {
									return <tr key={item.id} onClick={() => onRowClick(index)} className={selectedReq[index] ? "runall-enabled" : "runall-disabled"} >
										<td className="runall-col-1">
											<input type="checkbox"
												checked={selectedReq[index] !== undefined ? selectedReq[index] : true}
												onChange={(e) => onSelectChange(e, index)}
											/>
										</td>
										<td className="runall-col-2">
											<span className="runall-label">{itemPaths ? itemPaths[item.id].split(";")[0] : ""}</span>
										</td>
										<td className="runall-col-1">
											<span className={"runall-method-label " + getMethodClassName(item.method.toUpperCase(), selectedReq[index])}>{item.method.toUpperCase()}</span>
										</td>
										<td className="runall-col-2">
											<span className="runall-label">{item.name}</span>
										</td>
										<td className="runall-col-1">
											<span className={getStatusClassName(index) + " runall-label"}>{(selectedOption === 1 && curIndex === index && processing) || (selectedOption === 2 && processing && selectedReq[index]) ? "loading..." : getResponseStatus(index)}</span>
										</td>
										<td className="runall-col-1">
											<span className={getClassName(index) + " runall-label"}>{(selectedOption === 1 && curIndex === index && processing) || (selectedOption === 2 && processing && selectedReq[index]) ? "loading..." : getResponseDuration(index)}</span>
										</td>
										<td className="runall-col-1">
											<span className={getTestClassName(index) + " runall-label"}>{(selectedOption === 1 && curIndex === index && processing) || (selectedOption === 2 && processing && selectedReq[index]) ? "loading..." : getTestResult(index)}</span>
										</td>
										{selectedOption === 1 && <td className="runall-col-5">
											<select
												required={true}
												className={"runall-order-select"}
												id={"order_" + index.toString()}
												value={index}
												disabled={!selectedReq[index]}
												onChange={(e) => onSelect(e, index)}>
												{
													req.map((_param: any, index: number) => {
														return (
															<option
																key={index}
																value={index}
															>
																{index + 1}
															</option>
														);
													})
												}
											</select>
										</td>}
									</tr>;
								})
							}
						</tbody>
					</table>
				</div>
			</>
		);
	}

	function renderButton() {
		return (
			<>
				{
					selectedTab === "Runner" ?
						<div className="runall-btn-panel">
							<button
								type="submit"
								className="submit-button runall-btn"
								onClick={onSubmitClick}
								disabled={start || done || isDisabled()}
							>
								Run
							</button>
							<button
								type="submit"
								className="submit-button runall-btn"
								onClick={onCancelClick}
								disabled={done || !start || isDisabled()}
							>
								Cancel
							</button>
							<div id="runall-dropdown" className="runall-dropdown">
								<button className="submit-button runall-dropbtn" disabled={!done || isDisabled()} >Export</button>
								{!isDisabled() && done && <div className={start || isDisabled() ? "runall-dropdown-content a-disabled" : "runall-dropdown-content"}>
									<a onClick={onClickExportJson}>JSON</a>
									<a onClick={onClickExportCSV}>CSV</a>
								</div>}
							</div>
						</div>
						:
						<></>
				}
			</>
		);
	}

	return (
		<div className="runall-panel">
			<div className="runall-header">🔁 Run Collection</div>
			<div className="runall-body center">
				{renderHeader()}
				{
					loading === true ?
						<>
							<div id="divSpinner" className="spinner loading"></div>
							<div className="loading-history-text">{"Loading...."}</div>
						</>
						:
						<>
							{renderBody()}
							{renderButton()}
						</>
				}
			</div>
		</div>
	);
};

export default RunAll;
