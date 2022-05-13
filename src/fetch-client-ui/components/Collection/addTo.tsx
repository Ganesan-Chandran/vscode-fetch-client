import React, { useEffect } from "react";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { requestTypes, responseTypes } from "../../../utils/configuration";
import { formatDate } from "../../../utils/helper";
import vscode from "../Common/vscodeAPI";
import { ICollections, IHistory } from "../SideBar/redux/types";
import { getMethodClassName } from "../SideBar/util";
import "./style.css";

const AddToCollection = () => {

  const [col, selCol] = useState("");
  const [errors, setErrors] = useState({});
  const [colName, setColName] = useState("");
  const [collections, setCollections] = useState([]);
  const [history, setHistory] = useState<IHistory>();
  const [isDone, setDone] = useState(false);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getAllCollectionNameResponse) {
        let colNames = [{ name: "Select", value: "", disabled: true }];
        colNames = [...colNames, ...event.data.collectionNames];
        colNames.push({ name: "----------------------", value: "-1", disabled: true });
        colNames.push({ name: "Create New", value: "0", disabled: false });
        setCollections(colNames);
      } else if (event.data && event.data.type === responseTypes.getHistoryItemResponse) {
        setHistory(event.data.history[0] as IHistory);
      } else if (event.data && event.data.type === responseTypes.addToCollectionsResponse) {
        setDone(true);
      }
    });

    vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "addtocol" });
    let id = document.title.split(":")[1];
    vscode.postMessage({ type: requestTypes.getHistoryItemRequest, data: id });
  }, []);

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setErrors({ ...errors, "colName": "" });
    selCol(event.target.value);
  };

  function handleValidation() {
    if (col === "") {
      setErrors({ ...errors, "colName": "Please select/create the collection" });
      return false;
    }
    if (col === "0") {
      if (!colName) {
        setErrors({ ...errors, "colName": "Cannot be empty" });
        return false;
      }
      if (colName.toUpperCase().trim() === "DEFAULT") {
        setErrors({ ...errors, "colName": "Collection name should not be 'Default'" });
        return false;
      }
      return true;
    }
    return true;
  }

  function onSubmitClick() {
    if (handleValidation()) {
      let collection: ICollections = {
        id: col === "0" ? uuidv4() : col,
        createdTime: formatDate(),
        name: col === "0" ? colName : "",
        data: [history],
        variableId: "",
      };
      vscode.postMessage({ type: requestTypes.addToCollectionsRequest, data: collection });
    }
  }

  function onNameChange(e: any) {
    setColName(e.target.value);
    setErrors({ ...errors, "colName": (e.target.value ? (e.target.value.toUpperCase().trim() === "DEFAULT" ? "Collection name should not be 'Default'" : "") : "Cannot be empty") });
  }

  return (
    history && history.name ?
      <div>
        <div className="addto-header">Add To Collection</div>
        <div className="addto-body">
          <table className="addto-table center" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td className="col-1-size">
                  <span className="addto-label">History Name :</span>
                </td>
                <td className="col-2-size">
                  <input className="addto-text disabled" type="text" title="Name" value={history.name} disabled={true}></input>
                </td>
              </tr>
              <tr className="details-row">
                <td className="col-1-size">
                  <span className="addto-label">Request Details :</span>
                </td>
                <td className="col-2-size details-col">
                  <div className={"req-details method-label " + getMethodClassName(history.method.toUpperCase())}>{history.method.toUpperCase()}</div>
                  <div className="req-details">{history.url}</div>
                  <div className="req-details">{formatDate(history.createdTime)}</div>
                </td>
              </tr>
              <tr>
                <td className="col-1-size">
                  <span className="addto-label">Collection :</span>
                </td>
                <td className="col-2-size block-display">
                  <select
                    className="addto-select"
                    required={true}
                    value={col}
                    onChange={(e) => onSelect(e)}
                  >
                    {
                      collections.map((param: any, index: number) => {
                        return (
                          <option
                            disabled={param.disabled}
                            hidden={index === 0 ? true : false}
                            key={index + param.name}
                            value={param.value}
                          >
                            {param.name}
                          </option>
                        );
                      })
                    }
                  </select>
                </td>
              </tr>
              {col === "0" && (<tr>
                <td className="col-1-size">
                  <span className="addto-label">Collection Name :</span>
                </td>
                <td className="col-2-size">
                  <input className={errors["colName"] ? "addto-text required-value" : "addto-text"} type="text" title="Collection Name" onChange={onNameChange}></input>
                </td>
              </tr>)}
              {errors["colName"] && <tr>
                <td className="col-1-size">
                </td>
                <td className="col-2-size">
                  <div className="error-text">{errors["colName"]}</div>
                </td>
              </tr>}
            </tbody>
          </table>
          <div className="button-panel">
            <button
              type="submit"
              className="request-send-button"
              onClick={onSubmitClick}
              disabled={isDone}
            >
              Submit
            </button>
          </div>
          <div className="message-panel">
            {isDone && (<span className="success-message">History item has added to Collection successfully</span>)}
          </div>
        </div>
      </div>
      :
      <></>
  );
};

export default AddToCollection;