import "./style.css";
import {
	allAuthTypes,
	basicAuthTypes,
} from "../../../../fetch-client-core/consts/auth.consts";
import { IRootState } from "../../../reducer/combineReducer";
import { OptionsTab } from "./OptionTab";
import { requestOptions } from "./consts";
import { useSelector } from "react-redux";
import QueryParams from "./Options/QueryParams";
import React, { useState } from "react";

export const OptionsPanel = () => {
	const { selectedVariable } = useSelector(
		(state: IRootState) => state.variableData,
	);
	const { colId } = useSelector((state: IRootState) => state.reqColData);
	const { runItem } = useSelector((state: IRootState) => state.uiData);

	const [selectedTab, setSelectedTab] = useState(
		runItem ? "postFetch" : "params",
	);

	const AuthPanel = React.lazy(() => import("./Options/Auth"));
	const RequestHeadersPanel = React.lazy(
		() => import("./Options/Headers/requestHeaders"),
	);
	const Body = React.lazy(() => import("./Options/Body"));
	const Settings = React.lazy(() => import("./Options/Settings"));
	const PreFetch = React.lazy(() => import("./Options/PreFetch"));
	const PostFetch = React.lazy(() => import("./Options/PostFetch"));

	const renderOptionsUI = (tab: string) => {
		switch (tab) {
			case "params":
				return <QueryParams />;
			case "authorization":
				return (
					<React.Suspense fallback={<div>loading...</div>}>
						<AuthPanel
							authTypes={colId ? allAuthTypes : basicAuthTypes}
							selectedVariable={selectedVariable}
						/>
					</React.Suspense>
				);
			case "headers":
				return (
					<React.Suspense fallback={<div>loading...</div>}>
						<RequestHeadersPanel />
					</React.Suspense>
				);
			case "body":
				return (
					<React.Suspense fallback={<div>loading...</div>}>
						<Body />
					</React.Suspense>
				);
			case "settings":
				return (
					<React.Suspense fallback={<div>loading...</div>}>
						<Settings />
					</React.Suspense>
				);
			case "preFetch":
				return (
					<React.Suspense fallback={<div>loading...</div>}>
						<PreFetch />
					</React.Suspense>
				);
			default:
				return (
					<React.Suspense fallback={<div>loading...</div>}>
						<PostFetch />
					</React.Suspense>
				);
		}
	};

	return (
		<div className="options-panel">
			<div className="options-container">
				<OptionsTab
					selectedTab={selectedTab}
					setSelectedTab={setSelectedTab}
					options={requestOptions}
					settings={true}
				/>
				<div className="options-tab-panel">{renderOptionsUI(selectedTab)}</div>
			</div>
		</div>
	);
};
