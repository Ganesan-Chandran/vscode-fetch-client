import { apiFetch, FetchConfig } from "../../fetch-client-core/utils/fetchUtil";
import { buildWebviewHtml, saveToFile } from "./webviewUtils";
import { ExecuteAPIRequest } from "./helper";
import { formatDate } from "../../fetch-client-core/helpers/dateTime.helper";
import {
	GetAllCollectionName,
	GetAllCollectionsByIdWithPath,
	GetParentSettings,
	UpdateCollection,
} from "../db/collectionDBUtil";
import { GetAllCookies, SaveCookie } from "../db/cookieDBUtil";
import {
	GetAllVariable,
	GetVariableById,
	UpdateVariable,
} from "../db/varDBUtil";
import {
	getConfiguration,
	getHeadersConfiguration,
	getLayoutConfiguration,
	getRequestTabOption,
	getRunMainRequestOption,
	getTimeOutConfiguration,
	getVSCodeTheme,
} from "../../fetch-client-core/utils/vscodeConfig";
import { GetExitingItem, SaveRequest, UpdateRequest } from "../db/mainDBUtil";
import { GetExitingItemResponse } from "../db/responseDBUtil";
import {
	getStorageManager,
	OpenCookieUI,
	OpenVariableUI,
	pubSub,
	oauthAuthorizationService,
	sideBarProvider,
} from "../../extension";
import { IHistory } from "../../fetch-client-core/types/sidebar.types";
import {
	IPubSubMessage,
	Subscription,
} from "../../fetch-client-core/utils/pubSub";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import {
	pubSubTypes,
	requestTypes,
	responseTypes,
} from "../../fetch-client-core/consts/requestTypes.consts";
import { replaceValueWithVariable } from "../../fetch-client-core/helpers/variable.server.helper";
import { SaveHistory, UpdateHistory } from "../db/historyDBUtil";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";
import axios from "axios";
import fs from "fs";

export class WebAppPanel {
	public static currentPanel: WebAppPanel | undefined;
	private static readonly panels = new Map<string, WebAppPanel>();
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _currentId: string | undefined;

	private _subscriptionId: Subscription;

	public static createOrShow(
		extensionUri: vscode.Uri,
		id?: string,
		name?: string,
		colId?: string,
		varId?: string,
		type?: string,
		folderId?: string,
		newTab?: boolean,
	) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		let tabOption = getRequestTabOption();

		if (id && WebAppPanel.panels.has(id)) {
			const existing = WebAppPanel.panels.get(id);
			existing._panel.reveal(column);
			existing._panel.title = name ? name : "New Request";
			WebAppPanel.currentPanel = existing;
			return;
		}

