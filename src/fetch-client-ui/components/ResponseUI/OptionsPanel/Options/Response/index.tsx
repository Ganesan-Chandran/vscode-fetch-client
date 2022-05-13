import React, { useState } from 'react';
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { MonacoEditor } from "../../../../Common/Editor";
import { responseType } from "./consts";
import FetchClientIcon from "../../../../../../../icons/fetch-client.png";
import "./style.css";
import { maxDisplayResponseLimitInBytes } from '../../../ResponsePanel/consts';
import { requestTypes } from '../../../../../../utils/configuration';
import vscode from '../../../../Common/vscodeAPI';
import { JSONViewer } from '../../../../Common/Viewer/JSONViewer';
import { HTMLViewer } from '../../../../Common/Viewer/HTMLViewer';
import { XMLViewer } from '../../../../Common/Viewer/XMLViewer';


export const ResponseSection = () => {

  const { response, loading } = useSelector((state: IRootState) => state.responseData);
  const { theme } = useSelector((state: IRootState) => state.uiData);

  const [viewType, setType] = useState("raw");


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

  return (
    <div className="response-content-panel">
      {
        response.responseData && !response.isError ?
          response.responseType.isBinaryFile ?
            <div className='res-not-support-panel'>
              <div className="res-not-support-text">{"View response is not supported for 'file' response type."}</div>
              <div className="res-not-support-text">{"Please download it."}</div>
              <button
                type="submit"
                className="request-send-button res-not-support-download"
                onClick={() => onDownloadFile()}
              >
                Download
              </button>
            </div>
            :
            parseInt(response.size) > maxDisplayResponseLimitInBytes ?
              <div className='res-not-support-panel'>
                <div className="res-not-support-text">{"View response is not supported on large files (> 5MB)."}</div>
                <div className="res-not-support-text">{"Please download it."}</div>
                <button
                  type="submit"
                  className="request-send-button"
                  onClick={() => onDownloadFile()}
                >
                  Download
                </button>
              </div>
              :
              <>
                {(response.responseType?.format === "json" || response.responseType?.format === "html" || response.responseType?.format === "xml") &&
                  <div className="toggle">
                    <input type="radio" name="sizeBy" value="weight" id="sizeWeight" onChange={onTextResponseClick} checked={viewType === "raw"} />
                    <label htmlFor="sizeWeight">Raw View</label>
                    <input type="radio" name="sizeBy" value="dimensions" onChange={onJsonViewResponseClick} checked={viewType !== "raw"} id="sizeDimensions" />
                    <label htmlFor="sizeDimensions">{response.responseType?.format === "html" ? "HTML Preview" : "Tree View"}</label>
                  </div>
                }
                <div className="response-editor">
                  <div className={viewType === "raw" ? "res-visible" : "res-hidden"}>
                    {editor}
                  </div>
                  <div className={viewType !== "raw" ? "res-visible" : "res-hidden"}>
                    {response.responseType?.format === "json" && <JSONViewer data={response.responseData} theme={theme} />}
                    {response.responseType?.format === "html" && <HTMLViewer data={response.responseData} />}
                    {response.responseType?.format === "xml" && <XMLViewer data={response.responseData} theme={theme} />}
                  </div>
                </div>
              </>
          :
          response.isError ?
            <div className='res-not-support-panel'>
              <div className="res-not-support-text error-text">{response.responseData}</div>
            </div>
            :
            <>
              <hr />
              {loading === true ?
                <div className="response-header-label">
                  <div className="arrow-4"></div>
                  <span className="fetch-data-text">{"Fetching data ..."}</span>
                  <div className="cancel-button-panel">
                    <button
                      type="submit"
                      className="file-reset-text"
                      onClick={() => onCancelRequest()}
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
                :
                <div className='fetch-image-panel'>
                  <img src={FetchClientIcon} className="fetch-client-image" />
                  <span className="fetch-data-text">{"Enter the URL and click Send to get a response."}</span>
                </div>
              }
            </>
      }
    </div>
  );
};