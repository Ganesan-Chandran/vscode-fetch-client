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
import { executeTests, setVariable } from '../../TestUI/TestPanel/helper';
import { formatDate } from '../../../../utils/helper';
import { GetDataFromHTML, GetDomainName, notesMaxLimit } from '../../Common/helper';
import { TextEditor } from '../../Common/TextEditor/TextEditor';
import { ICookie } from '../../Cookies/redux/types';
import { CookiesActions } from '../../Cookies/redux';
import { ITableData } from '../../Common/Table/types';

export const RequestPanel = () => {

  const dispatch = useDispatch();

  const [newReq, setNewReq] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);

  const requestData = useSelector((state: IRootState) => state.requestData);
  const responseData = useSelector((state: IRootState) => state.responseData);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);
  const { cookies } = useSelector((state: IRootState) => state.cookieData);
  const { parentSettings } = useSelector((state: IRootState) => state.reqColData);

  const selectRequestMethod = (evt: React.ChangeEvent<HTMLSelectElement>): void => {
    dispatch(Actions.SetRequestMethodAction(evt.target.value as MethodType));
  };

  const enterUrl = (value: string): void => {
    dispatch(Actions.SetRequestURLAction(value));
  };

  function addCookieHeader(currentCookie: ICookie) {
    let cookieHeader = "";
    currentCookie.data.forEach(item => {
      let index = item.value.indexOf(";");
      if (index !== -1) {
        let value = item.key + "=" + item.value.substring(0, index);
        cookieHeader = cookieHeader ? (cookieHeader + "; " + value) : value;
      }
    });
    if (cookieHeader) {
      let localTable = [...requestData.headers];
      let newRow: ITableData = {
        isChecked: true,
        isFixed: false,
        key: "Cookie",
        value: cookieHeader
      };

      let index = localTable.findIndex(item => item.key.toUpperCase() === "COOKIE");

      if (index === -1) {
        if (localTable[0].isFixed) {
          localTable.splice(1, 0, newRow);
        } else {
          localTable.unshift(newRow);
        }
      } else {
        localTable[index] = newRow;
      }

      dispatch(Actions.SetRequestHeadersAction(localTable));
    }
  }

  function removeCookieHeader() {
    let localTable = [...requestData.headers];
    let index = localTable.findIndex(item => item.key.toUpperCase() === "COOKIE");
    if (index !== -1) {
      localTable.splice(index, 1);
      dispatch(Actions.SetRequestHeadersAction(localTable));
    }
  }

  function checkCookieHeader() {
    if (cookies.length > 0) {
      try {
        let url = requestData.url.startsWith("http://") || requestData.url.startsWith("https:// ") ? requestData.url : "https://" + requestData.url;
        let domain = new URL(url);
        let name = domain.hostname.replace('www.', '');
        if (name) {
          let index = cookies.findIndex(item => item.name === name);
          if (index !== -1) {
            addCookieHeader(cookies[index]);
          } else {
            removeCookieHeader();
          }
        }
      } catch {
        removeCookieHeader();
      }
    } else {
      removeCookieHeader();
    }
  }

  useEffect(() => {
    checkCookieHeader();
  }, [cookies]);

  const onSendClick = () => {
    dispatch(ResponseActions.SetResponseLoadingAction(true));

    let reqData = { ...requestData };

    if (newReq) {
      reqData.id = uuidv4();
      reqData.name = reqData.url.trim();
      reqData.createdTime = formatDate();
      dispatch(Actions.SetRequestAction(reqData));
    }

    const data = GetDataFromHTML(reqData.notes);
    reqData.notes = data.length > notesMaxLimit ? "" : reqData.notes;

    vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: reqData, isNew: newReq, variableData: selectedVariable?.data, settings: parentSettings } });
    setNewReq(false);
  };

  useEffect(() => {
    if (responseData.loading === false && responseData.response.status !== 0) {
      if (requestData.tests.length - 1 > 0) {
        let testResult = executeTests(requestData.tests, responseData, selectedVariable.data);
        dispatch(ResponseActions.SetTestResultAction(testResult));
      }

      if (requestData.setvar.length - 1 > 0) {
        let variable = setVariable(selectedVariable, requestData.setvar, responseData);
        vscode.postMessage({ type: requestTypes.updateVariableRequest, data: variable });
      }
    }
  }, [responseData.headers]);

  useEffect(() => {
    if (responseData.cookies.length > 0) {
      let domainName = GetDomainName(requestData.url, responseData.cookies[0]);

      if (!domainName) {
        return;
      }

      let index = cookies.findIndex(item => item.name === domainName);

      let cookie: ICookie = {
        id: index !== -1 ? cookies[index].id : uuidv4(),
        name: domainName,
        data: responseData.cookies
      };

      let localData = [...cookies];
      if (index !== -1) {
        localData[index] = cookie;
      } else {
        localData.push(cookie);
      }

      CookiesActions.SetAllCookiesAction(localData);

      vscode.postMessage({ type: requestTypes.saveCookieRequest, data: cookie });
    }
  }, [responseData.cookies]);

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

  const handleKeypress = (charCode: number) => {
    if (charCode === 13 && isEnabled()) {
      onSendClick();
    }
  };

  function onBlur() {
    checkCookieHeader();
  }

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
          {            
            selectedVariable.id && <TextEditor
              varWords={selectedVariable.data.map(item => item.key)}
              placeholder="Enter request URL"
              onChange={enterUrl}
              value={requestData.url}
              onKeyPress={handleKeypress}
              onBlur={onBlur}
              focus={true}
            />
          }
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