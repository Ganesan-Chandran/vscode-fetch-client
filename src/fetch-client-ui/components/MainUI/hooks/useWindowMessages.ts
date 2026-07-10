import { Actions } from "../../RequestUI/redux";
import { AppDispatch } from "../../../store/appStore";
import { CookiesActions } from "../../Cookies/redux";
import { ICookie } from "../../../../fetch-client-core/types/cookie.types";
import {
	IReqSettings,
	ICollection,
} from "../../../../fetch-client-core/types/prefetch.types";
import { IRequestModel } from "../../../../fetch-client-core/types/request.types";
import {
	IVariable,
	ISettings,
} from "../../../../fetch-client-core/types/sidebar.types";
import { MutableRefObject, useEffect, useRef } from "react";
import {
	pubSubTypes,
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import { ResponseActions } from "../../ResponseUI/redux";
import { SendRequest } from "../../RequestUI/RequestPanel/common";
import { UIActions } from "../redux";
import { VariableActions } from "../../Variables/redux";
import vscode from "../../Common/vscodeAPI";

export interface IWindowMessageRefs {
	requestData: MutableRefObject<IRequestModel>;
	selectedVariable: MutableRefObject<IVariable>;
	parentSettings: MutableRefObject<ISettings>;
	reqSettings: MutableRefObject<IReqSettings>;
	waitForSend: MutableRefObject<boolean>;
}

export interface IWindowMessageCallbacks {
	setLayout: (value: string) => void;
	setHoriLayout: (value: string) => void;
	setLoadingApp: (value: boolean) => void;
	onSaved: () => void;
	onSetVarId: (varId: string) => void;
	onClearVarId: () => void;
}

export function useWindowMessages(
	dispatch: AppDispatch,
	colId: string,
	refs: IWindowMessageRefs,
	callbacks: IWindowMessageCallbacks,
): void {
	const callbacksRef = useRef(callbacks);
	callbacksRef.current = callbacks;

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const { data } = event;
			if (!data?.type) {
				return;
			}

			const cb = callbacksRef.current;

			switch (data.type) {
				case responseTypes.apiResponse: {
					dispatch(ResponseActions.SetResponseCookiesAction(data.cookies));
					dispatch(ResponseActions.SetResponseAction(data.response));
					dispatch(ResponseActions.SetResponseHeadersAction(data.headers));
					break;
				}

				case responseTypes.configResponse: {
					const config = JSON.parse(data.configData as string) as Record<
						string,
						unknown
					>;
					const layoutConfig = config["layout"] as string;
					const responseLimit = (config["responseLimit"] as number) * 1048576;
					cb.setLayout(layoutConfig);
					cb.setHoriLayout(config["horizontalLayout"] as string);
					dispatch(
						UIActions.SetLayoutAction(
							layoutConfig === "Horizontal Split",
							data.theme as number,
						),
					);
					dispatch(UIActions.SetResponseLimitAction(responseLimit));
					break;
				}

				case responseTypes.openExistingItemResponse:
				case responseTypes.getOpenAndRunItemDataResponse: {
					const reqData = data.item[0] as IRequestModel;
					dispatch(Actions.SetRequestAction(reqData));
					if (
						reqData.body.bodyType === "binary" &&
						reqData.body.binary?.fileName
					) {
						vscode.postMessage({
							type: requestTypes.readFileRequest,
							path: reqData.body.binary.fileName,
						});
					}
					cb.setLoadingApp(false);
					if (data.type === responseTypes.getOpenAndRunItemDataResponse) {
						if (
							(reqData.body.bodyType === "binary" &&
								reqData.body.binary?.fileName) ||
							reqData.auth.authType === "inherit"
						) {
							refs.waitForSend.current = true;
						} else {
							SendRequest(
								dispatch,
								false,
								colId,
								reqData,
								refs.selectedVariable.current,
								refs.parentSettings.current,
								refs.reqSettings.current,
							);
						}
					}
					break;
				}

				case responseTypes.readFileResponse: {
					dispatch(Actions.SetRequestBinaryDataAction(data.fileData));
					if (refs.waitForSend.current) {
						refs.waitForSend.current = false;
						SendRequest(
							dispatch,
							false,
							colId,
							refs.requestData.current,
							refs.selectedVariable.current,
							refs.parentSettings.current,
							refs.reqSettings.current,
						);
					}
					break;
				}

				case responseTypes.getAllVariableResponse: {
					dispatch(
						VariableActions.SetReqAllVariableAction(
							data.variable as IVariable[],
						),
					);
					break;
				}

				case responseTypes.getRunItemDataResponse: {
					const reqData = data.reqData as IRequestModel;
					dispatch(Actions.SetRequestAction(reqData));
					if (
						reqData.body.bodyType === "binary" &&
						reqData.body.binary?.fileName
					) {
						vscode.postMessage({
							type: requestTypes.readFileRequest,
							path: reqData.body.binary.fileName,
						});
					}
					dispatch(ResponseActions.SetResponseAction(data.resData.response));
					dispatch(
						ResponseActions.SetResponseHeadersAction(data.resData.headers),
					);
					dispatch(
						ResponseActions.SetResponseCookiesAction(data.resData.cookies),
					);
					cb.setLoadingApp(false);
					break;
				}

				case responseTypes.saveResponse: {
					cb.onSaved();
					break;
				}

				case responseTypes.getAllCookiesResponse: {
					dispatch(
						CookiesActions.SetAllCookiesAction(data.cookies as ICookie[]),
					);
					break;
				}

				case responseTypes.getParentSettingsResponse: {
					dispatch(
						Actions.SetReqParentSettingsAction(data.settings as ISettings),
					);
					if (refs.waitForSend.current) {
						refs.waitForSend.current = false;
						SendRequest(
							dispatch,
							false,
							colId,
							refs.requestData.current,
							refs.selectedVariable.current,
							data.settings as ISettings,
							refs.reqSettings.current,
						);
					}
					break;
				}

				case pubSubTypes.updateVariables: {
					if (data.data) {
						dispatch(
							VariableActions.SetReqVariableAction(data.data as IVariable),
						);
					} else {
						vscode.postMessage({ type: requestTypes.getAllVariableRequest });
					}
					break;
				}

				case pubSubTypes.removeCurrentVariable: {
					cb.onClearVarId();
					break;
				}

				case pubSubTypes.addCurrentVariable: {
					cb.onSetVarId(data.data.varId as string);
					break;
				}

				case pubSubTypes.themeChanged: {
					vscode.postMessage({ type: requestTypes.themeRequest });
					break;
				}

				case responseTypes.themeResponse: {
					dispatch(UIActions.SetThemeAction(data.theme as number));
					break;
				}

				case responseTypes.getAllCollectionNameResponse: {
					const col: ICollection[] =
						(data.collectionNames as { value: string; name: string }[])?.map(
							(item) => ({ id: item.value, name: item.name }),
						) ?? [];
					col.unshift({ id: "", name: "select" });
					dispatch(Actions.SetCollectionListAction(col));
					break;
				}

				case responseTypes.preFetchResponse: {
					dispatch(
						ResponseActions.SetPreFetchResponseAction(data.preFetchResponse),
					);
					break;
				}
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);
}
