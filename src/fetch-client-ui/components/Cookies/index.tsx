import React, { useEffect, useRef, useState } from "react";
import { requestTypes, responseTypes } from "../../../utils/configuration";
import vscode from "../Common/vscodeAPI";
import { ICookie } from "./redux/types";
import { InitialCookie } from "./redux/reducer";
import { ResponseTable } from "../Common/Table/ResponseTable";
import "./style.css";

const ManageCookies = () => {

  const [isDone, setDone] = useState(false);
  const [cookies, _setCookies] = useState<ICookie[]>(null);
  const cookiesRef = useRef(cookies);
  const setCookies = (data: ICookie[]) => {
    cookiesRef.current = data;
    _setCookies(data);
  };

  const [currentCookie, setCurrentCookie] = useState<ICookie>(InitialCookie);
  const [cookieId, setSelecetdCookieId] = useState("");


  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getAllCookiesResponse) {
        let cookies = event.data.cookies as ICookie[];
        setCookies(cookies);
      } else if (event.data && event.data.type === responseTypes.deleteCookieByIdResponse) {
        setDone(true);
        let localData = [...cookiesRef.current];
        let index = localData.findIndex(item => item.id === event.data.id);
        if (index !== -1) {
          localData.splice(index, 1);
        }
        setCookies(localData);
      } else if (event.data && event.data.type === responseTypes.deleteAllCookieResponse) {
        setDone(true);
        let localData = [...cookiesRef.current];
        localData.length = 0;
        setCookies(localData);
      }
    });

    vscode.postMessage({ type: requestTypes.getAllCookiesRequest });
  }, []);

  useEffect(() => {
    if (cookies && cookies.length > 0) {
      let id = document.title.split(":")[1];
      if (id !== "undefined" && id !== '[object Object]') {
        setSelecetdCookieId(id);
        setCurrentCookie(cookies.find(item => item.id === id));
      } else {
        setSelecetdCookieId(cookies[0].id);
        setCurrentCookie(cookies[0]);
      }
    } else {
      setCurrentCookie(InitialCookie);
      setSelecetdCookieId("");
    }
  }, [cookies]);

  function onSubmitClick() {
    vscode.postMessage({ type: requestTypes.deleteCookieByIdRequest, data: currentCookie.id });
  }

  function onDeleteAllClick() {
    vscode.postMessage({ type: requestTypes.deleteAllCookieRequest });
  }

  function isDisabled(): boolean {
    if (currentCookie && !currentCookie.id) {
      return true;
    }

    return false;
  }

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelecetdCookieId(event.target.value);
    setCurrentCookie(cookies.find(item => item.id === event.target.value));
    setDone(false);
  };

  return (
    <div className="cookie-panel">
      <div className="var-header">Manage Cookies</div>
      {
        cookies && cookies.length > 0 ?
          <>
            <div className="variable-panel-name">
              <span className="addto-label">Cookie :</span>
              <select
                className="addto-select cookie-select"
                required={true}
                value={cookieId}
                onChange={(e) => onSelect(e)}
              >
                {
                  cookies.map((param: ICookie, index: number) => {
                    return (
                      <option
                        key={index + param.name}
                        value={param.id}
                      >
                        {param.name}
                      </option>
                    );
                  })
                }
              </select>
            </div>
            <div className="var-tbl-panel">
              {currentCookie && currentCookie.data && currentCookie.data.length && <ResponseTable
                data={currentCookie.data}
                readOnly={true}
                type="resCookies"
                headers={{ key: "Name", value: "Value", value1: "Details" }}
              />}
            </div>
            <div className="button-panel cookie-btn-panel">
              <button
                type="submit"
                className="request-send-button"
                onClick={onSubmitClick}
                disabled={isDisabled()}
              >
                Delete
              </button>
              <button
                type="submit"
                className="request-send-button delete-all-button"
                onClick={onDeleteAllClick}
                disabled={isDisabled()}
              >
                Delete All
              </button>
            </div>
            <div className="message-panel">
              {isDone && (<span className="success-message">Deleted successfully</span>)}
            </div>
          </>
          :
          <div className="no-cookie-text">{"No Cookies Available"}</div>
      }
    </div>
  );
};

export default ManageCookies;