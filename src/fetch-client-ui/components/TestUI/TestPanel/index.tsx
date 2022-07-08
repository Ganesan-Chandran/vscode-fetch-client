import React from "react";
import { ReactComponent as BinLogo } from '../../../../../icons/bin.svg';
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../reducer/combineReducer";
import { Actions } from "../../RequestUI/redux";
import { ITest } from "../../RequestUI/redux/types";
import { ActionsParametersMapping, TestCaseParameters, TestValueSuggestions } from "./consts";
import "./style.css";
import { TextEditor } from "../../Common/TextEditor/TextEditor";
import { Autocomplete } from "../../Common/Autocomplete/Autocomplete";
import { HerdersValues } from "../../Common/Table/types";

export const TestPanel = () => {

  const dispatch = useDispatch();

  const { tests } = useSelector((state: IRootState) => state.requestData);
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

  const onSelectItem = (value: string, index: number, type: string) => {
    let newRow: ITest = {
      parameter: "",
      action: "",
      expectedValue: "",
      customParameter: ""
    };

    let localTable = addValue(value, index, type);

    if (index === tests.length - 1 && (((localTable[index].parameter === "Header" || localTable[index].parameter === "JSON") && localTable[index].customParameter) || (localTable[index].parameter !== "Header" && localTable[index].parameter !== "JSON")) && localTable[index].action) {
      localTable.push(newRow);
    }

    dispatch(Actions.SetTestAction(localTable));
  };

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement> | React.ChangeEvent<HTMLInputElement>, index: number, type: string) => {
    onSelectItem(event.target.value, index, type);
  };

  function onDelete(index: number) {
    let localTable = [...tests];
    localTable.splice(index, 1);
    dispatch(Actions.SetTestAction(localTable));
  }

  const addValue = (value: string, index: number, selectType: string): ITest[] => {
    let localTable = [...tests];
    let rowData = localTable[index];
    localTable[index] = {
      parameter: selectType === "parameter" ? value : rowData.parameter,
      action: selectType === "action" ? value : rowData.action,
      expectedValue: selectType === "expectedValue" ? value : rowData.expectedValue,
      customParameter: selectType === "customParameter" ? value : rowData.customParameter
    };

    return localTable;
  };

  function getParameterList(row: ITest, index: number) {
    return (
      <>
        {
          row.parameter === "Header" || row.parameter === "JSON" ?            
          selectedVariable.id && <TextEditor
              varWords={selectedVariable.data.map(item => item.key)}
              placeholder={row.parameter === "Header" ? "header name" : "ex: data or data.id"}
              onChange={(val) => onSelectItem(val, index, "customParameter")}
              value={row.customParameter}
              focus={true}
            />
            :
            <select
              required={true}
              className="test-parameter-select"
              id={"parameter_" + index.toString()}
              value={row.parameter}
              onChange={(e) => onSelect(e, index, "parameter")}>
              {
                TestCaseParameters.map((param: any, index: number) => {
                  return (
                    <option
                      disabled={index === 0 ? true : false}
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
        }
      </>
    );
  }

  function getActionList(row: ITest, index: number) {
    let parameter = ActionsParametersMapping[row.parameter];
    let actionList: any;

    if (parameter) {
      actionList = row.parameter ? parameter["action"] : {};
    }
    else {
      actionList = {};
    }

    return (
      <select
        disabled={actionList.length > 0 ? false : true}
        required={true}
        className="test-action-select"
        id={"action_" + index.toString()}
        value={row.action}
        onChange={(e) => onSelect(e, index, "action")}>
        {
          actionList.length > 0
            ?
            actionList.map((param: any, index: number) => {
              return (
                <option
                  disabled={index === 0 ? true : false}
                  hidden={index === 0 ? true : false}
                  key={index + param.name}
                  value={param.value}
                >
                  {param.name}
                </option>
              );
            })
            :
            <option value=""></option>
        }
      </select>
    );
  }

  const tableRow = (row: ITest, index: number) => {
    return (
      <tr key={index}>
        <td>
          {getParameterList(row, index)}
        </td>
        <td>
          {getActionList(row, index)}
        </td>
        <td>
          <Autocomplete
            id={"test_val_" + index.toString()}
            value={row.expectedValue}
            className={row.parameter !== "" && row.action !== "" ? "table-input" : "table-input disabled"}
            onSelect={(val) => onSelectItem(val, index, "expectedValue")}
            suggestions={[...HerdersValues, ...TestValueSuggestions]}            
            disabled={row.parameter !== "" && row.action !== "" ? false : true}
            placeholder={row.parameter !== "" && row.action !== "" ? "value" : ""}
            selectedVariable={selectedVariable}
          />
        </td>
        <td className="test-action-cell">
          {index !== tests.length - 1 ?
            <BinLogo className="delete-button" onClick={() => onDelete(index)} />
            :
            <></>
          }
        </td>
      </tr >
    );
  };

  const makeTable = (data: ITest[]) => {
    return (
      data.map((item: ITest, index: number) => {
        return tableRow(item, index);
      })
    );
  };

  return (
    <table className="test-table">
      <thead>
        <tr>
          <th>Parameter</th>
          <th>Action</th>
          <th>Test Value</th>
          <th className="test-action-cell"></th>
        </tr>
      </thead>
      <tbody>
        {
          makeTable(tests)
        }
      </tbody>
    </table>
  );
};