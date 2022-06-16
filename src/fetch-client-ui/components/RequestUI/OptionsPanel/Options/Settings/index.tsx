import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { requestTypes } from "../../../../../../utils/configuration";
import { IRootState } from "../../../../../reducer/combineReducer";
import { getDomainName } from "../../../../Common/helper";
import vscode from "../../../../Common/vscodeAPI";
import { IVariable } from "../../../../SideBar/redux/types";
import { VariableActions } from "../../../../Variables/redux";
import "./style.css";

export const Settings = () => {

    const dispatch = useDispatch();

    const { selectedVariable, variables, isLocalChange } = useSelector((state: IRootState) => state.variableData);
    const { url } = useSelector((state: IRootState) => state.requestData);
    const { cookies } = useSelector((state: IRootState) => state.cookieData);
    const responseData = useSelector((state: IRootState) => state.responseData);

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
            if (item.isActive) {
                colNames.push({ name: item.name, value: item.id, disabled: false });
            }
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

    function onOpenVariable() {
        vscode.postMessage({ type: requestTypes.openVariableItemRequest, data: selectedVariable.id });
    }

    function onRefreshVariable() {
        vscode.postMessage({ type: requestTypes.getAllVariableRequest });
    }

    function onOpenCookies() {
        let id = "";
        if (cookies.length > 0) {
            let domainName = getDomainName(url, responseData.cookies[0]);

            if (!domainName) {
                return;
            }

            let cookie = cookies.filter(item => item.name === domainName);
            if (cookie.length > 0) {
                id = cookie[0].id;
            }
        }

        if (id) {
            vscode.postMessage({ type: requestTypes.openManageCookiesRequest, data: id });
        } else {
            vscode.postMessage({ type: requestTypes.openManageCookiesRequest });
        }

    }

    function onRefreshCookies() {
        vscode.postMessage({ type: requestTypes.getAllCookiesRequest });
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
                <button onClick={onOpenVariable} className="format-button open-var-button">Open Variable</button>
                <button onClick={onRefreshVariable} className="format-button open-var-button">Refresh</button>
                <br /><br />
                {globalActive && <span className="global-var-text"><b>Note : </b><span>Currently, global variable is active. If you select the other variable, then it will be replace the global variable for this request.</span></span>}
            </div>
            <div className="settings-item-left">Cookies :</div>
            <div className="settings-item-right">
                <button onClick={onOpenCookies} className="format-button open-var-button manage-cookie-button">Manage Cookies</button>
                <button onClick={onRefreshCookies} className="format-button open-var-button">Refresh</button>
                <br /><br />
            </div>
            <span><u><b>Note :</b></u><span> These settings will not be saved to history. It is only used for performing this request.</span></span>
        </div>
    );
};