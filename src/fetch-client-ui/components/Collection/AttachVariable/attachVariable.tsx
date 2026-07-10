import "../style.css";
import { IVariable } from "../../../../fetch-client-core/types/sidebar.types";
import { requestTypes, responseTypes } from "../../../../fetch-client-core/consts/requestTypes.consts";
import { useState } from "react";
import React, { useEffect } from "react";
import vscode from "../../Common/vscodeAPI";
import PanelLayout from "../../Common/Layout/panelLayout";

const AttachVariable = () => {
	const [colName, setColName] = useState("");
	const [colId, setColId] = useState("");
	const [names, setNames] = useState([]);
	const [selectedVarId, setVarId] = useState("");

	const [errors, setErrors] = useState({});
	const [isDone, setDone] = useState(false);

	useEffect(() => {
		const id = document.title.split("@:@")[1];
		setColId(id);
		const name = document.title.split("@:@")[3];
		setColName(name);

		const handleMessage = (event: MessageEvent) => {
			if (event.data && event.data.type === responseTypes.getAllVariableResponse) {
				let vars = event.data.variable as IVariable[];
				let varNames = [{ name: "Select", value: "", disabled: true }];

				var ids = vars.reduce((ids, item, index) => {
					if (index !== 0) {
						ids.push({ name: item.name, value: item.id, disabled: false });
					}
					return ids;
				}, []);

				varNames = [...varNames, ...ids];
				setNames(varNames);
			} else if (event.data && event.data.type === responseTypes.attachVariableResponse) {
				setDone(true);
			}
		};
		window.addEventListener("message", handleMessage);

		vscode.postMessage({ type: requestTypes.getAllVariableRequest });
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setErrors({ ...errors, "varId": "" });
		setVarId(event.target.value);
	};

	function handleValidation() {
		if (selectedVarId === "") {
			setErrors({ ...errors, "varId": "Please select the variable" });
			return false;
		}

		return true;
	}

	function onSubmitClick() {
		if (handleValidation()) {
			vscode.postMessage({ type: requestTypes.attachVariableRequest, data: { colId: colId, varId: selectedVarId } });
		}
	}

	function renderHint() {
		return (
			<div className="reorder-hint">
				Select a variable to attach to the selected collection.
			</div>
		);
	}

	function renderForm() {
		return (
			<div className="reorder-tree-panel">
				<table className="addto-table attach-variable-scroll-panel" cellPadding={0} cellSpacing={0}>
					<tbody>
						<tr>
							<td className="col-1-size">
								<span className="addto-label">Selected Collection</span>
							</td>
							<td className="col-2-size">
								<input
									className="addto-text disabled"
									type="text"
									value={colName}
									disabled
								/>
							</td>
						</tr>

						<tr>
							<td className="col-1-size">
								<span className="addto-label">Variable</span>
							</td>

							<td className="col-2-size block-display">
								<select
									className={
										errors["varId"]
											? "addto-select var-select error-select"
											: "addto-select var-select"
									}
									value={selectedVarId}
									onChange={onSelect}
								>
									{names.map((item: any, index: number) => (
										<option
											key={index + item.name}
											value={item.value}
											disabled={item.disabled}
											hidden={index === 0}
										>
											{item.name}
										</option>
									))}
								</select>

								{errors["varId"] && (
									<div className="error-text">
										{errors["varId"]}
									</div>
								)}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		);
	}

	function renderFooter() {
		return (
			<>
				{isDone && (
					<div className="reorder-status reorder-status--ok">
						{`Collection '${colName}' is attached to variable successfully`}
					</div>
				)}

				<div className="reorder-btn-panel">
					<button
						type="button"
						className="submit-button reorder-btn"
						onClick={onSubmitClick}
						disabled={isDone}
					>
						{isDone ? "✓ Attached" : "Attach Variable"}
					</button>
				</div>
			</>
		);
	}

	return (
		colId ?
			<PanelLayout
				title="🔗 Attach Variable"
				loading={!colId}
				footer={renderFooter()}
			>
				{renderHint()}
				{renderForm()}
			</PanelLayout>
			:
			<></>
	);
};

export default AttachVariable;
