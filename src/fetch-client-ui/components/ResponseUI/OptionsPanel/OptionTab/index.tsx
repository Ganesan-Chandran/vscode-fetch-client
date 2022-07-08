import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from "react-redux";
import { IRootState } from "../../../../reducer/combineReducer";
import { curlResponseOptions, responseOptions } from "../../ResponsePanel/consts";
import { ReactComponent as MenuLogo } from '../../../../../../icons/menu.svg';
import { ReactComponent as CodeLogo } from '../../../../../../icons/code.svg';
import "./style.css";
import { FormatBytes, GetResponseTime } from "./util";
import vscode from '../../../Common/vscodeAPI';
import { requestTypes } from '../../../../../utils/configuration';

export const ResponseOptionsTab = (props: any) => {

  const { selectedTab, setSelectedTab, isVerticalLayout } = props;

  const { headers, response, testResults, cookies } = useSelector((state: IRootState) => state.responseData);
  const { url } = useSelector((state: IRootState) => state.requestData);

  const [menuShow, setMenuShow] = useState(false);

  const wrapperRef = useRef(null);

  function getClassName(status: number): string {
    if (response.isError) {
      return "response-params error-text";
    }

    if (status <= 399) {
      return "response-params";
    }

    return "response-params error-text";

  }

  function responseParamsRender() {
    return (
      <div className={isVerticalLayout ? "response-params-panel-vertical" : "response-params-panel"}>
        <label>Status:<label className={getClassName(response.status)}>{response.isError ? "ERROR" : (response.status === 0 ? "" : (response.status + " " + response.statusText))}</label></label>
        <label>Time:<label className={response.isError ? "response-params error-text" : "response-params"}>{response.isError ? "0 ms" : GetResponseTime(response.duration)}</label></label>
        <label>Size:<label className={response.isError ? "response-params error-text" : "response-params"}>{response.size ? FormatBytes(parseInt(response.size)) : ""}</label></label>
      </div>
    );
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside, false);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, false);
    };
  }, []);

  function handleClickOutside(evt: any) {
    if (wrapperRef.current && !wrapperRef.current.contains(evt.target)) {
      setMenuShow(false);
    }
  }

  function setShowMenu(evt: any) {
    evt.preventDefault();
    setMenuShow(!menuShow);
  }

  function onSaveResponse(evt: any) {
    evt.preventDefault();
    vscode.postMessage({ type: requestTypes.saveResponseRequest, data: response.responseData, fileType: response.responseType?.format });
    setMenuShow(false);
  }

  function onSaveTestResponse(evt: any) {
    evt.preventDefault();
    vscode.postMessage({ type: requestTypes.saveTestResponseRequest, data: JSON.stringify(testResults) });
    setMenuShow(false);
  }

  const codeSnippetCss = () => {
    return url ? (selectedTab === "codesnippet" ? "code-snippet-icon code-snippet-icon-clicked" : "code-snippet-icon") : "code-snippet-icon-disabled";
  };

  function onSelectTab() {
    if (url) {
      setSelectedTab("codesnippet");
    }
  }
  function getResponseOptions(): { name: string; value: string; }[] {
    return props.isCurl ? curlResponseOptions : responseOptions;
  }

  return (
    <>
      {
        isVerticalLayout ?
          responseParamsRender()
          :
          <></>
      }
      <div className="tab-options">
        {
          getResponseOptions().map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedTab(option.value)}
              className={
                selectedTab === option.value
                  ? "option option-selected"
                  : "option"
              }
            >
              <div className="option-names">
                {option.name}
                {option.value === "cookies" && response.responseData ? (
                  <div className="header-count">
                    (
                    {
                      cookies.length
                    }
                    )
                  </div>
                ) : null}
                {option.value === "headers" && response.responseData ? (
                  <div className="header-count">
                    (
                    {
                      headers.length
                    }
                    )
                  </div>
                ) : null}
                {option.value === "testresults" && response.responseData ? (
                  <div className="header-count">
                    (
                    {
                      testResults.length
                    }
                    )
                  </div>
                ) : null}
              </div>
            </button>
          ))}
        {
          !isVerticalLayout
            ?
            responseParamsRender()
            :
            <></>
        }
        <div className="menu-panel">
          <CodeLogo className={codeSnippetCss()} title="Code Snippet" onClick={onSelectTab} />
          <div className="dropdown" ref={wrapperRef}>
            <MenuLogo className="res-menu" title="Menu" onClick={(e) => setShowMenu(e)} />
            {menuShow && (<div id="res-menu" className={"dropdown-content res-drop-down-menu show"}>
              <button className="save-to-file-button" onClick={(e) => onSaveResponse(e)} disabled={response.responseData && !response.responseType.isBinaryFile && !response.isError ? false : true}>Save Response to File</button>
              {!props.isCurl && <button className="save-to-file-button" onClick={(e) => onSaveTestResponse(e)} disabled={testResults.length > 0 ? false : true}>Save Tests to File</button>}
            </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};