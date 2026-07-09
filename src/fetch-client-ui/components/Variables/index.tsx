import "./style.css";
import { formatDate } from "../../../fetch-client-core/helpers/dateTime.helper";
import { ITableData } from "../../../fetch-client-core/types/common.types";
import { IVariable } from "../../../fetch-client-core/types/sidebar.types";
import { requestTypes, responseTypes } from "../../../fetch-client-core/consts/requestTypes.consts";
import { Table } from "../Common/Table/Table";
import { v4 as uuidv4 } from 'uuid';
import PanelLayout from "../Common/Layout/panelLayout";
import React, { useEffect, useState } from "react";
import vscode from "../Common/vscodeAPI";

export interface IVariableProps {
	index?: number;
}

const Variables = (_props: IVariableProps) => {

	const [isDone, setDone] = useState(false);
	const [isNew, setNew] = useState(true);
	const [enabled, setEnabled] = useState(true);
	const [errors, setErrors] = useState({});
	const [defaultGlobal, setDefaultGlobal] = useState(false);
	const [variableItem, setVariableItem] = useState<IVariable>(null);
	const [duplicates, setDuplicates] = useState([]);
	const [collectionNames, setCollectionNames] = useState([]);
	const [viewVariables, setViewVariables] = useState(false);

	function onRowAdd(event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) {
		let newRow: ITableData = {
			isChecked: false,
			key: "",
			value: ""
		};

		let localTable = addValue(event.target.value, index, isKey);

		if (localTable[index].key && localTable[index].value) {
			localTable.push(newRow);
		}
		setVariableItem({ ...variableItem, data: localTable });
		setDone(false);
	}

	function onRowUpdate(event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) {
		let localTable = addValue(event.target.value, index, isKey);
		setVariableItem({ ...variableItem, data: localTable });
		setDone(false);
	}

	const addValue = (value: string, index: number, isKey: boolean): ITableData[] => {
		let localTable = [...variableItem.data];
		let rowData = localTable[index];
		localTable[index] = {
			isChecked: true,
			key: isKey ? value : rowData.key,
			value: !isKey ? value : rowData.value
		};

		return localTable;
	};


	function deleteParam(index: number) {
		let localTable = [...variableItem.data];
		localTable.splice(index, 1);
		setVariableItem({ ...variableItem, data: localTable });
		setDone(false);
	}

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data && event.data.type === responseTypes.getVariableItemResponse) {
				let varItem = event.data.data[0] as IVariable;
				varItem.data.push({ isChecked: false, key: "", value: "" });
				setVariableItem(varItem);
				setDefaultGlobal(varItem.name.toUpperCase().trim() === "GLOBAL");
				setEnabled(false);
			} else if (event.data && (event.data.type === responseTypes.saveVariableResponse || event.data.type === responseTypes.updateVariableResponse)) {
				setDone(true);
			} else if (event.data && (event.data.type === responseTypes.getAttachedColIdsResponse)) {
				setCollectionNames(event.data.colNames);
			}
		};

		window.addEventListener("message", handleMessage);

		let id = document.title.split("@:@")[1];
		if (id !== "undefined") {
			vscode.postMessage({ type: requestTypes.getVariableItemRequest, data: { id: id, isGlobal: false } });
			setNew(false);
		} else {
			setVariableItem({
				id: uuidv4(),
				name: "",
				isActive: true,
				createdTime: formatDate(),
				modifiedTime: formatDate(),
				data: [{
					isChecked: false,
					key: "",
					value: "",
				}]
			});
		}
		return () => {
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	function onSubmitClick() {
		let duplicates = variableItem.data.map((item) => {
			return item.key.trim();
		}).filter((item, index, self) => self.indexOf(item) !== index);

		if (duplicates.length > 0) {
			setDuplicates(duplicates);
		} else {
			setDuplicates([]);
			let localVar = { ...variableItem };
			localVar.data = localVar.data.filter(item => item.key);
			vscode.postMessage({ type: isNew ? requestTypes.saveVariableRequest : requestTypes.updateVariableRequest, data: localVar });
		}
	}

	function isDisabled(): boolean {
		if (!variableItem.name) {
			return true;
		}

		if (!defaultGlobal && variableItem.name.toUpperCase().trim() === "GLOBAL") {
			return true;
		}

		return false;
	}

	function onNameChange(event: any) {
		setVariableItem({ ...variableItem, name: event.target.value });
		setErrors({ ...errors, "varName": (event.target.value ? (event.target.value.toUpperCase().trim() === "GLOBAL" ? "Variable name should not be 'Global'" : "") : "Cannot be empty") });
	}

	function onSelectChange(evt: React.ChangeEvent<HTMLInputElement>) {
		setViewVariables(evt.currentTarget.checked);
	}

	function renderHeader() {
		return (
			<>
				<div className="variable-panel-name">
					<label className="variable-text-label">
						Name :
					</label>

					<input
						className={
							errors["varName"]
								? "variable-text required-value"
								: "variable-text"
						}
						type="text"
						value={variableItem.name}
						onChange={onNameChange}
						disabled={!enabled}
					/>

					{errors["varName"] && (
						<div className="var-name-valid error-text">
							{errors["varName"]}
						</div>
					)}
				</div>

				<div className="view-variable-panel-name">
					<label className="request-header-panel-text view-variable">
						<input
							type="checkbox"
							className="request-header-panel-option"
							checked={viewVariables}
							onChange={onSelectChange}
						/>

						View Variables
					</label>
				</div>
			</>
		);
	}

	function renderVariableTable() {
		return (
			<div className="var-tbl-panel var-tbl">
				<Table
					data={
						variableItem?.data ?? [
							{
								isChecked: false,
								key: "",
								value: "",
							},
						]
					}
					onRowAdd={onRowAdd}
					onRowUpdate={onRowUpdate}
					deleteData={deleteParam}
					readOnly={false}
					placeholder={{
						key: "variable name",
						value: "value",
					}}
					valueType={viewVariables ? "text" : "password"}
				/>
			</div>
		);
	}

	function renderAttachedCollections() {
		if (collectionNames.length === 0) {
			return null;
		}

		return (
			<div className="variable-col-panel">
				<label className="variable-col-label">
					Attached Collections :
				</label>

				<label className="variable-col-list-label">
					{' ' + collectionNames.join(", ")}
				</label>
			</div>
		);
	}

	function renderFooter() {
		return (
			<>
				{isDone && (
					<div className="reorder-status reorder-status--ok">
						Variables {isNew ? "added" : "updated"} successfully.
					</div>
				)}

				{duplicates.length > 0 && (
					<div className="reorder-status reorder-status--error">
						Duplicate Variables: {duplicates.join(", ")}
					</div>
				)}

				<div className="reorder-btn-panel">
					<button
						type="button"
						className="submit-button reorder-btn"
						onClick={onSubmitClick}
						disabled={isDisabled()}
					>
						{isNew ? "Add Variable" : "Save Variable"}
					</button>
				</div>
			</>
		);
	}

	return (
		<PanelLayout
			title="🗂️ Variables"
			loading={!variableItem}
			header={variableItem ? renderHeader() : undefined}
			footer={variableItem ? renderFooter() : undefined}
		>
			{variableItem && (
				<>
					{renderVariableTable()}
					{renderAttachedCollections()}
				</>
			)}
		</PanelLayout>
	);
};

export default Variables;
