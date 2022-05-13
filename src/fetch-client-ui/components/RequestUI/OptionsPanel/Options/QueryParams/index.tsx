import React from 'react';
import { ITableData } from "../../../../Common/Table/types";
import { Table } from "../../../../Common/Table/Table";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { Actions } from "../../../redux";

export const QueryParams = () => {

  const dispatch = useDispatch();

  const { params } = useSelector((state: IRootState) => state.requestData);

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

  const onRowAdd = (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) => {
    let newRow: ITableData = {
      isChecked: false,
      key: "",
      value: ""
    };

    let localTable = addValue(event.target.value, index, isKey);

    if (localTable[index].key && localTable[index].value) {
      localTable.push(newRow);
    }

    dispatch(Actions.SetRequestParamsAction(localTable));
  };

  const onRowUpdate = (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) => {
    let localTable = addValue(event.target.value, index, isKey);
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
    />
  );
};