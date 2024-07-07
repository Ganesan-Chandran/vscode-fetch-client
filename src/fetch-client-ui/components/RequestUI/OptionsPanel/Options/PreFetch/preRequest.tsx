import { Actions } from "../../../redux";
import { IColRequest, IRequestList, IRunRequest, ITest } from "../../../redux/types";
import { IRootState } from "../../../../../reducer/combineReducer";
import { preConditionActions, preConditions } from "./consts";
import { ReactComponent as BinLogo } from '../../../../../../../icons/bin.svg';
import { requestTypes, responseTypes } from "../../../../../../utils/configuration";
import { TextEditor } from "../../../../Common/TextEditor/TextEditor";
import { useDispatch, useSelector } from "react-redux";
import React, { useEffect, useState } from "react";
import vscode from "../../../../Common/vscodeAPI";
import "./style.css";

export interface IPreRequestProps {
  request: IRunRequest,
  reqIndex: number
}

export const PreRequest = (props: IPreRequestProps) => {

  const dispatch = useDispatch();
  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);
  const { collectionList, colRequestList } = useSelector((state: IRootState) => state.reqColData);

  const [selectedRequestList, setSelectedRequestList] = useState<IRequestList[]>([]);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getCollectionsByIdWithPathResponse && props.request.colId === event.data.colId) {
        let reqList: IRequestList[] = [];
        for (const [key, value] of Object.entries(event.data.paths)) {
          reqList.push({
            id: key,
            name: value as string
          });
        }
        let col: IColRequest = {
          id: event.data.colId,
          reqs: reqList
        };

        dispatch(Actions.SetColRequestListAction(col));
        setSelectedRequestList(col.reqs);

        let reqId = col.reqs.length > 0 ? (props.request.reqId ? props.request.reqId : col.reqs[0].id) : "";
        let parentId = col.reqs.length > 0 ? col.reqs.find(i => i.id === reqId)?.name.split(";")[1] : "";
        dispatch(Actions.SetSelectedReqAction(reqId, props.reqIndex, parentId));
      }
    });

    if (props.request.colId && colRequestList.findIndex(i => i.id === props.request.colId) === -1) {
      vscode.postMessage({ type: requestTypes.getCollectionsByIdWithPathRequest, data: props.request.colId });
    }
  }, []);

  useEffect(() => {
    if (props.request.colId && colRequestList.length > 0) {
      setSelectedRequestList(colRequestList.find(i => i.id === props.request.colId)?.reqs);
    }
  }, [colRequestList]);

  const onSelectCollection = (colId: string, index: number) => {
    dispatch(Actions.SetSelectedColAction(colId, index));

    if (colRequestList.findIndex(i => i.id === colId) === -1) {
      vscode.postMessage({ type: requestTypes.getCollectionsByIdWithPathRequest, data: colId });
    } else {
      let reqs = colRequestList.find(i => i.id === colId)?.reqs;
      setSelectedRequestList(reqs);
      dispatch(Actions.SetSelectedReqAction(reqs.length > 0 ? reqs[0].id : "", index, reqs.length > 0 ? reqs[0].name.split(";")[1] : ""));
    }
  };

  const onSelectRequest = (value: string, selectedIndex: number, reqIndex: number) => {
    dispatch(Actions.SetSelectedReqAction(value, reqIndex, selectedRequestList[selectedIndex].name.split(";")[1]));
  };

  const onSelectItem = (value: string, reqIndex: number, condIndex: number, type: string) => {
    let localTable = addValue(value, condIndex, type);
    dispatch(Actions.SetPreConditionAction(localTable, reqIndex, condIndex));
  };

  const onSelect = (event: React.ChangeEvent<HTMLSelectElement> | React.ChangeEvent<HTMLInputElement>, reqIndex: number, condIndex: number, type: string) => {
    onSelectItem(event.target.value, reqIndex, condIndex, type);
  };

  const addValue = (value: string, condIndex: number, selectType: string): ITest => {
    let localValue = { ...props.request };
    let condition = localValue.condition[condIndex];
    localValue.condition[condIndex] = {
      parameter: selectType === "parameter" ? value : condition.parameter,
      action: selectType === "action" ? value : condition.action,
      expectedValue: selectType === "expectedValue" ? value : condition.expectedValue,
      customParameter: selectType === "customParameter" ? value : condition.customParameter
    };

    return localValue.condition[condIndex];
  };

  function onDelete(reqIndex: number, condIndex: number) {
    dispatch(Actions.SetDeletePreConditionAction(reqIndex, condIndex));
  }

  function onDeleteReqClick(index: number) {
    dispatch(Actions.SetDeletePreRequestAction(index));
  }

  function getParameterList(row: ITest, reqIndex: number, conIndex: number) {
    return (
      <select
        required={true}
        className="test-parameter-select preReq-select"
        value={row.parameter}
        id={"preReq_parameter_" + reqIndex.toString()}
        onChange={(e) => onSelect(e, reqIndex, conIndex, "parameter")}>
        {
          preConditions.map((param: any, index: number) => {
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
    );
  }

  function getActionList(row: ITest, reqIndex: number, conIndex: number) {
    let parameter = preConditionActions[row.parameter];
    let actionList: any;

    if (parameter) {
      actionList = row.parameter ? (row.parameter === "noCondition" ? [] : parameter["action"]) : [{ name: "action", value: "" }];
    }
    else {
      actionList = [{ name: "action", value: "", }];
    }

    return (
      <select
        disabled={actionList.length > 0 ? false : true}
        required={true}
        className="test-action-select preReq-select"
        id={"preReq_action_" + reqIndex.toString()}
        value={row.action}
        onChange={(e) => onSelect(e, reqIndex, conIndex, "action")}>
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

  const makeCondition = (conditions: ITest[], reqIndex: number) => {

    return (
      <fieldset>
        <legend>Condition {reqIndex} <span><label className="runall-settings-info-label" title={`Request ${reqIndex + 1} will execute only if below conditions are succeed`}>ⓘ</label></span></legend>
        {
          conditions.map((item: ITest, conIndex: number) => {
            return (
              <div className="preReq-condition-panel" key={"preReq_cond_panel_" + props.reqIndex + conIndex}>
                <div className="preReq-condition-param-panel">
                  {getParameterList(item, reqIndex, conIndex)}
                </div>
                <div className="preReq-condition-param-panel">
                  {getActionList(item, reqIndex, conIndex)}
                </div>
                <div className="preReq-condition-param-panel">
                  <TextEditor
                    varWords={selectedVariable.data.map(item => item.key)}
                    placeholder="condition"
                    onChange={(val) => onSelectItem(val, reqIndex, conIndex, "expectedValue")}
                    value={item.expectedValue}
                    focus={false}
                    disabled={item.parameter === "noCondition"}
                  />
                </div>
                <div className="preReq-condition-delete-panel">
                  {conIndex !== conditions.length - 1 ?
                    <BinLogo title="delete condition" className="delete-button preReq-condition-delete-btn" onClick={() => onDelete(reqIndex, conIndex)} />
                    :
                    <></>
                  }
                </div>
              </div >
            );
          })
        }
      </fieldset>
    );
  };

  const makeRequest = (req: IRunRequest, reqIndex: number) => {
    return (
      <>
        {
          reqIndex > 0 && makeCondition(req.condition, reqIndex)
        }
        <fieldset className={reqIndex !== 0 ? "preReq-field-panel" : ""}>
          <legend>Pre-request {reqIndex + 1}</legend>
          <div>
            <div className="preReq-delete-panel">
              <BinLogo className="delete-button" onClick={() => onDeleteReqClick(reqIndex)} />
            </div>
            <div className="preReq-text-panel">
              <label className="oauth-label">Collection</label>
              <select className="preReq-col-select"
                id={"preReq_col_" + reqIndex.toString()}
                required={true}
                value={props.request.colId}
                onChange={(e) => onSelectCollection(e.target.value, reqIndex)}>
                {collectionList?.length > 0 && collectionList.map((item, index) => (
                  <option value={item.id} key={index + item.name} disabled={index === 0 ? true : false} hidden={index === 0 ? true : false}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="preReq-text-panel">
              <label className="oauth-label">Request</label>
              <select className="preReq-col-select"
                id={"preReq_req_" + reqIndex.toString()}
                required={true}
                value={props.request.reqId}
                onChange={(e) => onSelectRequest(e.target.value, e.target.selectedIndex, reqIndex)}>
                {selectedRequestList?.length > 0 && selectedRequestList.map(({ id, name }) => (
                  <option value={id} key={id}>
                    {name.split(";")[0]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>
      </>
    );
  };

  return (
    <div className="preReq-panel">
      {makeRequest(props.request, props.reqIndex)}
    </div>
  );
};