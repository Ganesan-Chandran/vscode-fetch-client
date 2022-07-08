import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { ITableData } from "../../../../../Common/Table/types";
import { Table } from "../../../../../Common/Table/Table";
import { Actions } from "../../../../redux";

export const UrlEncoded = () => {

  const dispatch = useDispatch();
  const { body, headers } = useSelector((state: IRootState) => state.requestData);
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

  useEffect(() => {
    if (body.bodyType === "formurlencoded" && body.urlencoded?.length > 1) {
      let localHeaders = [...headers];
      let contentTypeHeaderIndex = headers.findIndex(item => item.isChecked && item.key.trim().toLocaleLowerCase() === "content-type");
      if (contentTypeHeaderIndex !== -1 && localHeaders[contentTypeHeaderIndex].key === "application/x-www-form-urlencoded") {
        return;
      }
      if (contentTypeHeaderIndex !== -1) {
        localHeaders[contentTypeHeaderIndex] = {
          isChecked: true,
          key: "Content-Type",
          value: "application/x-www-form-urlencoded",
          isFixed: false
        };
      } else {
        localHeaders.splice(localHeaders.length - 1, 0, {
          isChecked: true,
          key: "Content-Type",
          value: "application/x-www-form-urlencoded",
          isFixed: false
        });
      }
      dispatch(Actions.SetRequestHeadersAction(localHeaders));
    }
  }, [body.urlencoded]);


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