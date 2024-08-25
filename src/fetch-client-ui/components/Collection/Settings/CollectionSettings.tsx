import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import { IRootState } from "../../../reducer/combineReducer";
import vscode from "../../Common/vscodeAPI";
import { AuthPanel } from "../../RequestUI/OptionsPanel/Options/Auth";
import { allAuthTypes, basicAuthTypes } from "../../RequestUI/OptionsPanel/Options/Auth/consts";
import { ParentHeadersPanel } from "../../RequestUI/OptionsPanel/Options/Headers/parentHeaders";
import { PreFetch } from "../../RequestUI/OptionsPanel/Options/PreFetch";
import { Actions } from "../../RequestUI/redux";
import { ICollection } from "../../RequestUI/redux/types";
import { IResponse } from "../../ResponseUI/redux/types";
import { InitialSettings } from "../../SideBar/redux/reducer";
import { ISettings, IVariable } from "../../SideBar/redux/types";
import { SettingsType } from "../consts";
import "../style.css";

const CollectionSettings = () => {

	const dispatch = useDispatch();

	const { auth, preFetch, headers } = useSelector((state: IRootState) => state.requestData);

	const [tabOptions] = useState(["Headers", "Authorization", "PreRequest"]);
	const [selectedTab, setSelectedTab] = useState("Headers");
	const [type, setType] = useState(SettingsType.Collection);
	const [colId, setColId] = useState("");
	const [folderId, setFolderId] = useState("");
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(true);
	const [isDone, setDone] = useState(false);
	const [variableItem, setVariableItem] = useState<IVariable>(null);

	useEffect(() => {
		window.addEventListener("message", (event) => {
			if (event.data && event.data.type === responseTypes.getColSettingsResponse) {
				let settings: ISettings;
				if (event.data && event.data.data.settings) {
					settings = event.data.data.settings;
				}
				else {
					settings = InitialSettings;
					if (type === SettingsType.Folder) {
						settings.auth.authType = "inherit";
					}
				}
				dispatch(Actions.SetRequestAuthAction(settings.auth));
				settings.preFetch && dispatch(Actions.SetPreFetchAction(settings.preFetch));
				settings.headers && dispatch(Actions.SetRequestHeadersAction(settings.headers));
			} else if (event.data && event.data.type === responseTypes.saveColSettingsResponse) {
				setDone(true);
			} else if (event.data && event.data.type === responseTypes.getVariableItemResponse) {
				setVariableItem(event.data.data[0] as IVariable);
			} if (event.data && event.data.type === responseTypes.tokenResponse) {
				let tokenResponse: IResponse = event.data.response as IResponse;
				if (!tokenResponse.isError && tokenResponse.status === 200) {
					const responseData = JSON.parse(tokenResponse.responseData);
					let tokenName = auth.oauth.tokenName ? auth.oauth.tokenName : "access_token";
					dispatch(Actions.SetOAuthTokenAction(responseData[tokenName] ? responseData[tokenName] : ""));
				}
			} else if (event.data && event.data.type === responseTypes.getAllCollectionNameResponse) {
				let col: ICollection[] = event.data.collectionNames?.map((item: { value: any; name: any; }) => {
					return {
						id: item.value,
						name: item.name
					};
				});
				col.unshift({ id: "", name: "select" });
				dispatch(Actions.SetCollectionListAction(col));
			}
		});

		let splitData = document.title.split("@:@");
		const type = splitData[1];
		const colId = splitData[2];
		const folderId = splitData[3];
		const name = splitData[4];
		const varId = splitData[5];
		setType(type);
		setColId(colId);
		setFolderId(folderId);
		setName(name);

		vscode.postMessage({ type: requestTypes.getVariableItemRequest, data: { id: varId, isGlobal: (varId !== "undefined" && varId !== undefined && varId !== "") ? false : true } });
		vscode.postMessage({ type: requestTypes.getColSettingsRequest, data: { colId: colId, folderId: folderId } });
		vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "addtocol" });
	}, []);

	useEffect(() => {
		if (variableItem && headers) {
			setLoading(false);
		}
	}, [variableItem, headers]);

	function onSelectedTab(tab: string) {
		setSelectedTab(tab);
	}

	function getBody() {
		return (
			<div className="col-settings-body">
				{selectedTab === "Authorization" && variableItem && <AuthPanel settingsMode={true} authTypes={type === SettingsType.Collection ? basicAuthTypes : allAuthTypes} selectedVariable={variableItem} />}
				{selectedTab === "PreRequest" && <PreFetch settingsMode={true} />}
				{selectedTab === "Headers" && variableItem && <ParentHeadersPanel selectedVariable={variableItem} />}
			</div>
		);
	}

	function getTabRender() {
		return (
			tabOptions.map((tab) => {
				return (
					<button key={tab} className={selectedTab === tab ? "sidebar-tab-menu sidebar-tab-menu-settings selected" : "sidebar-tab-menu sidebar-tab-menu-settings"} onClick={() => onSelectedTab(tab)}>{tab}</button>
				);
			})
		);
	}

	function onSubmitClick() {
		let settings: ISettings = {
			auth: { ...auth },
			preFetch: { ...preFetch },
			headers: [...headers]
		};

		vscode.postMessage({ type: requestTypes.saveColSettingsRequest, data: { colId: colId, folderId: folderId, settings: settings } });
	}

	return (
		<div className="col-settings-panel">
			<div className="col-settings-header">⚙️ {type} Settings</div>
			<div className="col-settings-name-panel">
				<span className="addto-title-label">{type} :</span>
				<span className="addto-title-label">{name}</span>
			</div>
			<div className="col-settings-panel-tabs">
				{
					getTabRender()
				}
			</div>
			{
				loading ?
					<>
						<div id="divSpinner" className="spinner loading"></div>
						<div className="loading-history-text">{"Loading...."}</div>
					</>
					:
					<div className="sidebar-panel-body">
						{
							getBody()
						}
						<div className="button-panel">
							<button
								type="submit"
								className="submit-button"
								onClick={onSubmitClick}
							>
								Submit
							</button>
						</div>
						<div className="message-panel">
							{isDone && (<span className="success-message">Settings are updated successfully</span>)}
						</div>
					</div>
			}
		</div>
	);
};

export default CollectionSettings;
