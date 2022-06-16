import React, { useEffect } from "react";
import { useState } from "react";
import { requestTypes, responseTypes } from "../../../utils/configuration";
import vscode from "../Common/vscodeAPI";
import "./style.css";

const ErrorLog = () => {
  const [errorLogData, setErrorLog] = useState("");

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getErrorLogResponse) {
        setErrorLog(event.data.fileData ? event.data.fileData : "No Error");
      }
    });

    vscode.postMessage({ type: requestTypes.getErrorLogRequest });
  }, []);

  return (
    <div className="error-log-panel">
      <textarea className="error-log-text-box" value={errorLogData} readOnly={true}>
      </textarea>
    </div>
  );
};

export default ErrorLog;