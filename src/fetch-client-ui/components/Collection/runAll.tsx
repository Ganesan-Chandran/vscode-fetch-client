import React, { useEffect, useRef, useState } from "react";
import { requestTypes, responseTypes } from "../../../utils/configuration";
import vscode from "../Common/vscodeAPI";
import { IRequestModel } from "../RequestUI/redux/types";
import { IReponseModel } from "../ResponseUI/redux/types";
import { getMethodClassName } from "../SideBar/util";
import { FormatBytes, GetResponseTime } from "../ResponseUI/OptionsPanel/OptionTab/util";
import { IVariable } from "../SideBar/redux/types";
import { formatDate } from "../../../utils/helper";
import { executeTests, setVariable } from "../TestUI/TestPanel/helper";
import "./style.css";

const RunAll = () => {
  const [sourceColName, setSourceColName] = useState("");
  const [processing, setProcessing] = useState(false);
  const [start, setStart] = useState(false);

  const [req, _setReq] = useState<IRequestModel[]>([]);
  const refReq = useRef(req);
  const setReq = (data: IRequestModel[]) => {
    refReq.current = data;
    _setReq(refReq.current);
  };

  const [varId, setVarId] = useState("");

  const [selectedVariable, _setSelectedVariable] = useState<IVariable>();
  const refSelectedVariable = useRef(selectedVariable);
  const setSelectedVariable = (data: IVariable) => {
    refSelectedVariable.current = data;
    _setSelectedVariable(refSelectedVariable.current);
  };

  const [curIndex, _setCurIndex] = useState(0);
  const refCurIndex = useRef(curIndex);
  const setCurIndex = (data: number) => {
    refCurIndex.current = data;
    _setCurIndex(refCurIndex.current);
  };

  const [res, _setRes] = useState<IReponseModel[]>([]);
  const refRes = useRef(res);
  const setRes = (data: IReponseModel[]) => {
    refRes.current = data;
    _setRes(refRes.current);
  };

  useEffect(() => {
    const id = document.title.split(":")[1];
    const name = document.title.split(":")[2];
    const varId = document.title.split(":")[3];

    setSourceColName(name.trim());
    setVarId(varId.trim());

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getCollectionsByIdResponse) {
        setReq((event.data.collections as IRequestModel[]));
      } else if (event.data && event.data.type === responseTypes.apiResponse) {
        let local = [...refRes.current];
        let newRes: IReponseModel = {
          response: event.data.response,
          headers: event.data.headers,
          cookies: event.data.cookies
        };
        if (refReq.current[refCurIndex.current].tests.length - 1 > 0) {
          newRes.testResults = executeTests(refReq.current[refCurIndex.current].tests, newRes, refSelectedVariable.current.data);
        } else {
          newRes.testResults = [];
        }

        if (refReq.current[refCurIndex.current].setvar.length - 1 > 0) {
          let variable = setVariable(refSelectedVariable.current, refReq.current[refCurIndex.current].setvar, newRes);
          setSelectedVariable(variable);
        }

        if (refCurIndex.current === 0) {
          local[0] = newRes;
        } else {
          local.push(newRes);
        }

        if (refCurIndex.current === refReq.current.length - 1) {
          vscode.postMessage({ type: requestTypes.updateVariableRequest, data: refSelectedVariable.current });
        }

        setRes(local);
        setProcessing(false);

      } else if (event.data && event.data.type === responseTypes.getVariableItemResponse) {
        setSelectedVariable(event.data.data[0] as IVariable);
      }
    });

    vscode.postMessage({ type: requestTypes.getVariableItemRequest, data: { id: varId, isGlobal: varId ? false : true } });
    vscode.postMessage({ type: requestTypes.getCollectionsByIdRequest, data: { id: id, type: name.trim().includes("\\") ? "fol" : "col" } });
  }, []);

  function onSubmitClick() {
    setStart(true);
    setProcessing(true);
    vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: req[0], variableData: selectedVariable ? selectedVariable.data : null } });
  }

  useEffect(() => {
    if (start && res.length - 1 === curIndex) {
      if (req.length - 1 > curIndex) {
        setProcessing(true);
        vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: req[curIndex + 1], variableData: selectedVariable ? selectedVariable.data : null } });
        setCurIndex(curIndex + 1);
      }
    }
  }, [res]);

  function getResponseStatus(index: number) {
    return res[index] ? res[index].response.responseData.isError ? "ERROR" : (res[index].response.status === 0 ? "" : (res[index].response.status + " " + res[index].response.statusText)) : "";
  }

  function getResponseDuration(index: number) {
    return res[index] ? res[index]?.response.responseData.isError ? "0 ms" : GetResponseTime(res[index].response.duration) : "";
  }

  function getResponseSize(index: number) {
    return res[index] ? res[index]?.response.size ? FormatBytes(parseInt(res[index].response.size)) : "" : "";
  }

  function getStatusClassName(index: number): string {
    if (!res[index]) {
      return "runall-status-normal";
    }

    if (res[index].response.responseData.isError) {
      return "runall-status-error";
    }

    if (res[index].response.status <= 399) {
      return "runall-status-success";
    }

    return "runall-status-error";
  }

  function getClassName(index: number): string {
    if (!res[index]) {
      return "runall-status-normal";
    }

    if (res[index].response.responseData.isError) {
      return "runall-status-error";
    }

    return "runall-status-success";
  }

  function onRowClick(index: number) {
    if (res[index]) {
      vscode.postMessage({ type: requestTypes.openRunRequest, data: { reqData: req[index], resData: res[index], id: req[index].id, varId: varId } });
    }
  }

  function onClickExportJson(e: any) {
    e.preventDefault();

    let data = req.map((item, index) => {
      return {
        request: {
          id: item.id,
          url: item.url,
          name: item.name,
          createdTime: item.createdTime,
          method: item.method.toUpperCase(),
          notes: item.notes
        },
        response: res[index] ? {
          status: res[index].response.status,
          statusText: res[index].response.statusText,
          duration: getResponseDuration(index),
          size: getResponseSize(index)
        } : "[]",
        tests: res[index] && res[index].testResults ? res[index].testResults.map((itm) => {
          return {
            testCase: itm.test,
            actualValue: itm.actualValue,
            result: itm.result
          };
        }) : "[]",
        totalTests: res[index] && res[index].testResults ? res[index].testResults.length : 0,
        totalPassed: res[index] && res[index].testResults ? res[index].testResults.filter(re => re.result === true).length : 0,
        totalFailed: res[index] && res[index].testResults ? res[index].testResults.filter(re => re.result === false).length : 0,
      };
    });

    let exportData = {
      app: "Fetch Client",
      collectionName: sourceColName,
      version: "1.0",
      exportedDate: formatDate(),
      variableName: selectedVariable.name,
      totalRequests: req.length,
      data: data
    };

    vscode.postMessage({ type: requestTypes.exportRunTestJsonRequest, data: exportData, name: sourceColName });
  }

  function onClickExportCSV() {
    let data = `app,Fetch Client\ncollectionName,${sourceColName}\nversion,1.0\nexportedDate,${formatDate()}\nvariableName,${selectedVariable.name}\ntotalRequests,${req.length}\n\n`;
    data = data + `Id,Url,Name,Method,Status,Status Text,Duration,Size,Total Tests,Total Passed,Total Failed\n`;
    req.forEach((item, index) => {
      data = data + `${item.id},${item.url},${item.name},${item.method.toUpperCase()},${res[index] ? res[index].response.status : ""},${res[index] ? res[index].response.statusText : ""},${getResponseDuration(index)},${getResponseSize(index)},${res[index] && res[index].testResults ? res[index].testResults.length : 0},${res[index] && res[index].testResults ? res[index].testResults.filter(re => re.result === true).length : 0},${res[index] && res[index].testResults ? res[index].testResults.filter(re => re.result === false).length : 0}\n`;
    });
    vscode.postMessage({ type: requestTypes.exportRunTestCSVRequest, data: data, name: sourceColName });
  }

  function getTestClassName(index: number) {
    if (res[index]) {
      let pass = res[index].testResults?.filter(item => item.result === true).length;
      let total = refReq.current[index].tests.length - 1;

      if (total === 0) {
        return "runall-test-normal";
      }
      if (total === pass) {
        return "runall-test-pass";
      }
      return "runall-test-fail";
    } else {
      return "runall-test-normal";
    }
  }

  function getTestResult(index: number) {
    let total = refReq.current[index].tests.length - 1;
    if (res[index]) {
      let pass = res[index].testResults?.filter(item => item.result === true).length;
      return `${pass}/${total}`;
    }
    return `${0}/${total}`;
  }

  return (
    <div className="runall-panel">
      <div className="runall-header">Run Collection</div>
      <div className="runall-body center">
        <div className="runall-col-name">
          <span className="addto-label">{sourceColName.includes("\\") ? "Collection \\ Folder :" : "Collection :"}</span>
          <span className="addto-label">{sourceColName}</span>
        </div>
        <div className="runall-col-name runall-col-last-row">
          <span className="addto-label">{"Attached Variable :"}</span>
          <span className="addto-label">{selectedVariable ? selectedVariable.name : "-"}</span>
        </div>
        <table className="runall-tbl center" cellPadding={0} cellSpacing={0}>
          <thead>
            <tr>
              <th className="runall-col-1">Method</th>
              <th className="runall-col-2">Name</th>
              <th className="runall-col-2">URL</th>
              <th className="runall-col-1">Status</th>
              <th className="runall-col-1">Duration</th>
              <th className="runall-col-1">Tests (Pass/Total)</th>
            </tr>
          </thead>
          <tbody>
            {
              req.map((item, index) => {
                return <tr key={item.id} onClick={() => onRowClick(index)}>
                  <td className="runall-col-1">
                    <span className={"runall-method-label " + getMethodClassName(item.method.toUpperCase())}>{item.method.toUpperCase()}</span>
                  </td>
                  <td className="runall-col-2">
                    <span className="runall-label">{item.name}</span>
                  </td>
                  <td className="runall-col-2">
                    <span className="runall-label">{item.url}</span>
                  </td>
                  <td className="runall-col-1">
                    <span className={getStatusClassName(index) + " runall-label"}>{curIndex === index && processing ? "loading..." : getResponseStatus(index)}</span>
                  </td>
                  <td className="runall-col-1">
                    <span className={getClassName(index) + " runall-label"}>{getResponseDuration(index)}</span>
                  </td>
                  <td className="runall-col-1">
                    <span className={getTestClassName(index) + " runall-label"}>{getTestResult(index)}</span>
                  </td>
                </tr>;
              })
            }
          </tbody>
        </table>
        <div className="runall-btn-panel">
          <button
            type="submit"
            className="request-send-button runall-btn"
            onClick={onSubmitClick}
            disabled={req.length === 0}
          >
            Run All
          </button>
          <div className="runall-dropdown">
            <button className="request-send-button runall-dropbtn" disabled={(start && curIndex !== req.length - 1) || (req.length === 0)} >Export</button>
            <div className={start && curIndex !== req.length - 1 ? "runall-dropdown-content a-disabled" : "runall-dropdown-content"}>
              <a onClick={onClickExportJson}>JSON</a>
              <a onClick={onClickExportCSV}>CSV</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunAll;