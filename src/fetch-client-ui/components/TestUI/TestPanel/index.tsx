import "./style.css";
import { Actions } from "../../RequestUI/redux";
import { AppDispatch } from "../../../store/appStore";
import { Autocomplete } from "../../Common/Autocomplete/Autocomplete";
import { convertAITestCases } from "../../../../fetch-client-core/helpers/aiTestCase.helper";
import { HerdersValues } from "../../../../fetch-client-core/consts/headers.consts";
import { IRootState } from "../../../reducer/combineReducer";
import { ITest } from "../../../../fetch-client-core/types/prefetch.types";
import { ReactComponent as BinLogo } from "../../../../../icons/bin.svg";
import { ReactComponent as EditLogo } from "../../../../../icons/edit.svg";
import {
	TestCaseParameters,
	ActionsParametersMapping,
	TestValueSuggestions,
} from "../../../../fetch-client-core/consts/test.consts";
import { TextEditor } from "../../Common/TextEditor/TextEditor";
import { ValueEditorModal } from "../../Common/ValueEditorModal";
import { useDispatch, useSelector } from "react-redux";
import React, { useEffect, useState } from "react";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import vscode from "../../Common/vscodeAPI";

const ROW_CHUNK_SIZE = 8;

export const TestPanel = () => {
	const dispatch = useDispatch<AppDispatch>();

	const { tests, method, url } = useSelector(
		(state: IRootState) => state.requestData,
	);
	const { selectedVariable } = useSelector(
		(state: IRootState) => state.variableData,
	);

	const [editingField, setEditingField] = useState<{  
		index: number;
		type: "customParameter" | "expectedValue";
	} | null>(null);

	function openValueEditor(
		index: number,
		type: "customParameter" | "expectedValue",
	) {
		setEditingField({ index, type });
	}

	function closeValueEditor() {
		setEditingField(null);
	}

	const [renderCount, setRenderCount] = useState(ROW_CHUNK_SIZE);

	// Each row mounts editors, so mounting all rows at once blocks the tab switch.
	useEffect(() => {
		if (renderCount >= tests.length) {
			return undefined;
		}
		const timer = setTimeout(
			() => setRenderCount((count) => count + ROW_CHUNK_SIZE),
			0,
		);
		return () => clearTimeout(timer);
	}, [renderCount, tests.length]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type !== responseTypes.importTestCasesResponse) {
				return;
			}

			const result = convertAITestCases(event.data.fileData, { method, url });
			if (result.error) {
				vscode.postMessage({
					type: requestTypes.showMessageRequest,
					data: result.error,
				});
				return;
			}

			const existing = tests.filter((t) => t.parameter !== "");
			dispatch(
				Actions.SetTestAction([
					...existing,
					...result.tests,
					{ parameter: "", action: "", expectedValue: "", customParameter: "" },
				]),
			);

			vscode.postMessage({
				type: requestTypes.showMessageRequest,
				data:
					`Imported ${result.tests.length} test(s).` +
					(result.warnings.length > 0
						? `\n\nSkipped:\n${result.warnings.join("\n")}`
						: ""),
			});
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [tests, method, url]);

	function onImportTestCases() {
		vscode.postMessage({ type: requestTypes.importTestCasesRequest });
	}

	function saveValueEditor(value: string) {
		if (!editingField) {
			return;
		}
		onSelectItem(value, editingField.index, editingField.type);
		setEditingField(null);
	}

	function getEditButton(
		index: number,
		type: "customParameter" | "expectedValue",
	) {
		return (
			<span
				className="edit-button-wrapper"
				title="Edit in large editor"
				onClick={() => openValueEditor(index, type)}
			>
				<EditLogo className="edit-button" />
			</span>
		);
	}

	const onSelectItem = (value: string, index: number, type: string) => {
		let newRow: ITest = {
			parameter: "",
			action: "",
			expectedValue: "",
			customParameter: "",
		};

		let localTable = addValue(value, index, type);

		if (
			index === tests.length - 1 &&
			(((localTable[index].parameter === "Header" ||
				localTable[index].parameter === "JSON") &&
				localTable[index].customParameter) ||
				(localTable[index].parameter !== "Header" &&
					localTable[index].parameter !== "JSON")) &&
			localTable[index].action
		) {
			localTable.push(newRow);
		}

		dispatch(Actions.SetTestAction(localTable));
	};

	const onSelect = (
		event:
			| React.ChangeEvent<HTMLSelectElement>
			| React.ChangeEvent<HTMLInputElement>,
		index: number,
		type: string,
	) => {
		onSelectItem(event.target.value, index, type);
	};

	function onDelete(index: number) {
		let localTable = [...tests];
		localTable.splice(index, 1);
		dispatch(Actions.SetTestAction(localTable));
	}

	const addValue = (
		value: string,
		index: number,
		selectType: string,
	): ITest[] => {
		let localTable = [...tests];
		let rowData = localTable[index];
		localTable[index] = {
			parameter: selectType === "parameter" ? value : rowData.parameter,
			action: selectType === "action" ? value : rowData.action,
			expectedValue:
				selectType === "expectedValue" ? value : rowData.expectedValue,
			customParameter:
				selectType === "customParameter" ? value : rowData.customParameter,
		};

		return localTable;
	};

	function getParameterList(row: ITest, index: number) {
		return (
			<>
				{row.parameter === "Header" || row.parameter === "JSON" ? (
					selectedVariable.id && (
						<div
							className="value-cell-wrapper"
							onDoubleClick={() => openValueEditor(index, "customParameter")}
						>
							<TextEditor
								varWords={selectedVariable.data.map((item) => item.key)}
								placeholder={
									row.parameter === "Header"
										? "header name"
										: "ex: data or data.id"
								}
								onChange={(val) => onSelectItem(val, index, "customParameter")}
								value={row.customParameter}
								focus={false}
							/>
							{getEditButton(index, "customParameter")}
						</div>
					)
				) : (
					<select
						required={true}
						className="test-parameter-select"
						id={"parameter_" + index.toString()}
						value={row.parameter}
						onChange={(e) => onSelect(e, index, "parameter")}
					>
						{TestCaseParameters.map((param: any, index: number) => {
							return (
								<option
									disabled={index === 0 ? true : false}
									hidden={index === 0 ? true : false}
									key={index + param.name}
									value={param.value}
								>
									{param.name}
								</option>
							);
						})}
					</select>
				)}
			</>
		);
	}

	function getActionList(row: ITest, index: number) {
		let parameter = ActionsParametersMapping[row.parameter];
		let actionList: any;

		if (parameter) {
			actionList = row.parameter ? parameter["action"] : {};
		} else {
			actionList = {};
		}

		return (
			<select
				disabled={actionList.length > 0 ? false : true}
				required={true}
				className="test-action-select"
				id={"action_" + index.toString()}
				value={row.action}
				onChange={(e) => onSelect(e, index, "action")}
			>
				{actionList.length > 0 ? (
					actionList.map((param: any, index: number) => {
						return (
							<option
								disabled={index === 0 ? true : false}
								hidden={index === 0 ? true : false}
								key={index + param.name}
								value={param.value}
							>
								{param.name}
							</option>
						);
					})
				) : (
					<option value=""></option>
				)}
			</select>
		);
	}

	const tableRow = (row: ITest, index: number) => {
		return (
			<tr key={index}>
				<td>{getParameterList(row, index)}</td>
				<td>{getActionList(row, index)}</td>
				<td>
					<div
						className="value-cell-wrapper"
						onDoubleClick={() =>
							row.parameter !== "" &&
							row.action !== "" &&
							openValueEditor(index, "expectedValue")
						}
					>
						<Autocomplete
							id={"test_val_" + index.toString()}
							value={row.expectedValue}
							className={
								row.parameter !== "" && row.action !== ""
									? "table-input"
									: "table-input disabled"
							}
							onSelect={(val) => onSelectItem(val, index, "expectedValue")}
							suggestions={[...HerdersValues, ...TestValueSuggestions]}
							disabled={
								row.parameter !== "" && row.action !== "" ? false : true
							}
							placeholder={
								row.parameter !== "" && row.action !== "" ? "value" : ""
							}
							selectedVariable={selectedVariable}
						/>
						{row.parameter !== "" &&
							row.action !== "" &&
							getEditButton(index, "expectedValue")}
					</div>
				</td>
				<td className="test-action-cell">
					{index !== tests.length - 1 ? (
						<BinLogo
							className="delete-button"
							onClick={() => onDelete(index)}
						/>
					) : (
						<></>
					)}
				</td>
			</tr>
		);
	};

	const makeTable = (data: ITest[]) => {
		return data.slice(0, renderCount).map((item: ITest, index: number) => {
			return tableRow(item, index);
		});
	};

	return (
		<>
			<div className="test-import-bar">
				<button
					className="test-import-button"
					title="Import AI test cases (JSON)"
					aria-label="Import AI test cases"
					onClick={onImportTestCases}
				>
					📥
				</button>
			</div>
			<table className="test-table">
				<thead>
					<tr>
						<th>Parameter</th>
						<th>Action</th>
						<th>Test Value</th>
						<th className="test-action-cell"></th>
					</tr>
				</thead>
				<tbody>{makeTable(tests)}</tbody>
			</table>
			{renderCount < tests.length && (
				<div className="test-rows-loading" role="status">
					<span className="test-rows-spinner" />
					Loading {tests.length - renderCount} more rows...
				</div>
			)}
			<ValueEditorModal
				show={editingField !== null}
				value={
					editingField !== null
						? tests[editingField.index][editingField.type]
						: ""
				}
				onSave={saveValueEditor}
				onCancel={closeValueEditor}
			/>
		</>
	);
};