		if (!tabOption && !newTab && WebAppPanel.currentPanel) {
			const prev = WebAppPanel.currentPanel;
			if (prev._currentId) {
				WebAppPanel.panels.delete(prev._currentId);
			}
			prev._currentId = id;
			if (id) {
				WebAppPanel.panels.set(id, prev);
			}
			prev._update(id, colId, varId, type, folderId);
			prev._panel.reveal(column);
			prev._panel.title = name ? name : "New Request";
			return;
		}
		const panel = vscode.window.createWebviewPanel(
			"fetch-client",
			name ? name : "New Request",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true },
		);

		const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
		panel.iconPath = iconUri;

		WebAppPanel.currentPanel = new WebAppPanel(
			panel,
			extensionUri,
			id,
			colId,
			varId,
			type,
			folderId,
		);
	}

	public static kill() {
		WebAppPanel.panels.forEach((p) => p._panel.dispose());
		WebAppPanel.panels.clear();
		WebAppPanel.currentPanel = undefined;
	}

	public static getCurrentWebView() {
		if (WebAppPanel.currentPanel) {
			return WebAppPanel.currentPanel._panel.webview;
		}

		return null;
	}

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		id?: string,
		colId?: string,
		varId?: string,
		type?: string,
		folderId?: string,
	) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._currentId = id;
		if (id) {
			WebAppPanel.panels.set(id, this);
		}

		this._update(id, colId, varId, type, folderId);

		this._pushMessages = this._pushMessages.bind(this);

		this._subscriptionId = pubSub.subscribe(this._pushMessages);

		this._panel.onDidDispose(
			() => {
				this._subscriptionId.unsubscribe();
				if (this._currentId) {
					WebAppPanel.panels.delete(this._currentId);
				}
				this.dispose(this._currentId, colId, folderId);
			},
			null,
			this._disposables,
		);

		this._panel.onDidChangeViewState(
			function (event) {
				if (event.webviewPanel.active) {
					sideBarProvider.view.webview.postMessage({
						type: requestTypes.selectItemRequest,
						colId: colId,
						folId: folderId,
						id: id,
						varId: ""
					});
				}
			},
			null,
			this._disposables,
		);

		let fetchConfig: FetchConfig = {
			timeOut: getTimeOutConfiguration(),
			headersCase: getHeadersConfiguration(),
			runMainRequest: getRunMainRequestOption(),
		};

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			async (message) => {
				try {
					if (message.type === requestTypes.apiRequest) {
						const CancelToken = axios.CancelToken;
						fetchConfig.source = CancelToken.source();

						await ExecuteAPIRequest(message, fetchConfig, this._panel.webview);

						let item: IHistory = {
							id: message.data.reqData.id,
							method: message.data.reqData.method,
							name: message.data.reqData.name
								? message.data.reqData.name
								: message.data.reqData.url,
							url: message.data.reqData.url,
							createdTime: message.data.reqData.createdTime
								? message.data.reqData.createdTime
								: formatDate(),
							modifiedTime: message.data.reqData.modifiedTime
								? message.data.reqData.modifiedTime
								: formatDate(),
						};

						if (message.data.colId) {
							UpdateCollection(message.data.colId, item);
						}

						sideBarProvider.view.webview.postMessage({
							type: responseTypes.updateCollectionHistoryItem,
							colId: message.data.colId,
							item: item,
						});
					} else if (message.type === requestTypes.cancelRequest) {
						if (fetchConfig.source) {
							fetchConfig.source.cancel(
								"The request has been cancelled by the user.",
							);
						}
					} else if (message.type === requestTypes.layoutConfigRequest) {
						this._panel.webview.postMessage(getLayoutConfiguration());
					} else if (message.type === requestTypes.configRequest) {
						this._panel.webview.postMessage(getConfiguration());
					} else if (message.type === requestTypes.openExistingItemRequest) {
						GetExitingItem(this._panel.webview, message.data);
						GetExitingItemResponse(this._panel.webview, message.data);
					} else if (
						message.type === requestTypes.getOpenAndRunItemDataRequest
					) {
						GetExitingItem(
							this._panel.webview,
							message.data,
							null,
							"OpenAndRun",
						);
					} else if (message.type === requestTypes.saveResponseRequest) {
						await saveToFile(
							vscode.Uri.file(`fetch-client-response.${message.fileType}`),
							message.data,
							"saveResponseRequest",
						);
					} else if (message.type === requestTypes.saveTestResponseRequest) {
						await saveToFile(
							vscode.Uri.file("fetch-client-tests.json"),
							message.data,
							"saveTestResponseRequest",
						);
					} else if (message.type === requestTypes.downloadFileTypeRequest) {
						await saveToFile(
							vscode.Uri.file(`fetch-client-file.${message.fileType}`),
							new Uint8Array(message.resData.data),
							"downloadFileTypeRequest",
						);
					} else if (message.type === requestTypes.selectFileRequest) {
						const uris = await vscode.window.showOpenDialog();
						if (uris && uris.length > 0) {
							const value = uris[0].fsPath;
							const data = await fs.promises.readFile(value, "utf8");
							this._panel.webview.postMessage({
								type: responseTypes.selectFileResponse,
								path: value,
								fileData: data,
							});
						}
					} else if (message.type === requestTypes.readFileRequest) {
						try {
							const data = await fs.promises.readFile(message.path, "utf8");
							this._panel.webview.postMessage({
								type: responseTypes.readFileResponse,
								fileData: data,
							});
						} catch {
							this._panel.webview.postMessage({
								type: responseTypes.readFileResponse,
								fileData: "",
							});
						}
					} else if (message.type === requestTypes.getVariableItemRequest) {
						GetVariableById(
							message.data.id,
							message.data.isGlobal,
							this._panel.webview,
						);
					} else if (message.type === requestTypes.getAllVariableRequest) {
						GetAllVariable(this._panel.webview);
					} else if (message.type === requestTypes.getRunItemDataRequest) {
						this._panel.webview.postMessage({
							type: responseTypes.getRunItemDataResponse,
							reqData: getStorageManager().getValue("run-request"),
							resData: getStorageManager().getValue("run-response"),
						});
						getStorageManager().setValue("run-request", "");
						getStorageManager().setValue("run-response", "");
					} else if (message.type === requestTypes.saveRequest) {
						let item: IHistory = {
							id: message.data.reqData.id,
							method: message.data.reqData.method,
							name: message.data.reqData.name
								? message.data.reqData.name
								: message.data.reqData.url,
							url: message.data.reqData.url,
							createdTime: message.data.reqData.createdTime
								? message.data.reqData.createdTime
								: formatDate(),
							modifiedTime: message.data.reqData.modifiedTime
								? message.data.reqData.modifiedTime
								: formatDate(),
						};

						let reqData = message.data.reqData as IRequestModel;
						if (reqData.body.bodyType === "binary") {
							reqData.body.binary.data = "";
						}
						if (message.data.isNew) {
							SaveRequest(reqData);
							SaveHistory(item, sideBarProvider.view);
						} else {
							UpdateRequest(reqData);
							UpdateHistory(item);
							if (message.data.colId) {
								UpdateCollection(message.data.colId, item);
							}
						}
						this._panel.webview.postMessage({
							type: responseTypes.saveResponse,
						});
						sideBarProvider.view.webview.postMessage({
							type: responseTypes.updateCollectionHistoryItem,
							colId: message.data.colId,
							item: item,
						});
					} else if (message.type === requestTypes.openVariableItemRequest) {
						OpenVariableUI(message.data);
					} else if (message.type === requestTypes.updateVariableRequest) {
						UpdateVariable(message.data, null);
					} else if (message.type === requestTypes.saveCookieRequest) {
						SaveCookie(message.data, null);
					} else if (message.type === requestTypes.getAllCookiesRequest) {
						GetAllCookies(this._panel.webview);
					} else if (message.type === requestTypes.openManageCookiesRequest) {
						OpenCookieUI(message.data);
					} else if (message.type === requestTypes.getParentSettingsRequest) {
						GetParentSettings(
							message.data.colId,
							message.data.folderId,
							this._panel.webview,
						);
					} else if (message.type === requestTypes.formDataFileRequest) {
						vscode.window
							.showOpenDialog()
							.then((uri: vscode.Uri[] | undefined) => {
								if (uri && uri.length > 0) {
									const value = uri[0].fsPath;
									this._panel.webview.postMessage({
										type: responseTypes.formDataFileResponse,
										path: value,
										index: message.index,
									});
								}
							});
					} else if (message.type === requestTypes.tokenRequest) {
						apiFetch(
							message.data.reqData,
							message.data.variableData,
							message.data.settings,
							null,
							fetchConfig,
							responseTypes.tokenResponse,
						).then((data) => {
							this._panel.webview.postMessage(data);
						});
					} else if (message.type === requestTypes.oauthAuthorizationRequest) {
						oauthAuthorizationService.start(this._panel.webview, message.data);
					} else if (message.type === requestTypes.themeRequest) {
						this._panel.webview.postMessage(getVSCodeTheme());
					} else if (message.type === requestTypes.getCollectionsByIdWithPathRequest) {
						GetAllCollectionsByIdWithPath(message.data, this._panel.webview);
					} else if (message.type === requestTypes.getAllCollectionNameRequest) {
						GetAllCollectionName(this._panel.webview, message.data);
					} else if (message.type === requestTypes.resolveVariableRequest) {
						const { request, varData, requestId } = message;
						const replaced = await replaceValueWithVariable(request, varData);
						this._panel.webview.postMessage({
							type: responseTypes.resolveVariableResponse,
							requestId,
							request: replaced,
						});
					}
				} catch (error) {
					writeLog("error::mainUIProvider::onDidReceiveMessage()" + error);
				}
			},
			null,
			this._disposables,
		);
	}

	public dispose(id?: string, colId?: string, folderId?: string) {
		sideBarProvider.view.webview.postMessage({
			type: requestTypes.closeItemRequest,
			id: id,
			colId: colId,
			folderId: folderId,
			varId: ""
		});

		if (WebAppPanel.currentPanel === this) {
			WebAppPanel.currentPanel = undefined;
		}

		// Clean up our resources
		this._panel.dispose();
		this._disposables.forEach((d) => d.dispose());
		this._disposables = [];
	}

	private _update(
		id?: string,
		colId?: string,
		varId?: string,
		type?: string,
		folderId?: string,
	): void {
		this._panel.webview.html = this._getHtmlForWebview(
			this._panel.webview,
			id,
			colId,
			varId,
			type,
			folderId,
		);
	}

	private _pushMessages(message: IPubSubMessage) {
		if (message.messageType === pubSubTypes.updateVariables) {
			this._panel.webview.postMessage({
				type: message.messageType,
				data: message.data,
			});
		} else if (message.messageType === pubSubTypes.removeCurrentVariable) {
			this._panel.webview.postMessage({ type: message.messageType });
		} else if (message.messageType === pubSubTypes.addCurrentVariable) {
			this._panel.webview.postMessage({
				type: message.messageType,
				data: { varId: message.message },
			});
		} else if (message.messageType === pubSubTypes.themeChanged) {
			this._panel.webview.postMessage({ type: message.messageType });
		}
	}

	private _getHtmlForWebview(
		webview: vscode.Webview,
		id?: string,
		colId?: string,
		varId?: string,
		type?: string,
		folderId?: string,
	): string {
		return buildWebviewHtml(
			webview,
			this._extensionUri,
			`${id}@:@${colId}@:@${varId}@:@${type}@:@${folderId}`,
		);
	}
}
