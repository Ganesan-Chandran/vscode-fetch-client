import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { ITableData } from "../../../../../Common/Table/types";
import { Table } from "../../../../../Common/Table/Table";
import { Actions } from "../../../../redux";
import vscode from "../../../../../Common/vscodeAPI";
import { requestTypes, responseTypes } from "../../../../../../../utils/configuration";

export const FormDataBody = () => {

  const dispatch = useDispatch();

  const { body, headers } = useSelector((state: IRootState) => state.requestData);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.formDataFileResponse) {
        dispatch(Actions.SetRequestFormDataAction(event.data.path, event.data.index));
      }
    });
  }, []);

  const onSelectChange = (index: number) => {
    let localbody = { ...body };
    if (localbody.formdata) {
      let localFormData = [...localbody.formdata];
      let rowData = localFormData[index];
      localFormData[index] = {
        isChecked: !rowData.isChecked,
        key: rowData.key,
        value: rowData.value,
        type: rowData.type
      };
      localbody.formdata = localFormData;
      dispatch(Actions.SetRequestBodyAction(localbody));
    }
  };

  const onSelectType = (type: string, index: number) => {
    let localbody = { ...body };
    if (localbody.formdata) {
      let localFormData = [...localbody.formdata];
      let rowData = localFormData[index];
      localFormData[index] = {
        isChecked: rowData.isChecked,
        key: rowData.key,
        value: "",
        type: type
      };
      localbody.formdata = localFormData;
      dispatch(Actions.SetRequestBodyAction(localbody));
    }
  };

  const onFileSelect = (index: number) => {
    vscode.postMessage({ type: requestTypes.formDataFileRequest, index: index });
  };

  const onRowAdd = (value: string, index: number, isKey: boolean = true) => {
    let newRow: ITableData = {
      isChecked: false,
      key: "",
      value: "",
      type: "Text"
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
        value: !isKey ? value : rowData.value,
        type: rowData.type
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
      if (contentTypeHeaderIndex !== -1 && localHeaders[contentTypeHeaderIndex].value.includes("multipart/form-data")) {
        return;
      }
      contentTypeHeaderIndex = headers.findIndex(item => item.key.trim().toLocaleLowerCase() === "content-type");
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
      type="formData"
      data={body.formdata ?? [{ isChecked: false, key: "", value: "" }]}
      onSelectChange={onSelectChange}
      onFileSelect={onFileSelect}
      onSelectType={onSelectType}
      onRowAdd={onRowAdd}
      onRowUpdate={onRowUpdate}
      deleteData={deleteParam}
      readOnly={false}
      selectedVariable={selectedVariable}
      highlightNeeded={true}
    />
  );
};