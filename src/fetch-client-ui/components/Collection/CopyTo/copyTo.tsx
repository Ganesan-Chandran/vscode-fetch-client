import React, { useEffect } from "react";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import vscode from "../../Common/vscodeAPI";
import "../style.css";

const CopyTo = () => {

  const [sourceColName, setSourceColName] = useState("");
  const [sourceColId, setSourceColId] = useState("");
  const [destColId, setDestColId] = useState("");
  const [destColName, setDestColName] = useState("");
  const [collectionNames, setCollectionNames] = useState([]);


  const [errors, setErrors] = useState({});
  const [isDone, setDone] = useState(false);

  useEffect(() => {
    const id = document.title.split("@:@")[1];
    setSourceColId(id);
    const name = document.title.split("@:@")[3];
    setSourceColName(name);

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getAllCollectionNamesResponse) {
        let findIndex: number = -1;
        let names = event.data.collectionNames;
        let colNames = [{ name: "Select", value: "", disabled: true }];
        let found = names.some(function (item: any, index: number) { findIndex = index; return item.value === id; });
        if (found) {
          names.splice(findIndex, 1);
        }
        colNames = [...colNames, ...names];
        colNames.push({ name: "----------------------", value: "-1", disabled: true });
        colNames.push({ name: "Create New", value: "0", disabled: false });
        setCollectionNames(colNames);
      } else if (event.data && event.data.type === responseTypes.copyToCollectionsResponse) {
        setDone(true);
      }
    });

    vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "copytocol" });
  }, []);

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setErrors({ ...errors, "colName": "" });
    setDestColId(event.target.value);    
  };

  function handleValidation() {
    if (destColId === "") {
      setErrors({ ...errors, "colName": "Please select/create the collection" });
      return false;
    }
    if (destColId === "0") {
      if (!destColName) {
        setErrors({ ...errors, "colName": "Cannot be empty" });
        return false;
      }
      if (destColName.toUpperCase().trim() === "DEFAULT") {
        setErrors({ ...errors, "colName": "Collection name should not be 'Default'" });
        return false;
      }
      return true;
    }
    return true;
  }

  function onSubmitClick() {
    if (handleValidation()) {
      vscode.postMessage({ type: requestTypes.copyToCollectionsRequest, data: { sourceId: sourceColId, distId: destColId === "0" ? uuidv4() : destColId, name: destColId === "0" ? destColName : "" } });
    }
  }

  function onNameChange(e: any) {
    setDestColName(e.target.value);
    setErrors({ ...errors, "colName": (e.target.value ? (e.target.value.toUpperCase().trim() === "DEFAULT" ? "Collection name should not be 'Default'" : "") : "Cannot be empty") });
  }

  return (
    sourceColName ?
      <div>
        <div className="addto-header">Copy Collection To</div>
        <div className="addto-body">
          <table className="addto-table center" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td className="col-1-size">
                  <span className="addto-label">Selected Collection :</span>
                </td>
                <td className="col-2-size">
                  <input className="addto-text disabled" type="text" title="Name" value={sourceColName} disabled={true}></input>
                </td>
              </tr>
              <tr>
                <td className="col-1-size">
                  <span className="addto-label">Copy To :</span>
                </td>
                <td className="col-2-size block-display">
                  <select
                    className="addto-select"
                    required={true}
                    value={destColId}
                    onChange={(e) => onSelect(e)}
                  >
                    {
                      collectionNames.map((param: any, index: number) => {
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
              {destColId === "0" && (<tr>
                <td className="col-1-size">
                  <span className="addto-label">New Collection Name :</span>
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
              className="submit-button"
              onClick={onSubmitClick}
              disabled={isDone}
            >
              Submit
            </button>
          </div>
          <div className="message-panel">
            {isDone && (<span className="success-message">Collection items are copied successfully</span>)}
          </div>
        </div>
      </div>
      :
      <></>
  );
};

export default CopyTo;