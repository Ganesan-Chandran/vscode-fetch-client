import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import { IRootState } from "../../../reducer/combineReducer";
import vscode from "../../Common/vscodeAPI";
import { AuthPanel } from "../../RequestUI/OptionsPanel/Options/Auth";
import { basicAuthTypes } from "../../RequestUI/OptionsPanel/Options/Auth/consts";
import { Actions } from "../../RequestUI/redux";
import { IColSettings } from "../../SideBar/redux/types";
import { SettingsType } from "../consts";
import "../style.css";

const CollectionSettings = () => {

    const dispatch = useDispatch();

    const [tabOptions] = useState(["Authorization"]);
    const [selectedTab, setSelectedTab] = useState("Authorization");
    const [type, setType] = useState(SettingsType.Collection);
    const [id, setId] = useState("");
    const [name, setName] = useState("");
    const [isDone, setDone] = useState(false);
    const [currentSetting, setCurrentSettings] = useState<IColSettings>(null);

    const { auth } = useSelector((state: IRootState) => state.requestData);

    useEffect(() => {
        window.addEventListener("message", (event) => {
            if (event.data && event.data.type === responseTypes.getColSettingsResponse) {
                setCurrentSettings(event.data.settings);
                if (event.data.settings && event.data.settings.auth) {
                    dispatch(Actions.SetRequestAuthAction(event.data.settings.auth));
                }
            } else if (event.data && event.data.type === responseTypes.saveColSettingsResponse) {
                setDone(true);
            }
        });

        const type = document.title.split(":")[1];
        const id = document.title.split(":")[2];
        const name = document.title.split(":")[3];
        setType(type);
        setId(id);
        setName(name);

        vscode.postMessage({ type: requestTypes.getColSettingsRequest, data: { id: id, type: type } });
    }, []);

    function onSelectedTab(tab: string) {
        setSelectedTab(tab);
    }

    function getBody() {
        return (
            <div className="col-settings-body">
                {
                    type === SettingsType.Collection
                        ?
                        <AuthPanel settingsMode={true} authTypes={basicAuthTypes} />
                        :
                        <AuthPanel settingsMode={true} />
                }
            </div>
        );
    }

    function getTabRender() {
        return (
            tabOptions.map((tab) => {
                return (
                    <button key={tab} className={selectedTab === tab ? "sidebar-tab-menu selected" : "sidebar-tab-menu"} onClick={() => onSelectedTab(tab)}>{tab}</button>
                );
            })
        );
    }

    function onSubmitClick() {
        let settings: IColSettings;

        if (currentSetting) {
            currentSetting.auth = { ...auth };
        } else {
            settings = {
                auth: { ...auth }
            };
        }

        vscode.postMessage({ type: requestTypes.saveColSettingsRequest, data: { id: id, type: type, settings: currentSetting ? currentSetting : settings } });
    }

    return (
        <div className="col-settings-panel">
            <div className="col-settings-header">{type} Settings</div>
            <div className="col-settings-name-panel">
                <span className="addto-title-label">{type} :</span>
                <span className="addto-title-label">{name}</span>
            </div>
            <div className="col-settings-panel-tabs">
                {
                    getTabRender()
                }
            </div>
            <div className="sidebar-panel-body">
                {
                    getBody()
                }
                <div className="button-panel">
                    <button
                        type="submit"
                        className="request-send-button"
                        onClick={onSubmitClick}
                    >
                        Submit
                    </button>
                </div>
                <div className="message-panel">
                    {isDone && (<span className="success-message">Settings are updated successfully</span>)}
                </div>
            </div>
        </div>
    );
};

export default CollectionSettings;