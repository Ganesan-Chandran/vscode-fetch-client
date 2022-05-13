import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { ITableData } from "../../../../../Common/Table/types";
import { Table } from "../../../../../Common/Table/Table";
import { Actions, InitialParams } from "../../../../redux";

export const FormDataBody = () => {

  const dispatch = useDispatch();
  const { body } = useSelector((state: IRootState) => state.requestData);

  const onSelectChange = (index: number) => {
    let localbody = { ...body };
    if (localbody.formdata) {
      let localFormData = [...localbody.formdata];
      let rowData = localFormData[index];
      localFormData[index] = {
        isChecked: !rowData.isChecked,
        key: rowData.key,
        value: rowData.value
      };
      localbody.formdata = localFormData;
      dispatch(Actions.SetRequestBodyAction(localbody));
    }
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

    dispatch(Actions.SetRequestBodyAction({ ...body, formdata: localTable }));
  };

  const onRowUpdate = (event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) => {
    let localTable = addValue(event.target.value, index, isKey);
    dispatch(Actions.SetRequestBodyAction({ ...body, formdata: localTable }));
  };

  const addValue = (value: string, index: number, isKey: boolean): ITableData[] => {
    let localbody = { ...body };
    if (localbody.formdata) {
      let localFormData = [...localbody.formdata];
      let rowData = localFormData[index];
      localFormData[index] = {
        isChecked: true,
        key: isKey ? value : rowData.key,
        value: !isKey ? value : rowData.value
      };
      return localFormData;
    }

    return [];
  };

  function deleteParam(index: number) {
    let localbody = { ...body };
    if (localbody.formdata) {
      let localFormData = [...localbody.formdata];
      localFormData.splice(index, 1);
      localbody.formdata = localFormData;
      dispatch(Actions.SetRequestBodyAction(localbody));
    }
  }


  return (
    <Table
      data={body.formdata ?? InitialParams}
      onSelectChange={onSelectChange}
      onRowAdd={onRowAdd}
      onRowUpdate={onRowUpdate}
      deleteData={deleteParam}
      readOnly={false}
    />
  );
};