import React from 'react';
import { ITableData } from "../../../../Common/Table/types";
import { Table } from "../../../../Common/Table/Table";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { Actions } from "../../../redux";

export const HeadersPanel = () => {

  const dispatch = useDispatch();

  const { headers } = useSelector((state: IRootState) => state.requestData);

  const onSelectChange = (index: number) => {
    let localTable = [...headers];
    let rowData = localTable[index];
    localTable[index] = {
      isChecked: !rowData.isChecked,
      key: rowData.key,
      value: rowData.value
    };
    dispatch(Actions.SetRequestHeadersAction(localTable));
  };

  const onRowAdd = (event: React.ChangeEvent<HTMLInputElement> | string, index: number, isKey: boolean = true) => {
    let newRow: ITableData = {
      isChecked: false,
      key: "",
      value: ""
    };

    let value: any;

    if (typeof event === 'string' || event instanceof String) {
      value = event;
    }
    else {
      value = event.target.value;
    }

    let localTable = addValue(value, index, isKey);

    if (localTable[index].key && localTable[index].value) {
      localTable.push(newRow);
    }

    dispatch(Actions.SetRequestHeadersAction(localTable));
  };

  const onRowUpdate = (event: React.ChangeEvent<HTMLInputElement> | string, index: number, isKey: boolean = true) => {
    let value: any;

    if (typeof event === 'string' || event instanceof String) {
      value = event;
    }
    else {
      value = event.target.value;
    }

    let localTable = addValue(value, index, isKey);
    dispatch(Actions.SetRequestHeadersAction(localTable));
  };

  const addValue = (value: string, index: number, isKey: boolean): ITableData[] => {
    let localTable = [...headers];
    let rowData = localTable[index];
    localTable[index] = {
      isChecked: true,
      key: isKey ? value : rowData.key,
      value: !isKey ? value : rowData.value
    };

    return localTable;
  };

  function deleteParam(index: number) {
    let localTable = [...headers];
    localTable.splice(index, 1); 
    dispatch(Actions.SetRequestHeadersAction(localTable));
  }

  return (
    <Table
      data={headers}
      onSelectChange={onSelectChange}
      onRowAdd={onRowAdd}
      onRowUpdate={onRowUpdate}
      deleteData={deleteParam}
      readOnly={false}
      type="reqHeaders"
    />
  );
};