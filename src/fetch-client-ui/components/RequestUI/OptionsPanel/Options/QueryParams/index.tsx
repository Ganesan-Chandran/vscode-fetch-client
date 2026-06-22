import { Actions } from "../../../redux";
import { AppDispatch } from '../../../../../store/appStore';
import { IRootState } from "../../../../../reducer/combineReducer";
import { ITableData } from '../../../../../../fetch-client-core/types/common.types';
import { Table } from "../../../../Common/Table/Table";
import { useDispatch, useSelector } from "react-redux";
import React from 'react';

export const QueryParams = () => {

	const dispatch = useDispatch<AppDispatch>();

	const { params } = useSelector((state: IRootState) => state.requestData);
	const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

	const onSelectChange = (index: number) => {
		let localTable = [...params];
		let rowData = localTable[index];
		localTable[index] = {
			isChecked: !rowData.isChecked,
			key: rowData.key,
			value: rowData.value
		};
		dispatch(Actions.SetRequestParamsAction(localTable));
	};

	const onRowAdd = (event: any, index: number, isKey: boolean = true) => {
		let newRow: ITableData = {
			isChecked: false,
			key: "",
			value: ""
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

	const addValue = (value: string, index: number, isKey: boolean): ITableData[] => {
		let localTable = [...params];
		let rowData = localTable[index];
		localTable[index] = {
			isChecked: true,
			key: isKey ? value : rowData.key,
			value: !isKey ? value : rowData.value
		};

		return localTable;
	};

	function deleteParam(index: number) {
		let localTable = [...params];
		localTable.splice(index, 1);
		dispatch(Actions.SetRequestParamsAction(localTable));
	}

	return (
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
	);
};

export default QueryParams;