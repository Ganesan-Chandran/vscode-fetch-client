import "./style.css";
import { IRootState } from "../../../../../reducer/combineReducer";
import { ITestResult, IPreFetchResponse } from "../../../../../../fetch-client-core/types/response.types";
import { useSelector } from "react-redux";
import React, { useMemo, useState } from "react";

export const PreFetchResponse = () => {
	const { preFetchResponse } = useSelector((state: IRootState) => state.responseData);
	const parentPreFecthCount = useSelector((state: IRootState) => state.reqColData)?.parentSettings?.preFetch?.requests?.length;
	const { skipParentPreFetch } = useSelector((state: IRootState) => state.reqSettings);
	const [expand, setExpand] = useState(false);

	function onExpandPanel() {
		setExpand(!expand);
	}

	function getLabelName(index: number, name: string): string {
		if (skipParentPreFetch || index >= parentPreFecthCount) {
			const offset = skipParentPreFetch ? 0 : parentPreFecthCount;
			return `${name} ${index - offset + 1}`;
		}
		return `${name} ${index + 1}`;
	}

	// Rolls every condition + pre-request status up into one pass/fail count
	// so the top of the panel answers "did everything pass?" without expanding anything.
	const { passCount, failCount } = useMemo(() => {
		let pass = 0;
		let fail = 0;
		const walk = (items?: IPreFetchResponse[]) => {
			items?.forEach((item) => {
				item.testResults?.forEach((t) => {
					if (t.test === "") { return; }
					t.result ? pass++ : fail++;
				});
				if (item.reqId && item.reqId !== "-1") {
					item.resStatus < 400 ? pass++ : fail++;
				}
				walk(item.childrenResponse);
			});
		};
		walk(preFetchResponse);
		return { passCount: pass, failCount: fail };
	}, [preFetchResponse]);

	const renderTests = (reqId: string, data: ITestResult[]) => {
		const rows = data.filter((row) => row.test !== "");
		if (rows.length === 0) {
			return null;
		}
		return (
			<div className="prefetch-test-list">
				{rows.map((row, i) => (
					<div className="prefetch-test-row" key={`test_res_${reqId}_${i}`}>
						<span className="test-name">{row.test}</span>
						<span className={`pf-badge ${row.result ? "pass" : "fail"}`}>
							{row.result ? "Pass" : "Fail"}
						</span>
					</div>
				))}
			</div>
		);
	};

	function getPreFetchResponseBody(
		preFetchRes: IPreFetchResponse[]
	) {
		return (
			<>
				{preFetchRes?.map((item, index) => {
					const conditionPassed = item.reqId !== "-1" || item.testResults.filter((i) => !i.result).length === 0;
					const requestPassed = item.resStatus < 400 && item.reqId !== "-1";

					return (
						<React.Fragment key={`node_${item.reqId}_${index}`}>
							{item.testResults?.length > 0 && (
								<details
									open={expand}
									className="prefetch-result-details-items"
								>
									<summary className="prefetch-response-items">
										<span className="pf-scope-tag condition">Condition</span>
										{item.isParentReq && (
											<span className="pf-scope-tag collection">
												Parent
											</span>
										)}
										<span className="pf-node-label">
											{getLabelName(index, "Condition")}
										</span>
										<span
											className={`pf-badge ${conditionPassed ? "pass" : "fail"}`}
										>
											{conditionPassed ? "Pass" : "Fail"}
										</span>
									</summary>
									{renderTests(item.reqId, item.testResults)}
								</details>
							)}

							{((item.isParentReq && item.name && (item.reqId || item.reqId === "-1")) ||
								(!item.isParentReq && item.reqId && item.reqId !== "-1")) &&
								(() => {
									const hasChildren = item.childrenResponse?.length > 0;
									const rowContent = (
										<>
											<span className="pf-scope-tag request">Pre-request</span>
											{item.isParentReq && (
												<span className="pf-scope-tag collection">
													Parent
												</span>
											)}
											<span className="pf-node-label">
												{getLabelName(index, "Pre-request")}: {item.name}
											</span>
											{item.reqId !== "-1" && (
												<span
													className={`pf-badge ${requestPassed ? "pass" : "fail"}`}
												>
													{item.resStatus}
												</span>
											)}
										</>
									);

									// No children -> nothing to expand into, so skip the
									// details/summary wrapper entirely and just show the row.
									if (!hasChildren) {
										return (
											<div className="prefetch-result-details-items">
												<div className="prefetch-response-items no-expand">
													{rowContent}
												</div>
											</div>
										);
									}

									return (
										<details
											open={expand}
											className="prefetch-result-details-items"
										>
											<summary className="prefetch-response-items">
												{rowContent}
											</summary>
											<div className="prefecth-child-panel">
												{getPreFetchResponseBody(item.childrenResponse)}
											</div>
										</details>
									);
								})()}
						</React.Fragment>
					);
				})}
			</>
		);
	}

	if (preFetchResponse?.length === 0) {
		return (
			<div className="prefetch-empty">
				No pre-request results available.
			</div>
		);
	}

	return (
		<div className="prefetch-result-panel">
			<div className="prefetch-toolbar">
				<div className="prefetch-summary">
					<span className="pf-badge pass">{passCount} passed</span>
					{failCount > 0 && (
						<span className="pf-badge fail">{failCount} failed</span>
					)}
				</div>
				<button onClick={onExpandPanel} className="prefetch-expand-btn">
					{expand ? "Collapse all" : "Expand all"}
				</button>
			</div>
			<div>{getPreFetchResponseBody(preFetchResponse)}</div>
		</div>
	);
};
