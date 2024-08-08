import React, { useEffect } from "react";
import { useState } from "react";
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import vscode from "../../Common/vscodeAPI";
import { IVariable } from "../../SideBar/redux/types";
import "../style.css";

const AttachVariable = () => {
  const [colName, setColName] = useState("");
  const [colId, setColId] = useState("");
  const [names, setNames] = useState([]);
  const [selectedVarId, setVarId] = useState("");

  const [errors, setErrors] = useState({});
  const [isDone, setDone] = useState(false);

  useEffect(() => {
    const id = document.title.split("@:@")[1];
    setColId(id);
    const name = document.title.split("@:@")[3];
    setColName(name);

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getAllVariableResponse) {
        let vars = event.data.variable as IVariable[];
        let varNames = [{ name: "Select", value: "", disabled: true }];

        var ids = vars.reduce((ids, item, index) => {
          if (index !== 0) {
            ids.push({ name: item.name, value: item.id, disabled: false });
          }
          return ids;
        }, []);

        varNames = [...varNames, ...ids];
        setNames(varNames);
      } else if (event.data && event.data.type === responseTypes.attachVariableResponse) {
        setDone(true);
      }
    });

    vscode.postMessage({ type: requestTypes.getAllVariableRequest });
  }, []);

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setErrors({ ...errors, "varId": "" });
    setVarId(event.target.value);
  };

  function handleValidation() {
    if (selectedVarId === "") {
      setErrors({ ...errors, "varId": "Please select the variable" });
      return false;
    }

    return true;
  }

  function onSubmitClick() {
    if (handleValidation()) {
      vscode.postMessage({ type: requestTypes.attachVariableRequest, data: { colId: colId, varId: selectedVarId } });
    }
  }

  return (
    colId ?
      <div>
        <div className="addto-header">Attach Variable</div>
        <div className="addto-body">
          <table className="addto-table center" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td className="col-1-size">
                  <span className="addto-label">Selected Collection</span>
                </td>
                <td className="col-2-size">
                  <input className="addto-text disabled" type="text" title="Name" value={colName} disabled={true}></input>
                </td>
              </tr>
              <tr>
                <td className="col-1-size">
                  <span className="addto-label">Variable</span>
                </td>
                <td className="col-2-size block-display">
                  <select
                    className={errors["varId"] ? "addto-select var-select error-select" : "addto-select var-select"}
                    required={true}
                    value={selectedVarId}
                    onChange={(e) => onSelect(e)}
                  >
                    {
                      names.map((param: any, index: number) => {
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
              <tr>
                <td className="col-1-size">
                </td>
                <td className="col-2-size">
                  {errors["varId"] && <div className="error-text">{errors["varId"]}</div>}
                </td>
              </tr>
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
            {isDone && (<span className="success-message">{`Collection '${colName}' is attached to variable successfully`}</span>)}
          </div>
        </div>
      </div>
      :
      <></>
  );
};

export default AttachVariable;