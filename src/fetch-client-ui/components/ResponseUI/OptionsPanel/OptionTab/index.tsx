import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from "react-redux";
import { IRootState } from "../../../../reducer/combineReducer";
import { curlResponseOptions, responseOptions } from "../../ResponsePanel/consts";
import { ReactComponent as CodeLogo } from '../../../../../../icons/code.svg';
import "./style.css";
import { FormatBytes, GetResponseTime } from "./util";
import vscode from '../../../Common/vscodeAPI';
import { requestTypes } from '../../../../../utils/configuration';
import { getColFolDotMenu } from '../../../Common/icons';

export const ResponseOptionsTab = (props: any) => {

  const { selectedTab, setSelectedTab, isVerticalLayout } = props;

  const { headers, response, testResults, cookies } = useSelector((state: IRootState) => state.responseData);
  const { url } = useSelector((state: IRootState) => state.requestData);

  const [menuShow, setMenuShow] = useState(false);
  const [codeMenuShow, setCodeMenuShow] = useState(false);

  const wrapperRef = useRef(null);
  const codeWrapperRef = useRef(null);

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

    if (codeWrapperRef.current && !codeWrapperRef.current.contains(evt.target)) {
      setCodeMenuShow(false);
    }
  }

  function setShowMenu(evt: any) {
    evt.preventDefault();
    setMenuShow(!menuShow);
    setCodeMenuShow(false);
  }

  function setCodeShowMenu(evt: any) {
    evt.preventDefault();
    setMenuShow(false);
    setCodeMenuShow(!codeMenuShow);
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

  function onSelectTab(opt: string) {
    setSelectedTab(opt);
    setCodeMenuShow(false);
  }

  function isDisabled(opt: string) {
    if (opt === "codesnippet" && url) {
      return false;
    }

    if (opt === "codetype" && url ) { //&& !response.isError && isJson(response.responseData)) {
      return false;
    }

    return true;
  }

  function isJson(response: any) {
    try {
      if (response) {
        JSON.parse(response);
        return true;
      }
      return false;
    } catch {
      return false;
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
          <div>
            <div className="dropdown" ref={codeWrapperRef}>
              <CodeLogo title="Code Snippet" className="code-snippet-icon" onClick={setCodeShowMenu} />
              {codeMenuShow && (<div id="res-menu" className={"dropdown-content res-code-drop-down-menu show"}>
                <button className="save-to-file-button" disabled={isDisabled("codesnippet")} onClick={() => onSelectTab("codesnippet")}>Code Snippet</button>
                <button className="save-to-file-button" disabled={isDisabled("codetype")} onClick={() => onSelectTab("codetype")}>Code Types</button>
              </div>
              )}
            </div>
            <div className="dropdown" ref={wrapperRef}>
              {getColFolDotMenu("res-menu", "Menu", "hamburger-menu", (e) => { e.stopPropagation(); e.preventDefault(); }, (e) => setShowMenu(e))}
              {menuShow && (<div id="res-menu" className={"dropdown-content res-drop-down-menu show"}>
                <button className="save-to-file-button" onClick={(e) => onSaveResponse(e)} disabled={response.responseData && !response.responseType.isBinaryFile && !response.isError ? false : true}>Save Response to File</button>
                {!props.isCurl && <button className="save-to-file-button" onClick={(e) => onSaveTestResponse(e)} disabled={testResults.length > 0 ? false : true}>Save Tests to File</button>}
              </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};