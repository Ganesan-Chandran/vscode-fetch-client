import React, { useState } from 'react';
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { MonacoEditor } from "../../../../Common/Editor";
import { responseType } from "./consts";
import FetchClientIcon from "../../../../../../../icons/fetch-client.png";
import { maxDisplayResponseLimitInBytes } from '../../../ResponsePanel/consts';
import { requestTypes } from '../../../../../../utils/configuration';
import vscode from '../../../../Common/vscodeAPI';
import { JSONViewer } from '../../../../Common/Viewer/JSONViewer';
import { HTMLViewer } from '../../../../Common/Viewer/HTMLViewer';
import { XMLViewer } from '../../../../Common/Viewer/XMLViewer';
import { ReactComponent as ExpandLogo } from '../../../../../../../icons/expand.svg';
import { ReactComponent as CollapseLogo } from '../../../../../../../icons/collapse.svg';
import "./style.css";

export const ResponseSection = (props: any) => {

  const { response, loading } = useSelector((state: IRootState) => state.responseData);
  const { theme, horizontalLayout } = useSelector((state: IRootState) => state.uiData);

  const [viewType, setType] = useState("raw");
  const [fullScreenMode, setFullScreenMode] = useState(false);

  const editor = useMemo(() => {
    return <MonacoEditor
      value={response.responseData ?? ""}
      language={response.responseType?.format ? response.responseType.format : responseType[1].value}
      readOnly={true}
      copyButtonVisible={response.responseData ? true : false}
      format={response.responseData ? true : false}
    />;
  }, [response.responseData]);


  function onDownloadFile() {
    vscode.postMessage({ type: requestTypes.downloadFileTypeRequest, resData: response.responseData, fileType: response.responseType?.format });
  }

  function onCancelRequest() {
    vscode.postMessage({ type: requestTypes.cancelRequest });
  }

  function onTextResponseClick() {
    setType("raw");
  }

  function onJsonViewResponseClick() {
    setType("viewer");
  }

  function isPreViewVisible(): boolean {
    return (response.responseType?.format === "json" || response.responseType?.format === "html" || response.responseType?.format === "xml");
  }

  function onFullScreenClick() {
    let responseSection = document.getElementById("response-section-panel");
    if (responseSection) {
      if (fullScreenMode) {
        responseSection.classList.remove("response-section-panel-full-screen");
        responseSection.classList.add("res-visible");
        document.body.classList.remove("body-full-screen");
      } else {
        responseSection.classList.add("response-section-panel-full-screen");
        responseSection.classList.remove("res-visible");
        document.body.classList.add("body-full-screen");
      }
      setFullScreenMode(!fullScreenMode);
    }
  }

  function getLoadingSection() {
    return (<div className="response-header-label">
      <div className="arrow-4"></div>
      <span className="fetch-data-text">{"Fetching data ..."}</span>
      {!props.isCurl && <div className="cancel-button-panel">
        <button
          type="submit"
          className="file-reset-text"
          onClick={() => onCancelRequest()}
        >
          Cancel Request
        </button>
      </div>}
    </div>);
  }

  function getIdealSection() {
    return (<div className='fetch-image-panel'>
      <img src={FetchClientIcon} className="fetch-client-image" />
      <span className="fetch-data-text">{props.isCurl ? "Enter the curl command and click Run to get a response." : "Enter the URL and click Send to get a response."}</span>
    </div>);
  }

  function getErrorSection() {
    return (<div className='res-not-support-panel'>
      <div className="res-not-support-text error-text">{response.responseData}</div>
    </div>);
  }

  function getBinaryResponseSection() {
    return (<div className='res-not-support-panel'>
      <div className="res-not-support-text">{"View response is not supported for 'file' response type."}</div>
      <div className="res-not-support-text">{"Please download it."}</div>
      <button
        type="submit"
        className="request-send-button res-not-support-download"
        onClick={() => onDownloadFile()}
      >
        Download
      </button>
    </div>);
  }

  function getMaxSizeResponseSection() {
    return (<div className='res-not-support-panel'>
      <div className="res-not-support-text">{"View response is not supported on large files (> 5MB)."}</div>
      <div className="res-not-support-text">{"Please download it."}</div>
      <button
        type="submit"
        className="request-send-button"
        onClick={() => onDownloadFile()}
      >
        Download
      </button>
    </div>);
  }

  function getPreviewHeaderSection() {
    return (<div className="toggle">
      <input type="radio" name="sizeBy" value="weight" id="sizeWeight" onChange={onTextResponseClick} checked={viewType === "raw"} />
      <label htmlFor="sizeWeight">Raw View</label>
      <input type="radio" name="sizeBy" value="dimensions" onChange={onJsonViewResponseClick} checked={viewType !== "raw"} id="sizeDimensions" />
      <label htmlFor="sizeDimensions">{response.responseType?.format === "html" ? "HTML Preview" : "Tree View"}</label>
    </div>);
  }

  function getEditorPanelCss() {
    if (viewType === "raw") {
      if (fullScreenMode) {
        return "res-visible";
      }

      if (horizontalLayout) {
        return "res-visible";
      } else {
        return "res-visible-inside";
      }
    }
    return "res-hidden";
  }

  function getViewerPanelCss() {
    if (viewType !== "raw") {
      if (fullScreenMode) {
        return "res-visible";
      }

      if (horizontalLayout) {
        return "res-visible";
      } else {
        return "res-visible-inside";
      }
    }
    return "res-hidden";
  }

  function getResponseSection() {
    return (<div className={isPreViewVisible() ? "response-editor" : "response-editor-without-preview"}>
      <div className={getEditorPanelCss()}>
        {editor}
      </div>
      <div className={getViewerPanelCss()}>
        {response.responseType?.format === "json" && <JSONViewer data={response.responseData} theme={theme} />}
        {response.responseType?.format === "html" && <HTMLViewer data={response.responseData} />}
        {response.responseType?.format === "xml" && <XMLViewer data={response.responseData} theme={theme} />}
      </div>
      {
        fullScreenMode ?
          <CollapseLogo className="collapse-btn" onClick={onFullScreenClick} />
          :
          <ExpandLogo id="fullscreen-expand-btn" className="expand-btn" onClick={onFullScreenClick} />
      }
    </div>);
  }

  return (
    <div className="response-content-panel">
      {
        response.isError ?
          getErrorSection()
          :
          response.status === 0
            ?
            <><hr />{loading === true ? getLoadingSection() : getIdealSection()}</>
            :
            response.responseData
              ?
              response.responseType.isBinaryFile ?
                getBinaryResponseSection()
                :
                parseInt(response.size) > maxDisplayResponseLimitInBytes ?
                  getMaxSizeResponseSection()
                  :
                  <>
                    {isPreViewVisible() && getPreviewHeaderSection()}
                    {getResponseSection()}
                  </>
              :
              <></>
      }
    </div>
  );
};