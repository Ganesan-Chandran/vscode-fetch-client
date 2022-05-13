import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import { v4 as uuidv4 } from 'uuid';
import { IRootState } from "../../../reducer/combineReducer";
import { ResponseActions } from "../../ResponseUI/redux";
import { Actions } from "../redux";
import { MethodType } from "../redux/types";
import { requestMethods } from "./consts";
import vscode from '../../Common/vscodeAPI';
import "./style.css";
import { requestTypes } from '../../../../utils/configuration';
import { executeTests } from '../../TestUI/TestPanel/helper';
import { formatDate } from '../../../../utils/helper';
import { getDataFromHTML, notesMaxLimit } from '../../Common/helper';

export const RequestPanel = () => {

  const dispatch = useDispatch();

  const [newReq, setNewReq] = useState(false);

  const requestData = useSelector((state: IRootState) => state.requestData);
  const responseData = useSelector((state: IRootState) => state.responseData);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

  const selectRequestMethod = (evt: React.ChangeEvent<HTMLSelectElement>): void => {
    dispatch(Actions.SetRequestMethodAction(evt.target.value as MethodType));
  };

  const enterRequestUrl = (evt: React.ChangeEvent<HTMLInputElement>): void => {
    dispatch(Actions.SetRequestURLAction(evt.target.value));
  };

  const onSendClick = () => {
    dispatch(ResponseActions.SetResponseLoadingAction(true));
    let reqData = { ...requestData };
    if (newReq) {
      reqData.id = uuidv4();
      reqData.name = reqData.url;
      reqData.createdTime = formatDate();
      dispatch(Actions.SetRequestAction(reqData));
    }

    const data = getDataFromHTML(reqData.notes);
    reqData.notes = data.length > notesMaxLimit ? "" : reqData.notes;

    vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: reqData, isNew: newReq, variableData: selectedVariable?.data } });
    setNewReq(false);
  };

  useEffect(() => {
    if (responseData.loading === false && responseData.response.status !== 0) {
      if (requestData.tests.length - 1 > 0) {
        let testResult = executeTests(requestData.tests, responseData, selectedVariable.data);
        dispatch(ResponseActions.SetTestResultAction(testResult));
      }
    }
  }, [responseData.headers]);

  useEffect(() => {
    let reqId = document.title.split(":")[0];
    if (reqId === "undefined") {
      setNewReq(true);
    }
  }, []);

  const isEnabled = (): boolean => {
    if (responseData.loading === true) {
      return false;
    }

    if (requestData.url.length > 0) {
      return true;
    }

    return false;
  };

  const handleKeypress = (e: any) => {
    if (e.charCode === 13 && isEnabled()) {
      onSendClick();
    }
  };

  return (
    <div className="request-panel">
      <div className="request-container">
        <div className="request-drop-down-panel">
          <select
            className="request-method-drop-down"
            onChange={selectRequestMethod}
            value={requestData.method}
          >
            {requestMethods.map(({ value, name }) => (
              <option value={value} key={value}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="request-url-panel">
          <input
            placeholder="Enter request URL"
            className="request-url-text"
            value={requestData.url}
            onChange={enterRequestUrl}
            onKeyPress={handleKeypress}
          />
        </div>
        <div className="request-send-panel">
          <button
            type="submit"
            className="request-send-button"
            onClick={onSendClick}
            disabled={isEnabled() ? false : true}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};