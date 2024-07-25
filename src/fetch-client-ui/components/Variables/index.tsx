import React, { useEffect, useState } from "react";
import { requestTypes, responseTypes } from "../../../utils/configuration";
import { Table } from "../Common/Table/Table";
import { ITableData } from "../Common/Table/types";
import vscode from "../Common/vscodeAPI";
import { IVariable } from "../SideBar/redux/types";
import { v4 as uuidv4 } from 'uuid';
import "./style.css";
import { formatDate } from "../../../utils/helper";

export interface IVariableProps {
  index?: number;
}

const Variables = (props: IVariableProps) => {

  const [isDone, setDone] = useState(false);
  const [isNew, setNew] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [errors, setErrors] = useState({});
  const [defaultGlobal, setDefaultGlobal] = useState(false);
  const [variableItem, setVariableItem] = useState<IVariable>(null);
  const [duplicates, setDuplicates] = useState([]);

  const [collectionNames, setCollectionNames] = useState([]);

  function onRowAdd(event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) {
    let newRow: ITableData = {
      isChecked: false,
      key: "",
      value: ""
    };

    let localTable = addValue(event.target.value, index, isKey);

    if (localTable[index].key && localTable[index].value) {
      localTable.push(newRow);
    }

    setVariableItem({ ...variableItem, data: localTable });
    setDone(false);
  }

  function onRowUpdate(event: React.ChangeEvent<HTMLInputElement>, index: number, isKey: boolean = true) {
    let localTable = addValue(event.target.value, index, isKey);
    setVariableItem({ ...variableItem, data: localTable });
    setDone(false);
  }

  const addValue = (value: string, index: number, isKey: boolean): ITableData[] => {
    let localTable = [...variableItem.data];
    let rowData = localTable[index];
    localTable[index] = {
      isChecked: true,
      key: isKey ? value : rowData.key,
      value: !isKey ? value : rowData.value
    };

    return localTable;
  };


  function deleteParam(index: number) {
    let localTable = [...variableItem.data];
    localTable.splice(index, 1);
    setVariableItem({ ...variableItem, data: localTable });
    setDone(false);
  }

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getVariableItemResponse) {
        let varItem = event.data.data[0] as IVariable;
        varItem.data.push({ isChecked: false, key: "", value: "", });
        setVariableItem(varItem);
        setDefaultGlobal(varItem.name.toUpperCase().trim() === "GLOBAL");
        setEnabled(false);
      } else if (event.data && (event.data.type === responseTypes.saveVariableResponse || event.data.type === responseTypes.updateVariableResponse)) {
        setDone(true);
      } else if (event.data && (event.data.type === responseTypes.getAttachedColIdsResponse)) {
        setCollectionNames(event.data.colNames);
      }
    });

    let id = document.title.split(":")[1];
    if (id !== "undefined") {
      vscode.postMessage({ type: requestTypes.getVariableItemRequest, data: { id: id, isGlobal: false } });
      setNew(false);
    } else {
      setVariableItem({
        id: uuidv4(),
        name: "",
        isActive: true,
        createdTime: formatDate(),
        data: [{
          isChecked: false,
          key: "",
          value: "",
        }]
      });
    }
  }, []);

  function onSubmitClick() {
    let duplicates = variableItem.data.map((item) => {
      return item.key.trim();
    }).filter((item, index, self) => self.indexOf(item) !== index);

    if (duplicates.length > 0) {
      setDuplicates(duplicates);
    } else {
      setDuplicates([]);
      let localVar = { ...variableItem };
      localVar.data = localVar.data.filter(item => item.key);
      vscode.postMessage({ type: isNew ? requestTypes.saveVariableRequest : requestTypes.updateVariableRequest, data: localVar });
    }
  }

  function isDisabled(): boolean {
    if (!variableItem.name) {
      return true;
    }

    if (!defaultGlobal && variableItem.name.toUpperCase().trim() === "GLOBAL") {
      return true;
    }

    return false;
  }

  function onNameChange(event: any) {
    setVariableItem({ ...variableItem, name: event.target.value });
    setErrors({ ...errors, "varName": (event.target.value ? (event.target.value.toUpperCase().trim() === "GLOBAL" ? "Variable name should not be 'Global'" : "") : "Cannot be empty") });
  }

  return (
    <div className="variable-panel">
      <div className="var-header">Variables</div>
      {
        variableItem ?
          <>
            <div className="variable-panel-name">
              <label className="variable-text-label">Name : </label><input className={errors["varName"] ? "variable-text required-value" : "variable-text"} type="text" value={variableItem.name} title="Variable Name" onChange={onNameChange} disabled={!enabled}></input>
              {
                errors["varName"] && <div className="var-name-valid error-text">{errors["varName"]}</div>
              }
            </div>
            <div className="var-tbl-panel">
              <Table
                data={variableItem?.data ? variableItem.data : [{ isChecked: false, key: "", value: "" }]}
                onRowAdd={onRowAdd}
                onRowUpdate={onRowUpdate}
                deleteData={deleteParam}
                readOnly={false}
                placeholder={{ key: "variable name", value: "value" }}
              />
            </div>
            {collectionNames.length > 0 ?
              <div className="variable-col-panel">
                <label className="variable-col-label">Attached Collections : </label>
                <label className="variable-col-list-label">{collectionNames.toString()}</label>
              </div>
              :
              <></>}
            <div className="button-panel var-btn-panel">
              <button
                type="submit"
                className="submit-button"
                onClick={onSubmitClick}
                disabled={isDisabled()}
              >
                Submit
              </button>
            </div>
            <div className="message-panel">
              {isDone && (<span className="success-message var-error">{`Variables ${isNew ? `added` : `updated`} successfully`}</span>)}
              {duplicates.length > 0 && (<span className="success-message error-text var-error">{`Duplicate Variables : ${duplicates.join(", ")}`}</span>)}
            </div>
          </>
          :
          <></>
      }
    </div>
  );
};

export default Variables;