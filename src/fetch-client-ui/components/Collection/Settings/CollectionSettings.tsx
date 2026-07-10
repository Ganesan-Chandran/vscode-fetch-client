import "../style.css";
import { Actions } from "../../RequestUI/redux";
import { AppDispatch } from "../../../store/appStore";
import { AuthPanel } from "../../RequestUI/OptionsPanel/Options/Auth";
import {
	basicAuthTypes,
	allAuthTypes,
} from "../../../../fetch-client-core/consts/auth.consts";
import { ICollection } from "../../../../fetch-client-core/types/prefetch.types";
import { InitialSettings } from "../../../../fetch-client-core/consts/initialValues.consts";
import { IResponse } from "../../../../fetch-client-core/types/response.types";
import { IRootState } from "../../../reducer/combineReducer";
import {
	IVariable,
	ISettings,
} from "../../../../fetch-client-core/types/sidebar.types";
import { ParentHeadersPanel } from "../../RequestUI/OptionsPanel/Options/Headers/parentHeaders";
import { PreFetch } from "../../RequestUI/OptionsPanel/Options/PreFetch";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import { SettingsType } from "../../../../fetch-client-core/consts/common.consts";
import { useDispatch, useSelector } from "react-redux";
import React, { useEffect, useState } from "react";
import vscode from "../../Common/vscodeAPI";
import PanelLayout from "../../Common/Layout/panelLayout";

const CollectionSettings = () => {
	const dispatch = useDispatch<AppDispatch>();

	const { auth, preFetch, headers } = useSelector(
		(state: IRootState) => state.requestData,
	);

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
		const handleMessage = (event: MessageEvent) => {
			if (
				event.data &&
				event.data.type === responseTypes.getColSettingsResponse
			) {
				let settings: ISettings;
				if (event.data && event.data.data.settings) {
					settings = event.data.data.settings;
				} else {
					settings = InitialSettings;
					if (type === SettingsType.Folder) {
						settings.auth.authType = "inherit";
					}
				}
				dispatch(Actions.SetRequestAuthAction(settings.auth));
				settings.preFetch &&
					dispatch(Actions.SetPreFetchAction(settings.preFetch));
				settings.headers &&
					dispatch(Actions.SetRequestHeadersAction(settings.headers));
			} else if (
				event.data &&
				event.data.type === responseTypes.saveColSettingsResponse
			) {
				setDone(true);
			} else if (
				event.data &&
				event.data.type === responseTypes.getVariableItemResponse
			) {
				setVariableItem(event.data.data[0] as IVariable);
			}
			if (event.data && event.data.type === responseTypes.tokenResponse) {
				let tokenResponse: IResponse = event.data.response as IResponse;
				if (!tokenResponse.isError && tokenResponse.status === 200) {
					const responseData = JSON.parse(tokenResponse.responseData);
					let tokenName = auth.oauth.tokenName
						? auth.oauth.tokenName
						: "access_token";
					dispatch(
						Actions.SetOAuthTokenAction(
							responseData[tokenName] ? responseData[tokenName] : "",
						),
					);
				}
			} else if (
				event.data &&
				event.data.type === responseTypes.getAllCollectionNameResponse
			) {
				let col: ICollection[] = event.data.collectionNames?.map(
					(item: { value: any; name: any }) => {
						return {
							id: item.value,
							name: item.name,
						};
					},
				);
				col.unshift({ id: "", name: "select" });
				dispatch(Actions.SetCollectionListAction(col));
			}
		};
		window.addEventListener("message", handleMessage);

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

		vscode.postMessage({
			type: requestTypes.getVariableItemRequest,
			data: {
				id: varId,
				isGlobal:
					varId !== "undefined" && varId !== undefined && varId !== ""
						? false
						: true,
			},
		});
		vscode.postMessage({
			type: requestTypes.getColSettingsRequest,
			data: { colId: colId, folderId: folderId },
		});
		vscode.postMessage({
			type: requestTypes.getAllCollectionNameRequest,
			data: "addtocol",
		});

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	useEffect(() => {
		if (variableItem && headers) {
			setLoading(false);
		}
	}, [variableItem, headers]);

	function onSelectedTab(tab: string) {
		setSelectedTab(tab);
	}

	// function getBody() {
	// 	return (
	// 		<div className="col-settings-body">
	// 			{selectedTab === "Authorization" && variableItem && <AuthPanel settingsMode={true} authTypes={type === SettingsType.Collection ? basicAuthTypes : allAuthTypes} selectedVariable={variableItem} />}
	// 			{selectedTab === "PreRequest" && <PreFetch settingsMode={true} />}
	// 			{selectedTab === "Headers" && variableItem && <ParentHeadersPanel selectedVariable={variableItem} />}
	// 		</div>
	// 	);
	// }

	// function getTabRender() {
	// 	return (
	// 		tabOptions.map((tab) => {
	// 			return (
	// 				<button key={tab} className={selectedTab === tab ? "sidebar-tab-menu sidebar-tab-menu-settings selected" : "sidebar-tab-menu sidebar-tab-menu-settings"} onClick={() => onSelectedTab(tab)}>{tab}</button>
	// 			);
	// 		})
	// 	);
	// }

	function onSubmitClick() {
		let settings: ISettings = {
			auth: { ...auth },
			preFetch: { ...preFetch },
			headers: [...headers],
		};

		vscode.postMessage({
			type: requestTypes.saveColSettingsRequest,
			data: { colId: colId, folderId: folderId, settings: settings },
		});
	}

	function renderHeader() {
		return (
			<div className="col-settings-name-panel">
				<span className="addto-title-label">{type} :</span>
				<span className="addto-title-label">{name}</span>
			</div>
		);
	}

	function renderTabs() {
		return (
			<div className="col-settings-panel-tabs">
				{tabOptions.map((tab) => (
					<button
						key={tab}
						className={
							selectedTab === tab
								? "sidebar-tab-menu sidebar-tab-menu-settings selected"
								: "sidebar-tab-menu sidebar-tab-menu-settings"
						}
						onClick={() => onSelectedTab(tab)}
					>
						{tab}
					</button>
				))}
			</div>
		);
	}

	function renderBody() {
		return (
			<div className="sidebar-panel-body">
				{renderTabs()}

				<div className="col-settings-body">
					{selectedTab === "Authorization" && variableItem && (
						<AuthPanel
							settingsMode={true}
							authTypes={
								type === SettingsType.Collection ? basicAuthTypes : allAuthTypes
							}
							selectedVariable={variableItem}
						/>
					)}

					{selectedTab === "PreRequest" && <PreFetch settingsMode={true} />}

					{selectedTab === "Headers" && variableItem && (
						<ParentHeadersPanel selectedVariable={variableItem} />
					)}
				</div>
			</div>
		);
	}

	function renderFooter() {
		return (
			<>
				{isDone && (
					<div className="reorder-status reorder-status--ok">
						Settings updated successfully.
					</div>
				)}

				<div className="reorder-btn-panel">
					<button
						type="button"
						className="submit-button reorder-btn"
						onClick={onSubmitClick}
					>
						Save Settings
					</button>
				</div>
			</>
		);
	}

	return (
		<PanelLayout
			title={`⚙️ ${type} Settings`}
			loading={loading}
			header={renderHeader()}
			footer={renderFooter()}
		>
			{renderBody()}
		</PanelLayout>
	);
};

export default CollectionSettings;
