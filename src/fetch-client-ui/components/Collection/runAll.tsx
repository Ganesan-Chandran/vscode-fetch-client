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
  const [done, setDone] = useState(false);

  const [req, _setReq] = useState<IRequestModel[]>([]);
  const refReq = useRef(req);
  const setReq = (data: IRequestModel[]) => {
    refReq.current = data;
    _setReq(refReq.current);
  };

  const [varId, setVarId] = useState("");
  const [colId, setColId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [itemPaths, setItemPaths] = useState(null);

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

  const [selectedReq, setSelectedReq] = useState<boolean[]>([]);

  useEffect(() => {
    const colId = document.title.split(":")[1];
    const folderId = document.title.split(":")[2];
    const name = document.title.split(":")[3];
    const varId = document.title.split(":")[4];

    setSourceColName(name.trim());
    setVarId(varId?.trim());
    setFolderId(folderId?.trim());
    setColId(colId?.trim());

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getCollectionsByIdResponse) {
        setReq((event.data.collections as IRequestModel[]));
        setItemPaths(event.data.paths);
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

        local[refCurIndex.current] = newRes;

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
    vscode.postMessage({ type: requestTypes.getCollectionsByIdRequest, data: { colId: colId, folderId: folderId, type: name.trim().includes("\\") ? "fol" : "col" } });
  }, []);

  function onSubmitClick() {
    setStart(true);
    setProcessing(true);
    let enabledIndex = selectedReq.findIndex(item => item === true);
    if (enabledIndex !== -1) {
      setCurIndex(enabledIndex);
      let id = itemPaths[req[enabledIndex].id].split(";")[1];
      if (id === colId) {
        id = "";
      }
      vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: req[enabledIndex], variableData: selectedVariable ? selectedVariable.data : null, colId: colId, folderId: id } });
    }
  }

  function getNextIndex(currentInex: number) {
    for (let i = currentInex + 1; i < selectedReq.length; i++) {
      if (selectedReq[i]) {
        return i;
      }
    }

    return -1;
  }

  useEffect(() => {
    if (start && res.length - 1 === curIndex) {
      if (req.length - 1 > curIndex) {
        let enabledIndex = getNextIndex(curIndex);
        if (enabledIndex !== -1) {
          let id = itemPaths[req[enabledIndex].id].split(";")[1];
          if (id === colId) {
            id = "";
          }
          setProcessing(true);
          vscode.postMessage({ type: requestTypes.apiRequest, data: { reqData: req[enabledIndex], variableData: selectedVariable ? selectedVariable.data : null, colId: colId, folderId: id } });
          setCurIndex(enabledIndex);
        } else {
          setStart(false);
          setDone(true);
        }
      } else {
        setStart(false);
        setDone(true);
      }
    } else {
      setStart(false);
    }
  }, [res]);

  useEffect(() => {
    if (req && req.length > 0 && selectedReq.length === 0) {
      let selected = [];
      req.forEach(() => {
        selected.push(true);
      });

      setSelectedReq(selected);
    }
  }, [req]);

  function getResponseStatus(index: number) {
    return res[index] ? res[index].response.isError ? "ERROR" : (res[index].response.status === 0 ? "" : (res[index].response.status + " " + res[index].response.statusText)) : "";
  }

  function getResponseDuration(index: number) {
    return res[index] ? res[index]?.response.isError ? "0 ms" : GetResponseTime(res[index].response.duration) : "";
  }

  function getResponseSize(index: number) {
    return res[index] ? res[index]?.response.size ? FormatBytes(parseInt(res[index].response.size)) : "" : "";
  }

  function getStatusClassName(index: number): string {
    if (!res[index]) {
      return "runall-status-normal";
    }

    if (res[index].response.isError) {
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

    if (res[index].response.isError) {
      return "runall-status-error";
    }

    return "runall-status-success";
  }

  function onRowClick(index: number) {
    if (res[index]) {
      vscode.postMessage({ type: requestTypes.openRunRequest, data: { reqData: req[index], resData: res[index], id: req[index].id, varId: varId, colId: colId, folderId: folderId } });
    }
  }

  function onClickExportJson(e: any) {
    e.preventDefault();
    let data = [];
    req.forEach((item, index) => {
      if (selectedReq[index]) {
        data.push({
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
        });
      }
    });

    let exportData = {
      app: "Fetch Client",
      collectionName: sourceColName,
      version: "1.0",
      exportedDate: formatDate(),
      variableName: selectedVariable.name,
      totalRequests: selectedReq.filter(item => item === true).length,
      data: data
    };

    vscode.postMessage({ type: requestTypes.exportRunTestJsonRequest, data: exportData, name: sourceColName });
  }

  function onClickExportCSV() {
    let data = `app,Fetch Client\ncollectionName,${sourceColName}\nversion,1.0\nexportedDate,${formatDate()}\nvariableName,${selectedVariable.name}\ntotalRequests,${selectedReq.filter(item => item === true).length}\n\n`;
    data = data + `Id,Url,Name,Method,Status,Status Text,Duration,Size,Total Tests,Total Passed,Total Failed\n`;
    req.forEach((item, index) => {
      if (selectedReq[index]) {
        data = data + `${item.id},${item.url},${item.name},${item.method.toUpperCase()},${res[index] ? res[index].response.status : ""},${res[index] ? res[index].response.statusText : ""},${getResponseDuration(index)},${getResponseSize(index)},${res[index] && res[index].testResults ? res[index].testResults.length : 0},${res[index] && res[index].testResults ? res[index].testResults.filter(re => re.result === true).length : 0},${res[index] && res[index].testResults ? res[index].testResults.filter(re => re.result === false).length : 0}\n`;
      }
    });
    vscode.postMessage({ type: requestTypes.exportRunTestCSVRequest, data: data, name: sourceColName });
  }

  function getTestClassName(index: number) {
    let total = refReq.current[index].tests.length - 1;

    if (!selectedReq[index]) {
      return "runall-test-disabled";
    }

    if (total === 0) {
      return "runall-test-normal";
    }

    if (res[index]) {
      let pass = res[index].testResults?.filter(item => item.result === true).length;

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
    if (total === 0) {
      return "No Tests";
    }
    if (res[index]) {
      let pass = res[index].testResults?.filter(item => item.result === true).length;
      return `${pass} / ${total}`;
    }
    return `${0}/${total}`;
  }

  function onSelectChange(e: any, index: number) {
    let localReq = [...selectedReq];
    localReq[index] = !localReq[index];
    setSelectedReq(localReq);
  }

  function onSelect(e: any, index: number) {
    e.preventDefault();
    e.stopPropagation();
    let localReq = [...req];
    var element = localReq[index];
    localReq.splice(index, 1);
    localReq.splice(e.target.value, 0, element);


    let localSelectedReq = [...selectedReq];
    var eleReq = localSelectedReq[index];
    localSelectedReq.splice(index, 1);
    localSelectedReq.splice(e.target.value, 0, eleReq);


    setReq(localReq);
    setSelectedReq(localSelectedReq);
  }

  function isDisabled() {
    if (selectedReq) {
      return selectedReq.filter(item => item === true).length === 0 ? true : false;
    }

    return true;
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
        <div className="runall-tbl-panel">
          <table className="runall-tbl center" cellPadding={0} cellSpacing={0}>
            <thead>
              <tr>
                <th className="runall-col-0"></th>
                <th className="runall-col-2">Path</th>
                <th className="runall-col-1">Method</th>
                <th className="runall-col-2">Name</th>
                <th className="runall-col-2">URL</th>
                <th className="runall-col-1">Status</th>
                <th className="runall-col-1">Duration</th>
                <th className="runall-col-1">Tests (Pass / Total)</th>
                <th className="runall-col-0">Order</th>
              </tr>
            </thead>
            <tbody>
              {
                req.map((item, index) => {
                  return <tr key={item.id} onClick={() => onRowClick(index)} className={selectedReq[index] ? "runall-enabled" : "runall-disabled"} >
                    <td className="runall-col-1">
                      <input type="checkbox"
                        checked={selectedReq[index] !== undefined ? selectedReq[index] : true}
                        onChange={(e) => onSelectChange(e, index)}
                      />
                    </td>
                    <td className="runall-col-2">
                      <span className="runall-label">{itemPaths ? itemPaths[item.id].split(";")[0] : ""}</span>
                    </td>
                    <td className="runall-col-1">
                      <span className={"runall-method-label " + getMethodClassName(item.method.toUpperCase(), selectedReq[index])}>{item.method.toUpperCase()}</span>
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
                    <td className="runall-col-5">
                      <select
                        required={true}
                        className={"runall-order-select"}
                        id={"order_" + index.toString()}
                        value={index}
                        disabled={!selectedReq[index]}
                        onChange={(e) => onSelect(e, index)}>
                        {
                          req.map((param: any, index: number) => {
                            return (
                              <option
                                key={index}
                                value={index}
                              >
                                {index + 1}
                              </option>
                            );
                          })
                        }
                      </select>
                    </td>
                  </tr>;
                })
              }
            </tbody>
          </table>
        </div>
        <div className="runall-btn-panel">
          <button
            type="submit"
            className="submit-button runall-btn"
            onClick={onSubmitClick}
            disabled={done || isDisabled()}
          >
            Run All
          </button>
          <div className="runall-dropdown">
            <button className="submit-button runall-dropbtn" disabled={start || isDisabled()} >Export</button>
            <div className={start || isDisabled() ? "runall-dropdown-content a-disabled" : "runall-dropdown-content"}>
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