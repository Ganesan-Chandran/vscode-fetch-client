import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { ReactComponent as BinLogo } from '../../../../icons/bin.svg';
import { IRootState } from "../../reducer/combineReducer";
import { Actions } from "../RequestUI/redux";
import { ISetVar } from "../RequestUI/redux/types";
import { VariableActions } from "./redux";
import "./style.css";

const ResToVariables = () => {

	const dispatch = useDispatch();

	const { variables, selectedVariable, setVarChanged } = useSelector((state: IRootState) => state.variableData);
	const { setvar } = useSelector((state: IRootState) => state.requestData);

	function onRowAdd(event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>, index: number, type: string) {
		let newRow: ISetVar = {
			parameter: "",
			key: "",
			variableName: ""
		};

		let localTable = addValue(event.target.value, index, type);

		if (localTable[index].parameter && localTable[index].key && localTable[index].variableName) {
			localTable.push(newRow);
		}

		dispatch(Actions.SetVarAction(localTable));

		if (!setVarChanged) {
			dispatch(VariableActions.SetReqVarChangeAction(true));
		}
	}

	function onRowUpdate(event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>, index: number, type: string) {
		let localTable = addValue(event.target.value, index, type);
		dispatch(Actions.SetVarAction(localTable));

		if (!setVarChanged) {
			dispatch(VariableActions.SetReqVarChangeAction(true));
		}
	}

	const addValue = (value: string, index: number, type: string): ISetVar[] => {
		let localTable = [...setvar];
		let rowData = localTable[index];
		localTable[index] = {
			parameter: type === "parameter" ? value : rowData.parameter,
			key: type === "key" ? value : rowData.key,
			variableName: type === "variableName" ? value : rowData.variableName
		};

		return localTable;
	};

	function onDelete(index: number) {
		let localValue = [...setvar];
		localValue.splice(index, 1);
		if ((localValue.length === 0) || (localValue[localValue.length - 1].parameter && localValue[localValue.length - 1].key && localValue[localValue.length - 1].variableName)) {
			let newRow: ISetVar = {
				parameter: "",
				key: "",
				variableName: ""
			};
			localValue.push(newRow);
		}

		dispatch(Actions.SetVarAction(localValue));
	}

	const tableRow = (row: ISetVar, index: number) => {
		return (
			<tr key={index}>
				<td>
					<select
						required={true}
						className="test-parameter-select"
						id={"parameter_" + index.toString()}
						value={row.parameter}
						onChange={(event) => index === setvar.length - 1 ? onRowAdd(event, index, "parameter") : onRowUpdate(event, index, "parameter")}>
						{
							[{ name: "select", value: "", }, { name: "Header", value: "Header", }, { name: "Cookie", value: "Cookie", }, { name: "Json Response", value: "JSON", }].map((param: any, index: number) => {
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
						}
					</select>
				</td>
				<td>
					<input
						id={"set_var_key_" + index.toString()}
						className="table-input"
						value={row.key}
						onChange={(event) => index === setvar.length - 1 ? onRowAdd(event, index, "key") : onRowUpdate(event, index, "key")}
						placeholder={row.parameter ? row.parameter === "Header" ? "header name" : row.parameter === "Cookie" ? "cookie name" : "json data" : "value"}
					/>
				</td>
				<td>
					<input
						id={"set_var_value_" + index.toString()}
						className="table-input"
						value={row.variableName}
						onChange={(event) => index === setvar.length - 1 ? onRowAdd(event, index, "variableName") : onRowUpdate(event, index, "variableName")}
						placeholder="variable name without {{ and }}"
					/>
				</td>
				<td className="test-action-cell">
					{
						row.parameter || row.key || row.variableName ?
							<BinLogo className="delete-button" onClick={() => onDelete(index)} />
							:
							<></>
					}
				</td>
			</tr >
		);
	};

	const makeTable = (data: ISetVar[]) => {
		return (
			data.map((item: ISetVar, index: number) => {
				return tableRow(item, index);
			})
		);
	};

	return (
		variables && variables.length > 0
			?
			<div className="set-variable-panel">
				<div className="set-variable-panel-name">
					<span className="addto-var-label">Variable :</span>
					<span className="addto-var-label">{selectedVariable.name}</span>
				</div>
				<div className="var-tbl-panel remove-overflow">
					<table className="test-table">
						<thead>
							<tr>
								<th>Parameter</th>
								<th>Value</th>
								<th>Variable Name</th>
								<th className="action-cell"></th>
							</tr>
						</thead>
						<tbody>
							{
								makeTable(setvar)
							}
						</tbody>
					</table>
					<br />
					<span className="addto-var-label-note"><b>{"Note : "}</b>{"Enter the variable name without {{ and }}"}</span>
				</div>
			</div>
			:
			<></>
	);
};

export default ResToVariables;
