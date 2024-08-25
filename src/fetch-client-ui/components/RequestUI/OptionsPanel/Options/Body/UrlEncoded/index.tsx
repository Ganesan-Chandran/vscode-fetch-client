import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { Table } from "../../../../../Common/Table/Table";
import { ITableData } from "../../../../../Common/Table/types";
import { Actions } from "../../../../redux";

export const UrlEncoded = () => {

	const dispatch = useDispatch();
	const { body } = useSelector((state: IRootState) => state.requestData);
	const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

	const onSelectChange = (index: number) => {
		let localbody = { ...body };
		if (localbody.urlencoded) {
			let localUrlEncoded = [...localbody.urlencoded];
			let rowData = localUrlEncoded[index];
			localUrlEncoded[index] = {
				isChecked: !rowData.isChecked,
				key: rowData.key,
				value: rowData.value
			};
			localbody.formdata = localUrlEncoded;
			dispatch(Actions.SetRequestBodyAction(localbody));
		}
	};

	const onRowAdd = (value: string, index: number, isKey: boolean = true) => {
		let newRow: ITableData = {
			isChecked: false,
			key: "",
			value: ""
		};

		let localbody = { ...body };

		let localTable = addValue(value, index, isKey);

		if (localTable[index].key && localTable[index].value) {
			localTable.push(newRow);
		}

		localbody.urlencoded = localTable;

		dispatch(Actions.SetRequestBodyAction(localbody));
	};

	const onRowUpdate = (value: string, index: number, isKey: boolean = true) => {
		let localbody = { ...body };
		let localTable = addValue(value, index, isKey);
		localbody.urlencoded = localTable;

		dispatch(Actions.SetRequestBodyAction(localbody));
	};

	const addValue = (value: string, index: number, isKey: boolean): ITableData[] => {
		let localbody = { ...body };
		if (localbody.urlencoded) {
			let localUrlEncoded = [...localbody.urlencoded];
			let rowData = localUrlEncoded[index];
			localUrlEncoded[index] = {
				isChecked: true,
				key: isKey ? value : rowData.key,
				value: !isKey ? value : rowData.value
			};
			return localUrlEncoded;
		}

		return [];
	};

	function deleteParam(index: number) {
		let localbody = { ...body };
		if (localbody.urlencoded) {
			let localUrlEncoded = [...localbody.urlencoded];
			localUrlEncoded.splice(index, 1);
			localbody.urlencoded = localUrlEncoded;
			dispatch(Actions.SetRequestBodyAction(localbody));
		}
	}

	return (
		<Table
			data={body.urlencoded ?? [{ isChecked: false, key: "", value: "" }]}
			onSelectChange={onSelectChange}
			onRowAdd={onRowAdd}
			onRowUpdate={onRowUpdate}
			deleteData={deleteParam}
			readOnly={false}
			selectedVariable={selectedVariable}
			highlightNeeded={true}
		/>
	);
};
