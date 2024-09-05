import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { IRootState } from '../../../../../reducer/combineReducer';
import { IPreFetchResponse, ITestResult } from '../../../redux/types';
import "./style.css";

export const PreFetchResponse = () => {

	const { preFetchResponse } = useSelector((state: IRootState) => state.responseData);
	const parentPreFecthCount = useSelector((state: IRootState) => state.reqColData)?.parentSettings?.preFetch?.requests?.length;
	const { skipParentPreFetch } = useSelector((state: IRootState) => state.reqSettings);
	const [expand, setExpand] = useState(false);

	function onExpandPanel() {
		setExpand(!expand);
	}

	const makeTable = (reqId: string, data: ITestResult[]) => {
		return (
			data.map((item: ITestResult, index: number) => {
				return tableRow(item, reqId + "_" + index);
			})
		);
	};

	const tableRow = (row: ITestResult, key: string) => {
		if (row.test === "") {
			return <></>;
		}
		return (
			<tr key={"test_res_" + key}>
				<td className="test-result-test-case-col">
					<div className="res-table-input">
						{row.test}
					</div>
				</td>
				<td align="center" className="top-align">
					<label className={row.result ? "prefetch-test-result-label pass" : "prefetch-test-result-label fail"}>{row.result ? "Pass" : "Fail"}</label>
				</td>
			</tr>
		);
	};

	function getLabelName(index: number, name: string): string {
		if (skipParentPreFetch) {
			return name + " " + (name  === "Condition" ? index : (index + 1));
		}
		else {
			if (index >= parentPreFecthCount) {
				return name + " " + (name  === "Condition" ? index - parentPreFecthCount : (index - parentPreFecthCount + 1));
			}

			return name + " " + (name  === "Condition" ? index : (index + 1)) + " (Parent)";
		}
	}

	function getPreFetchResponseBody(preFetchRes: IPreFetchResponse[], isParent: boolean) {
		return (
			<>
				{
					preFetchRes?.map((item, index) => {
						return (
							<>
								{item.testResults?.length > 0 ? <details open={expand} key={"prefetch_results_condition_" + item.reqId} className="prefetch-result-details-items">
									<summary className="prefetch-response-items">
										{getLabelName(index, "Condition")}: {item.reqId !== "-1" || item.testResults.filter(i => !i.result).length === 0 ? <label className="prefetch-condition-result-label pass">Pass</label> : <label className="prefetch-condition-result-label fail">Fail</label>}
										<div>

										</div>
									</summary>
									<div className="collction-item">
										<table>
											<tbody>
												{makeTable(item.reqId, item.testResults)}
											</tbody>
										</table>
									</div>
								</details>
									:
									<></>
								}
								{
									(isParent && item.name && (item.reqId || item.reqId === "-1")) || (!isParent && item.reqId && item.reqId !== "-1") ?
										<details open={expand} key={"prefetch_results_" + item.reqId} className="prefetch-result-details-items">
											<summary className="prefetch-response-items">
												{getLabelName(index, "Pre-Request")}: {item.name} {(item.resStatus < 400 && item.reqId !== "-1") ? <label className="prefetch-condition-result-label pass">Pass</label> : <label className="prefetch-condition-result-label fail">Fail</label>}
												<div>

												</div>
											</summary>
											<div className="prefetch-collction-item">
												<tr key={item.reqId}>
													<td className="test-result-test-case-col">
														<div id={"test_res_" + item.reqId.toString()} className="res-table-input">
															Name : {item.name}
														</div>
													</td>
													{item.reqId !== "-1" && <td align="center" className="top-align">
														<label className={item.resStatus < 400 ? "prefetch-test-result-label pass" : "prefetch-test-result-label fail"}>{item.resStatus}</label>
													</td>}
												</tr>
												<tr>
													{item.childrenResponse?.length > 0 && <div className="prefecth-child-panel">
														{getPreFetchResponseBody(item.childrenResponse, false)}
													</div>
													}
												</tr>
											</div>
										</details>
										:
										<></>
								}
							</>
						);
					})
				}
			</>
		);
	}

	return (
		<>
			{
				preFetchResponse?.length === 0 ?
					<>
						<hr />
						<div className="auth-header-label"><label>{"No PreFetch requests available."}</label></div>
					</>
					:
					<>
						<div className="manage-cookie-btn-panel">
							<button onClick={onExpandPanel} className="format-button open-var-button manage-cookie-button">{expand ? "Collapse All" : "Expand All"}</button>
						</div>
						<div className="prefetch-result-panel">
							{getPreFetchResponseBody(preFetchResponse, true)}
						</div>
					</>
			}
		</>
	);
};
