import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { ITableData } from "../../../../../Common/Table/types";
import { Table } from "../../../../../Common/Table/Table";
import { Actions, InitialParams } from "../../../../redux";

export const UrlEncoded = () => {
  const dispatch = useDispatch();
  const { body } = useSelector((state: IRootState) => state.requestData);

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

  const onRowAdd = (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) => {
    let newRow: ITableData = {
      isChecked: false,
      key: "",
      value: ""
    };

    let localbody = { ...body };

    let localTable = addValue(event.target.value, index, isKey);

    if (localTable[index].key && localTable[index].value) {
      localTable.push(newRow);
    }

    localbody.urlencoded = localTable;

    dispatch(Actions.SetRequestBodyAction(localbody));
  };

  const onRowUpdate = (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) => {
    let localbody = { ...body };
    let localTable = addValue(event.target.value, index, isKey);
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
      data={body.urlencoded ?? InitialParams}
      onSelectChange={onSelectChange}
      onRowAdd={onRowAdd}
      onRowUpdate={onRowUpdate}
      deleteData={deleteParam}
      readOnly={false}
    />
  );
};