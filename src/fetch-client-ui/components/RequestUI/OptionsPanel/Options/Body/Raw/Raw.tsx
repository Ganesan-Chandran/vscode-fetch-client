import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { MonacoEditor } from "../../../../../Common/Editor";
import { Actions } from "../../../../redux";
import { FileTypes } from "../Binary/consts";
import { requestBodyRaw } from "../consts";
import "./style.css";

export const Raw = (props: any) => {

  const dispatch = useDispatch();

  const requestData = useSelector((state: IRootState) => state.requestData);

  const onContentChange = (value: string) => {
    dispatch(Actions.SetRequestRawAction(value));
  };

  useEffect(() => {
    if (requestData.body.bodyType === "raw" && requestData.body.raw.lang) {
      let localHeaders = [...requestData.headers];
      let contentTypeHeaderIndex = requestData.headers.findIndex(item => item.isChecked && item.key.trim().toLocaleLowerCase() === "content-type");
      if (contentTypeHeaderIndex !== -1) {
        localHeaders[contentTypeHeaderIndex] = {
          isChecked: true,
          key: "Content-Type",
          value: FileTypes[requestData.body.raw.lang],
          isFixed: false
        };
      } else {
        localHeaders.splice(localHeaders.length - 1, 0, {
          isChecked: true,
          key: "Content-Type",
          value: FileTypes[requestData.body.raw.lang],
          isFixed: false
        });
      }
      dispatch(Actions.SetRequestHeadersAction(localHeaders));
    }
  }, [requestData.body.raw.lang]);

  return (
    <div className="raw-panel">
      <MonacoEditor
        value={requestData.body.raw.data}
        language={requestData.body.raw.lang ?? requestBodyRaw[1].value}
        readOnly={false}
        copyButtonVisible={false}
        format={props.format}
        onContentChange={onContentChange}
      />
    </div>
  );
};