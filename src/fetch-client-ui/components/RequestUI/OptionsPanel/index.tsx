import React, { useState } from "react";
import { useSelector } from "react-redux";
import { IRootState } from "../../../reducer/combineReducer";
import { OptionsTab } from "./OptionTab";
import { AuthPanel } from "./Options/Auth";
import { allAuthTypes, basicAuthTypes } from "./Options/Auth/consts";
import { Body } from "./Options/Body";
import { RequestHeadersPanel } from "./Options/Headers/requestHeaders";
import { PostFetch } from "./Options/PostFetch";
import { PreFetch } from "./Options/PreFetch";
import { QueryParams } from "./Options/QueryParams";
import { Settings } from "./Options/Settings";
import { requestOptions } from "./consts";
import "./style.css";

export const OptionsPanel = () => {

	const { selectedVariable } = useSelector((state: IRootState) => state.variableData);
	const { colId } = useSelector((state: IRootState) => state.reqColData);
	const { runItem } = useSelector((state: IRootState) => state.uiData);

	const [selectedTab, setSelectedTab] = useState(runItem ? "postFetch" : "params");

	const renderOptionsUI = (tab: string) => {
		switch (tab) {
			case 'params':
				return <QueryParams />;
			case 'authorization':
				return <AuthPanel authTypes={colId ? allAuthTypes : basicAuthTypes} selectedVariable={selectedVariable} />;
			case 'headers':
				return <RequestHeadersPanel />;
			case 'body':
				return <Body />;
			case 'settings':
				return <Settings />;
			case 'preFetch':
				return <PreFetch />;
			default:
				return <PostFetch />;
		}
	};

	return (
		<div className="options-panel">
			<div className="options-container">
				<OptionsTab selectedTab={selectedTab} setSelectedTab={setSelectedTab} options={requestOptions} settings={true} />
				<div className="options-tab-panel">
					{renderOptionsUI(selectedTab)}
				</div>
			</div>
		</div>
	);
};
