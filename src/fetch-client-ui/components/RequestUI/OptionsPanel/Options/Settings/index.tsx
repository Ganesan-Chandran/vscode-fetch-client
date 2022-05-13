import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { IVariable } from "../../../../SideBar/redux/types";
import { VariableActions } from "../../../../Variables/redux";
import "./style.css";

export const Settings = () => {

    const dispatch = useDispatch();

    const { selectedVariable, variables, isLocalChange } = useSelector((state: IRootState) => state.variableData);
    const [enabled, setEnabled] = useState(true);
    const [globalActive, setGlobalActive] = useState(false);

    function onSelectVariable(evt: any) {
        let vars = variables.filter(item => item.id === evt.target.value);
        setGlobalActive(false);
        dispatch(VariableActions.SetReqVariableAction(vars[0] as IVariable));
        dispatch(VariableActions.SetReqLocalChangeAction(true));
    }

    useEffect(() => {
        if (isLocalChange) {
            setEnabled(true);
        }
        else if (selectedVariable.id && selectedVariable.name.toUpperCase().trim() !== "GLOBAL") {
            setEnabled(false);
        } else {
            let globalVar = variables.filter(item => item.name.toUpperCase().trim() === "GLOBAL" && item.isActive === true);
            if (globalVar && globalVar.length > 0) {
                setGlobalActive(true);
            }
        }
    }, []);

    function getVariableData() {
        let colNames = [{ name: "Select", value: "", disabled: true }];
        variables.forEach(item => {
            colNames.push({ name: item.name, value: item.id, disabled: false });
        });

        return colNames.map((param: any, index: number) => {
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
        });
    }

    return (
        <div className="settings-panel">
            <div className="settings-item-left">Variable :</div>
            <div className="settings-item-right">
                <select
                    className="settings-var-select"
                    required={true}
                    value={selectedVariable.id}
                    onChange={(e) => onSelectVariable(e)}
                    disabled={!enabled}
                >
                    {
                        getVariableData()
                    }
                </select>
                <br /><br />
                {globalActive && <span className="global-var-text"><b>Note : </b><span>Currently, global variable is active. If you select the other variable, then it will be replace the global variable for this request.</span></span>}
            </div>
            <span><u><b>Note :</b></u><span> These settings will not be saved to history. It is only used for performing this request.</span></span>
        </div>
    );
};