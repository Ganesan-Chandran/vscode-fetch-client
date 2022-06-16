import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { ITableData } from "../../../../../Common/Table/types";
import { Table } from "../../../../../Common/Table/Table";
import { Actions, InitialParams } from "../../../../redux";

export const FormDataBody = () => {

  const dispatch = useDispatch();

  const { body, headers } = useSelector((state: IRootState) => state.requestData);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

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

  const onRowAdd = (value: string, index: number, isKey: boolean = true) => {
    let newRow: ITableData = {
      isChecked: false,
      key: "",
      value: ""
    };

    let localTable = addValue(value, index, isKey);

    if (localTable[index].key && localTable[index].value) {
      localTable.push(newRow);
    }

    dispatch(Actions.SetRequestBodyAction({ ...body, formdata: localTable }));
  };

  const onRowUpdate = (value: string, index: number, isKey: boolean = true) => {
    let localTable = addValue(value, index, isKey);
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

  useEffect(() => {
    if (body.bodyType === "formdata" && body.formdata?.length > 1) {
      let localHeaders = [...headers];
      let contentTypeHeaderIndex = headers.findIndex(item => item.isChecked && item.key.trim().toLocaleLowerCase() === "content-type");
      if(contentTypeHeaderIndex !== -1 && localHeaders[contentTypeHeaderIndex].key === "multipart/form-data"){
        return;
      }
      if (contentTypeHeaderIndex !== -1) {
        localHeaders[contentTypeHeaderIndex] = {
          isChecked: true,
          key: "Content-Type",
          value: "multipart/form-data",
          isFixed: false
        };
      } else {
        localHeaders.splice(localHeaders.length - 1, 0, {
          isChecked: true,
          key: "Content-Type",
          value: "multipart/form-data",
          isFixed: false
        });
      }
      dispatch(Actions.SetRequestHeadersAction(localHeaders));
    }
  }, [body.formdata]);


  return (
    <Table
      data={body.formdata ?? InitialParams}
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