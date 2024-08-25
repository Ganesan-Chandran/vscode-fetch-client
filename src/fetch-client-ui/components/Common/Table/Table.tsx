import React from 'react';
import { ReactComponent as BinLogo } from '../../../../../icons/bin.svg';
import { IVariable } from '../../SideBar/redux/types';
import { Autocomplete } from '../Autocomplete/Autocomplete';
import { GetFileName } from '../helper';
import { TextEditor } from '../TextEditor/TextEditor';
import "./style.css";
import { dataTypes, HeadersKeys, HerdersValues, ITableData, TableType, TextType } from "./types";

export interface TableProps {
	data: ITableData[];
	onSelectChange?: any;
	onSelectType?: any;
	onFileSelect?: any;
	onRowAdd?: any;
	onRowUpdate?: any;
	deleteData?: any;
	readOnly: boolean;
	type?: TableType;
	placeholder?: { key: string, value: string }
	selectedVariable?: IVariable;
	highlightNeeded?: boolean;
	headers?: { key: string, value: string, value1?: string }
	valueType?: TextType;
}

export const Table = (props: TableProps) => {
	const { data, onSelectChange, onSelectType, onFileSelect, onRowAdd, onRowUpdate, deleteData, readOnly, selectedVariable, valueType } = props;

	function isEnabled(row: ITableData, index: number): boolean {

		if (readOnly) {
			return true;
		}

		if (row.isFixed === true) {
			return true;
		}

		if (index === data.length - 1) {
			return false;
		}

		if (row.isChecked && index !== data.length - 1) {
			return false;
		}

		return true;
	}

	function getRequetHeaderRow(row: ITableData, index: number) {
		return (<>
			<td>
				<Autocomplete
					id={props.type + "_key_" + index.toString()}
					value={row.key}
					className={isEnabled(row, index) ? "table-input disabled" : "table-input"}
					onSelect={(val: string) => index === data.length - 1 ? onRowAdd(val, index, true) : onRowUpdate(val, index, true)}
					suggestions={HeadersKeys}
					disabled={isEnabled(row, index) ? true : false}
					placeholder="header"
					selectedVariable={selectedVariable}
				/>
			</td>
			<td>
				<Autocomplete
					id={props.type + "_val_" + index.toString()}
					value={row.value}
					className={isEnabled(row, index) ? "table-input disabled" : "table-input"}
					onSelect={(val: string) => index === data.length - 1 ? onRowAdd(val, index, false) : onRowUpdate(val, index, false)}
					suggestions={HerdersValues}
					disabled={isEnabled(row, index) ? true : false}
					placeholder="value"
					selectedVariable={selectedVariable}
				/>
			</td>
		</>);
	}


	function getKeyHighlightedColumn(row: ITableData, index: number) {
		return (
			selectedVariable.id && <TextEditor
				varWords={selectedVariable.data.map(item => item.key)}
				placeholder={props.placeholder ? props.placeholder.key : "parameter"}
				onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, true) : onRowUpdate(event, index, true)}
				value={row.key}
				disabled={isEnabled(row, index) ? true : false}
				focus={false}
			/>
		);
	}


	function getKeyNonHighlightedColumn(row: ITableData, index: number) {
		return (
			<input
				id={props.type + "_key_" + index.toString()}
				className={props.type !== "resHeaders" && props.type !== "resCookies" ? (isEnabled(row, index) ? "table-input disabled" : "table-input") : "table-input"}
				value={row.key}
				onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, true) : onRowUpdate(event, index, true)}
				disabled={isEnabled(row, index) ? true : false}
				placeholder={props.placeholder ? props.placeholder.key : "parameter"}
			/>
		);
	}

	function getValueHighlightedColumn(row: ITableData, index: number) {
		return (
			selectedVariable.id && <TextEditor
				varWords={selectedVariable.data.map(item => item.key)}
				placeholder={props.placeholder ? props.placeholder.value : "value"}
				onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, false) : onRowUpdate(event, index, false)}
				value={row.value}
				disabled={isEnabled(row, index) ? true : false}
				focus={false}
			/>
		);
	}

	function getValueNonHighlightedColumn(row: ITableData, index: number) {
		return (
			<input
				id={props.type + "_val_" + index.toString()}
				className={(props.type !== "resHeaders" && props.type !== "resCookies" ? (isEnabled(row, index) ? "table-input disabled" : "table-input") : "table-input") + (valueType === "password" ? " password-textbox" : "")}
				value={row.value}
				onChange={(event) => index === data.length - 1 ? onRowAdd(event, index, false) : onRowUpdate(event, index, false)}
				disabled={isEnabled(row, index) ? true : false}
				placeholder={props.placeholder ? props.placeholder.value : "value"}
				type={valueType === "password" ? "password" : "text"}
			/>
		);
	}

	function fileSelect(index: number) {
		onFileSelect(index);
	}

	function getFileSelectColumn(row: ITableData, index: number) {
		return (
			<>
				<button className="file-select" onClick={(_e) => fileSelect(index)}>Select</button>
				<label className="file-name">{GetFileName(row.value)}</label>
			</>
		);
	}

	function getActionColumn(row: ITableData, index: number) {
		return (<td className="action-cell">
			{(row.key || row.value) && row.isFixed !== true ?
				<BinLogo className="delete-button" onClick={() => deleteData(index)} />
				:
				<></>
			}
		</td>);
	}

	function getSelectColumn(row: ITableData, index: number) {
		return (<td className="action-cell">
			{index !== data.length - 1 ?
				<input type="checkbox"
					checked={row.isChecked}
					onChange={() => onSelectChange ? onSelectChange(index) : {}}
					disabled={row.isFixed === true ? true : false}
				/>
				:
				<></>
			}
		</td>);
	}

	function getTypeSelectColumn(row: ITableData, index: number) {
		return (<td className="type-action-cell">
			<select
				required={true}
				className="test-action-select"
				id={"form_action_" + index.toString()}
				value={row.type}
				onChange={(e) => onSelectType(e.target.value, index)}>
				{
					dataTypes.map((value: string) => {
						return (
							<option
								key={value}
								value={value}
							>
								{value}
							</option>
						);
					})
				}
			</select>
		</td>);
	}

	function getKeyValueRow(row: ITableData, index: number) {
		return (<>
			<td>
				{props.highlightNeeded ? getKeyHighlightedColumn(row, index) : getKeyNonHighlightedColumn(row, index)}
			</td>
			<td>
				{props.type === "formData" && row.type === "File" ? getFileSelectColumn(row, index) : (props.highlightNeeded ? getValueHighlightedColumn(row, index) : getValueNonHighlightedColumn(row, index))}
			</td>
		</>);
	}

	const tableRow = (row: ITableData, index: number) => {
		return (
			<tr key={index}>
				{!readOnly && getSelectColumn(row, index)}
				{props.type === "formData" && getTypeSelectColumn(row, index)}
				{props.type === "reqHeaders" ? getRequetHeaderRow(row, index) : getKeyValueRow(row, index)}
				{!readOnly && getActionColumn(row, index)}
			</tr>
		);
	};

	const makeTable = (data: ITableData[]) => {
		return (
			data.map((item: ITableData, index: number) => {
				return tableRow(item, index);
			})
		);
	};

	return (
		<table className="option-table">
			<thead>
				<tr>
					{!readOnly && <th className="action-cell"></th>}
					{props.type === "formData" && <th className="type-action-cell">Type</th>}
					<th>{props.headers ? props.headers.key : "Key"}</th>
					<th>{props.headers ? props.headers.value : "Value"}</th>
					{!readOnly && <th className="action-cell"></th>}
				</tr>
			</thead>
			<tbody>
				{makeTable(data)}
			</tbody>
		</table>
	);
};
