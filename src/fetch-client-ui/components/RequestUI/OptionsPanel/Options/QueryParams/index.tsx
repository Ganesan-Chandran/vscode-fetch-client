import "./style.css";
import { Actions } from "../../../redux";
import { AppDispatch } from "../../../../../store/appStore";
import { IRootState } from "../../../../../reducer/combineReducer";
import { ITableData } from "../../../../../../fetch-client-core/types/common.types";
import { Table } from "../../../../Common/Table/Table";
import { useDispatch, useSelector } from "react-redux";
import React, { useEffect, useState } from "react";

export const QueryParams = () => {
	const dispatch = useDispatch<AppDispatch>();

	const { params } = useSelector((state: IRootState) => state.requestData);
	const { selectedVariable } = useSelector(
		(state: IRootState) => state.variableData,
	);
	const [isBulkEdit, setIsBulkEdit] = useState(false);
	const [bulkText, setBulkText] = useState("");

	const onSelectChange = (index: number) => {
		let localTable = [...params];
		let rowData = localTable[index];
		localTable[index] = {
			isChecked: !rowData.isChecked,
			key: rowData.key,
			value: rowData.value,
		};
		dispatch(Actions.SetRequestParamsAction(localTable));
	};

	const onRowAdd = (event: any, index: number, isKey: boolean = true) => {
		let newRow: ITableData = {
			isChecked: false,
			key: "",
			value: "",
		};

		let localTable = addValue(event, index, isKey);

		if (localTable[index].key && localTable[index].value) {
			localTable.push(newRow);
		}

		dispatch(Actions.SetRequestParamsAction(localTable));
	};

	const onRowUpdate = (event: any, index: number, isKey: boolean = true) => {
		let localTable = addValue(event, index, isKey);
		dispatch(Actions.SetRequestParamsAction(localTable));
	};

	const addValue = (
		value: string,
		index: number,
		isKey: boolean,
	): ITableData[] => {
		let localTable = [...params];
		let rowData = localTable[index];
		localTable[index] = {
			isChecked: true,
			key: isKey ? value : rowData.key,
			value: !isKey ? value : rowData.value,
		};

		return localTable;
	};

	function deleteParam(index: number) {
		let localTable = [...params];
		localTable.splice(index, 1);
		dispatch(Actions.SetRequestParamsAction(localTable));
	}

	const tableToText = (data: ITableData[]): string => {
		const result = data
			.filter((row) => row.key)
			.map((row) =>
				row.isChecked ? `${row.key}=${row.value}` : `#${row.key}=${row.value}`,
			)
			.join("\n");

		return result;
	};

	const onBulkEditToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
		const checked = event.target.checked;

		if (checked) {
			const text = tableToText(params);
			setBulkText(text);
		} else {
			const parsed = textToTable(bulkText);
			dispatch(Actions.SetRequestParamsAction(parsed));
		}

		setIsBulkEdit(checked);
	};

	const textToTable = (text: string): ITableData[] => {
		const rows: ITableData[] = [];

		if (!text?.trim()) {
			return [
				{
					isChecked: false,
					key: "",
					value: "",
				},
			];
		}

		const lines = text.split(/\r\n|\n|\r/);

		for (const rawLine of lines) {
			let line = rawLine.trim();

			if (!line) {
				continue;
			}

			let isChecked = true;

			if (line.startsWith("#")) {
				isChecked = false;
				line = line.substring(1).trim();

				if (!line) {
					continue;
				}
			}

			const separatorIndex = line.indexOf("=");

			let key = "";
			let value = "";

			if (separatorIndex === -1) {
				key = line.trim();
			} else {
				key = line.substring(0, separatorIndex).trim();
				value = line.substring(separatorIndex + 1);
			}

			if (!key) {
				continue;
			}

			rows.push({
				isChecked,
				key,
				value,
			});
		}

		rows.push({
			isChecked: false,
			key: "",
			value: "",
		});

		return rows;
	};

	useEffect(() => {
		if (!isBulkEdit) {
			return undefined;
		}

		const timer = setTimeout(() => {
			dispatch(Actions.SetRequestParamsAction(textToTable(bulkText)));
		}, 300);

		return () => clearTimeout(timer);
	}, [bulkText, isBulkEdit]);

	const onBulkTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		setBulkText(event.target.value);
	};

	return (
		<>
			<div className="query-header">
				<div className="query-param-header">
					<label className="bulk-edit-toggle">
						<input
							type="checkbox"
							checked={isBulkEdit}
							onChange={(e) => {
								onBulkEditToggle(e);
							}}
						/>
						<span>Bulk Edit</span>
					</label>
				</div>
			</div>
			{isBulkEdit ? (
				<textarea
					className="bulk-edit-textarea"
					value={bulkText}
					onChange={onBulkTextChange}
					placeholder={`page=1\nlimit=10\nsort=name`}
					spellCheck={false}
				/>
			) : (
				<Table
					data={params}
					onSelectChange={onSelectChange}
					onRowAdd={onRowAdd}
					onRowUpdate={onRowUpdate}
					deleteData={deleteParam}
					readOnly={false}
					selectedVariable={selectedVariable}
					highlightNeeded={true}
				/>
			)}
		</>
	);
};

export default QueryParams;
