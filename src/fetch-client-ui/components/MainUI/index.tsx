import "./style.css";
import { Actions } from "../RequestUI/redux";
import { AppDispatch } from "../../store/appStore";
import { formatDate } from "../../../fetch-client-core/helpers/helper";
import { IRootState } from '../../reducer/combineReducer';
import { OptionsPanel } from "../RequestUI/OptionsPanel";
import { RequestPanel } from "../RequestUI/RequestPanel";
import { requestTypes } from "../../../fetch-client-core/consts/requestTypes.consts";
import { UIActions } from './redux';
import { useDispatch, useSelector } from 'react-redux';
import { useWindowMessages } from "./hooks/useWindowMessages";
import { v4 as uuidv4 } from 'uuid';
import { VariableActions } from "../Variables/redux";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Split from 'react-split';
import vscode from "../Common/vscodeAPI";

function parseDocumentTitle() {
	const parts = document.title.split("@:@");
	return {
		reqId: parts[0],
		colId: parts[1],
		varId: parts[2],
		isRunItem: parts[3],
		folderId: parts[4],
	};
}

const MainUI = () => {

	const dispatch = useDispatch<AppDispatch>();

	const ReponsePanel = React.lazy(() => import('../ResponseUI/ResponsePanel'));

	const { open } = useSelector((state: IRootState) => state.uiData);
	const { loading, response } = useSelector((state: IRootState) => state.responseData);
	const requestData = useSelector((state: IRootState) => state.requestData);
	const { variables } = useSelector((state: IRootState) => state.variableData);
	const { parentSettings, collectionList } = useSelector((state: IRootState) => state.reqColData);
	const { selectedVariable } = useSelector((state: IRootState) => state.variableData);
	const reqSettings = useSelector((state: IRootState) => state.reqSettings);

	// Parse title once on mount; document.title does not change during the webview's lifetime
	const { reqId, colId, varId: titleVarId, isRunItem, folderId } = useMemo(parseDocumentTitle, []);

	// Stable refs so event-handler closures always read the latest Redux values
	const requestDataRef = useRef(requestData);
	const selectedVariableRef = useRef(selectedVariable);
	const parentSettingsRef = useRef(parentSettings);
	const reqSettingsRef = useRef(reqSettings);
	const waitForSendRef = useRef(false);

	useEffect(() => { requestDataRef.current = requestData; }, [requestData]);
	useEffect(() => { selectedVariableRef.current = selectedVariable; }, [selectedVariable]);
	useEffect(() => { parentSettingsRef.current = parentSettings; }, [parentSettings]);
	useEffect(() => { reqSettingsRef.current = reqSettings; }, [reqSettings]);

	const [reqClass, setReqClass] = useState("full-height");
	const [resClass, setResClass] = useState("zero-height");
	const [reqBorderClass, setReqBorderClass] = useState("");
	const [resBorderClass, setResBorderClass] = useState("no-border");
	const [varId, setVarId] = useState(titleVarId !== "undefined" ? titleVarId : "");
	const [layout, setLayout] = useState("");
	const [horiLayout, setHoriLayout] = useState("");
	const [saveVisible, setSaveVisible] = useState(false);
	const [loadingApp, setLoadingApp] = useState(true);

	const onSaved = useCallback(() => setSaveVisible(true), []);
	const onSetVarId = useCallback((id: string) => setVarId(id), []);
	const onClearVarId = useCallback(() => setVarId(""), []);

	useWindowMessages(
		dispatch,
		colId,
		{
			requestData: requestDataRef,
			selectedVariable: selectedVariableRef,
			parentSettings: parentSettingsRef,
			reqSettings: reqSettingsRef,
			waitForSend: waitForSendRef,
		},
		{
			setLayout,
			setHoriLayout,
			setLoadingApp,
			onSaved,
			onSetVarId,
			onClearVarId,
		}
	);

	useEffect(() => {
		if (loading && resClass === "zero-height") {
			setOpenPanel(1);
		}
	}, [loading]);

	useEffect(() => {
		if ((response.status !== 0 || response.isError) && resClass === "zero-height") {
			setOpenPanel(1);
		}
	}, [response]);

	useEffect(() => {
		setReqBorderClass(reqClass === "zero-height" ? "no-border" : "");
		setResBorderClass(resClass === "zero-height" ? "no-border" : "");
	}, [reqClass, resClass]);

	useEffect(() => {
		const timer = saveVisible ? setTimeout(() => setSaveVisible(false), 2000) : undefined;
		return () => { if (timer !== undefined) { clearTimeout(timer); } };
	}, [saveVisible]);

	useEffect(() => {
		vscode.postMessage({ type: requestTypes.configRequest });
		vscode.postMessage({ type: requestTypes.getAllVariableRequest });

		if (reqId !== "undefined" && isRunItem === "undefined") {
			vscode.postMessage({ type: requestTypes.openExistingItemRequest, data: reqId });
		} else if (reqId !== "undefined" && isRunItem === "OpenAndRun") {
			dispatch(UIActions.SetRunItemAction(true));
			vscode.postMessage({ type: requestTypes.getOpenAndRunItemDataRequest, data: reqId });
		} else if (isRunItem !== "undefined" && isRunItem !== "OpenAndRun") {
			dispatch(UIActions.SetRunItemAction(true));
			vscode.postMessage({ type: requestTypes.getRunItemDataRequest });
		} else {
			setLoadingApp(false);
		}

		vscode.postMessage({ type: requestTypes.getParentSettingsRequest, data: { colId, folderId } });

		if (collectionList.length === 0) {
			setTimeout(() => vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "addtocol" }), 1000);
		}

		dispatch(Actions.SetReqColDetailsAction(
			colId !== "undefined" ? colId : "",
			folderId !== "undefined" ? folderId : ""
		));

		vscode.postMessage({ type: requestTypes.getAllCookiesRequest });

		const handleKeyDown = (e: KeyboardEvent) => {
			if (!(e.ctrlKey && (e.key === "S" || e.key === "s"))) { return; }
			e.preventDefault();
			if (!requestDataRef.current.url) { return; }

			let reqData = { ...requestDataRef.current };
			let isNew = false;
			if (!reqData.name) {
				reqData.id = uuidv4();
				reqData.name = reqData.url.trim();
				reqData.createdTime = formatDate();
				dispatch(Actions.SetRequestAction(reqData));
				isNew = true;
			}
			vscode.postMessage({
				type: requestTypes.saveRequest,
				data: { reqData, isNew, colId: colId === "undefined" ? undefined : colId },
			});
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		if (!variables?.length) { return; }
		if (varId) {
			updateVariableData(varId);
		} else {
			setRequiredGlobalVariable();
		}
	}, [variables, varId]);

	useEffect(() => {
		if (parentSettings?.auth.authType === "apikey") {
			modifyQueryParam(parentSettings.auth.addTo, parentSettings.auth.userName, parentSettings.auth.password);
		}
	}, [parentSettings]);

	function updateVariableData(id: string) {
		const index = variables.findIndex((item) => item.id === id);
		if (index !== -1) {
			dispatch(VariableActions.SetReqVariableAction(variables[index]));
		} else {
			setRequiredGlobalVariable();
		}
	}

	function setRequiredGlobalVariable() {
		const index = variables.findIndex(
			(item) => item.name.toUpperCase().trim() === "GLOBAL" && item.isActive === true
		);
		if (index !== -1) {
			dispatch(VariableActions.SetReqVariableAction(variables[index]));
			setVarId(variables[index].id);
		}
	}

	function modifyQueryParam(section: string, userName: string, password: string) {
		if (section === "queryparams") {
			const localParams = [...requestData.params];
			const alreadyAdded = localParams.some(
				(item) => item.isFixed === true && item.key === userName && item.value === password
			);
			if (!alreadyAdded && userName) {
				localParams.unshift({ isChecked: true, key: userName, value: password, isFixed: true });
				dispatch(Actions.SetRequestParamsAction(localParams));
			}
		} else {
			const localHeaders = [...requestData.headers];
			const alreadyAdded = localHeaders.some(
				(item) => item.isFixed === true && item.key === userName && item.value === password
			);
			if (!alreadyAdded && userName) {
				localHeaders.unshift({ isChecked: true, key: userName, value: password, isFixed: true });
			}
			dispatch(Actions.SetRequestHeadersAction(localHeaders));
		}
	}

	function setOpenPanel(index: number) {
		if (index === 0) {
			if (open[0]) {
				setResFull();
				dispatch(UIActions.SetOpenAction([false, true]));
			} else if (!open[0] && open[1]) {
				setBothHalf();
				dispatch(UIActions.SetOpenAction([true, true]));
			} else {
				setReqFull();
				dispatch(UIActions.SetOpenAction([true, false]));
			}
		} else {
			if (open[1]) {
				setReqFull();
				dispatch(UIActions.SetOpenAction([true, false]));
			} else if (open[0] && !open[1]) {
				setBothHalf();
				dispatch(UIActions.SetOpenAction([true, true]));
			} else {
				setResFull();
				dispatch(UIActions.SetOpenAction([false, true]));
			}
		}
	}

	function setBothHalf() {
		setReqClass("half-height");
		setResClass("half-height");
		document.getElementById("fullscreen-expand-btn")?.classList.remove("fullscreen-btn-invisible");
	}

	function setReqFull() {
		setReqClass("full-height");
		setResClass("zero-height");
		document.getElementById("fullscreen-expand-btn")?.classList.add("fullscreen-btn-invisible");
	}

	function setResFull() {
		setReqClass("zero-height");
		setResClass("full-height");
		document.getElementById("fullscreen-expand-btn")?.classList.remove("fullscreen-btn-invisible");
	}

	return (
		<>
			{loadingApp ? (
				<>
					<div id="divSpinner" className="spinner loading"></div>
					<div className="loading-history-text">{"Loading...."}</div>
				</>
			) : (
				<>
					{layout === "Horizontal Split" ? (
						horiLayout === "Split Style" ? (
							<Split className="split split-horizontal" gutterSize={2} direction="vertical" cursor="ns-resize" minSize={60}>
								<div>
									<RequestPanel />
									<div className={saveVisible ? "save-text save-visible save-text-horizontal" : "save-text save-invisible"}>Saved Successfully</div>
									<OptionsPanel />
								</div>
								<div>
									<React.Suspense fallback={<div>loading...</div>}><ReponsePanel isVerticalLayout={false} isCurl={false} /></React.Suspense>
								</div>
							</Split>
						) : (
							<>
								<section id="req-section" className={"accordion " + reqClass}>
									<input type="checkbox" name="collapse" id="handle1" onChange={() => { setOpenPanel(0); }} checked={open[0]} />
									<h2 className="handle">
										<label className="accordion-title" htmlFor="handle1">
											Request
										</label>
									</h2>
									<div className={reqBorderClass + " content"}>
										<RequestPanel />
										<div className={saveVisible ? "save-text save-visible save-text-horizontal" : "save-text save-invisible"}>Saved Successfully</div>
										<OptionsPanel />
									</div>
								</section>
								<section id="res-section" className={"accordion " + resClass}>
									<input type="checkbox" name="collapse" id="handle3" onChange={() => { setOpenPanel(1); }} checked={open[1]} />
									<h2 className="handle">
										<label className="accordion-title" htmlFor="handle3">
											Response
										</label>
									</h2>
									<div className={resBorderClass + " content"}>
										<React.Suspense fallback={<div>loading...</div>}><ReponsePanel isVerticalLayout={false} isCurl={false} /></React.Suspense>
									</div>
								</section>
							</>
						)
					) : (
						<Split className="split split-vertical" gutterSize={1} cursor="ew-resize" minSize={230}>
							<div>
								<RequestPanel />
								<div className={saveVisible ? "save-text save-visible" : "save-text save-invisible"}>Saved Successfully</div>
								<OptionsPanel />
							</div>
							<div>
								<React.Suspense fallback={<div>loading...</div>}><ReponsePanel isVerticalLayout={true} isCurl={false} /></React.Suspense>
							</div>
						</Split>
					)}
				</>
			)}
		</>
	);
};

export default MainUI;
