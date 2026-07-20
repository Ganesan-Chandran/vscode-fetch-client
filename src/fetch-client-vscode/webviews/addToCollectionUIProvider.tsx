import {
	AddToCollection,
	AttachVariable,
	CopyToCollection,
	ExecuteMultipleRequest,
	GetAllCollectionName,
	GetAllCollectionsById,
	GetAllCollectionsByIdWithPath,
	GetCollectionById,
	GetCollectionSettings,
	GetParentSettings,
	SaveCollectionSettings,
	UpdateCollectionItems,
} from "../db/collectionDBUtil";
import { apiFetch, FetchConfig } from "../../fetch-client-core/utils/fetchUtil";
import { buildWebviewHtml, saveToFile } from "./webviewUtils";
import { ExecuteAPIRequest, ShowInformationDialog } from "./helper";
import {
	GetAllVariable,
	GetVariableById,
	UpdateVariable,
} from "../db/varDBUtil";
import {
	getHeadersConfiguration,
	getTimeOutConfiguration,
	getVariableEncryptionKey,
} from "../../fetch-client-core/utils/vscodeConfig";
import { GetHistoryById } from "../db/historyDBUtil";
import {
	getStorageManager,
	OpenExistingItem,
	sideBarProvider,
} from "../../extension";
import {
	requestTypes,
	responseTypes,
} from "../../fetch-client-core/consts/requestTypes.consts";
import {
	Col_Repository_GetAllCollectionsById,
	Col_Repository_GetCollectionById,
} from "../../fetch-client-core/db/collectionDB.repository";
import { getVariableEncryptionConfiguration } from "../../fetch-client-core/utils/commonConfig";
import { IDataDrivenConfig } from "../../fetch-client-core/utils/dataDrivenTestService/dataDriven.types";
import { IRequestModel } from "../../fetch-client-core/types/request.types";
import { resolveParentSettings } from "../../fetch-client-core/helpers/settings.helper";
import { runDataDrivenTest, IDataDrivenCancelRef } from "../../fetch-client-core/utils/dataDrivenTestService/dataDrivenRunner";
import { Var_Repository_FindByIdSync } from "../../fetch-client-core/db/variableDB.repository";
import * as fs from "fs";
import * as vscode from "vscode";
import axios from "axios";

// Per-panel cancel ref for data-driven test runs
const dataDrivenCancelRefs = new WeakMap<vscode.WebviewPanel, IDataDrivenCancelRef>();

export const AddToColUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.addToCol",
		(
			colId: string,
			folderId: string,
			name: string,
			type: string,
			varId?: string,
		) => {
			const colPanel = vscode.window.createWebviewPanel(
				"fetch-client",
				name ? name : "Fetch Client - Collection",
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true },
			);

			const iconUri = vscode.Uri.joinPath(
				extensionUri,
				"icons/fetch-client.png",
			);
			colPanel.iconPath = iconUri;

			const title = `${type}@:@${colId}@:@${folderId}@:@${name}@:@${varId}`;

			colPanel.webview.html = buildWebviewHtml(
				colPanel.webview,
				extensionUri,
				title,
			);

			let fetchConfig: FetchConfig = {
				timeOut: getTimeOutConfiguration(),
				headersCase: getHeadersConfiguration(),
				source: null,
			};

			colPanel.webview.onDidReceiveMessage(async (message: any) => {
				if (message.type === requestTypes.getAllCollectionNameRequest) {
					GetAllCollectionName(colPanel.webview, message.data);
				} else if (message.type === requestTypes.getHistoryItemRequest) {
					GetHistoryById(message.data, colPanel.webview);
				} else if (message.type === requestTypes.addToCollectionsRequest) {
					AddToCollection(
						message.data.col,
						message.data.hasFolder,
						message.data.isNewFolder,
						colPanel.webview,
						sideBarProvider.view,
					);
				} else if (message.type === requestTypes.copyToCollectionsRequest) {
					CopyToCollection(
						message.data.sourceId,
						message.data.distId,
						message.data.name,
						colPanel.webview,
						sideBarProvider.view,
					);
				} else if (message.type === requestTypes.getAllVariableRequest) {
					GetAllVariable(colPanel.webview);
				} else if (message.type === requestTypes.attachVariableRequest) {
					AttachVariable(
						message.data.colId,
						message.data.varId,
						colPanel.webview,
						sideBarProvider.view,
					);
				} else if (message.type === requestTypes.getCollectionsByIdRequest) {
					GetAllCollectionsById(
						message.data.colId,
						message.data.folderId,
						message.data.type,
						colPanel.webview,
					);
				} else if (
					message.type === requestTypes.getCollectionDetailsByIdRequest
				) {
					GetCollectionById(
						message.data.colId,
						message.data.folderId,
						colPanel.webview,
					);
				} else if (message.type === requestTypes.reorderCollectionRequest) {
					UpdateCollectionItems(
						message.data.colId,
						message.data.folderId,
						message.data.items,
					);
				} else if (message.type === requestTypes.apiRequest) {
					const CancelToken = axios.CancelToken;
					fetchConfig.source = CancelToken.source();
					await ExecuteAPIRequest(message, fetchConfig, colPanel.webview);
				} else if (message.type === requestTypes.multipleApiRequest) {
					ExecuteMultipleRequest(message, fetchConfig, colPanel.webview);
				} else if (message.type === requestTypes.openRunRequest) {
					getStorageManager().setValue("run-request", message.data.reqData);
					getStorageManager().setValue("run-response", message.data.resData);
					OpenExistingItem(
						message.data.reqData.id,
						message.data.reqData.name,
						message.data.colId,
						message.data.folderId,
						message.data.varId,
						"runopen",
					);
				} else if (message.type === requestTypes.exportRunTestJsonRequest) {
					await saveToFile(
						vscode.Uri.file(
							`fetch-client-collection-report-${message.name?.replace(/[/\\?%*:|"<>]/g, "-")}.json`,
						),
						JSON.stringify(message.data, null, "\t"),
						"exportRunTestJsonRequest",
						{ filters: { "Json Files": ["json"] } },
					);
				} else if (message.type === requestTypes.exportRunTestCSVRequest) {
					await saveToFile(
						vscode.Uri.file(
							`fetch-client-collection-report-${message.name?.replace(/[/\\?%*:|"<>]/g, "-")}.csv`,
						),
						message.data.toString(),
						"exportRunTestCSVRequest",
						{ filters: { CSV: ["csv"] } },
					);
				} else if (message.type === requestTypes.exportData) {
					const format = (message.format?.toString() ?? "").toUpperCase();
					if (format === "") {
						return;
					}
					let fileExt: string;
					if (format === "HTML") {
						fileExt = "html";
					} else if (format === "XML") {
						fileExt = "xml";
					}
					await saveToFile(
						vscode.Uri.file(
							`fetch-client-collection-report-${message.name?.replace(/[/\\?%*:|"<>]/g, "-")}.${fileExt}`,
						),
						message.data.toString(),
						"requestTypes.exportData",
						{ filters: { format: [`${fileExt}`] } },
					);
				} else if (message.type === requestTypes.saveColSettingsRequest) {
					SaveCollectionSettings(
						colPanel.webview,
						message.data.colId,
						message.data.folderId,
						message.data.settings,
					);
				} else if (message.type === requestTypes.getColSettingsRequest) {
					GetCollectionSettings(
						colPanel.webview,
						message.data.colId,
						message.data.folderId,
					);
				} else if (message.type === requestTypes.updateVariableRequest) {
					UpdateVariable(message.data, null);
				} else if (message.type === requestTypes.getVariableItemRequest) {
					GetVariableById(
						message.data.id,
						message.data.isGlobal,
						colPanel.webview,
					);
				} else if (message.type === requestTypes.tokenRequest) {
					apiFetch(
						message.data.reqData,
						message.data.variableData,
						message.data.settings,
						null,
						fetchConfig,
						responseTypes.tokenResponse,
					).then((data) => {
						colPanel.webview.postMessage(data);
					});
				} else if (
					message.type === requestTypes.getCollectionsByIdWithPathRequest
				) {
					GetAllCollectionsByIdWithPath(message.data, colPanel.webview);
				} else if (message.type === requestTypes.getParentSettingsRequest) {
					GetParentSettings(
						message.data.colId,
						message.data.folderId,
						colPanel.webview,
					);
				} else if (message.type === requestTypes.showMessageRequest) {
					ShowInformationDialog(message.data);
				} else if (message.type === requestTypes.selectFileRequest) {
					const uris = await vscode.window.showOpenDialog({
						filters: { "Data Files": ["csv", "json"], "All Files": ["*"] },
						canSelectMany: false,
					});
					if (uris && uris.length > 0) {
						const filePath = uris[0].fsPath;
						try {
							const fileData = await fs.promises.readFile(filePath, "utf8");
							colPanel.webview.postMessage({
								type: responseTypes.selectFileResponse,
								path: filePath,
								fileData,
							});
						} catch (readErr) {
							// FIX #6: surface file read errors to the UI
							colPanel.webview.postMessage({
								type: responseTypes.selectFileResponse,
								path: "",
								fileData: "",
								error: `Failed to read file: ${(readErr as Error).message}`,
							});
						}
					}
					// If dialog dismissed (no uris), send nothing - UI treats missing response as cancel
				} else if (message.type === requestTypes.runDataDrivenRunRequest) {
					// Cancel any existing run on this panel
					const existing = dataDrivenCancelRefs.get(colPanel);
					if (existing) {
						existing.cancelled = true;
					}

					const cancelRef: IDataDrivenCancelRef = { cancelled: false };
					dataDrivenCancelRefs.set(colPanel, cancelRef);

					const {
						colId: ddColId,
						folderId: ddFolderId,
						varId: ddVarId,
						selectedRequestIds,
						dataRows,
						config,
						testName,
					} = message.data as {
						colId: string;
						folderId: string;
						varId: string;
						selectedRequestIds: string[];
						dataRows: Record<string, string>[];
						config: IDataDrivenConfig;
						testName: string;
					};

					try {
						const encKey = getVariableEncryptionConfiguration()
							? getVariableEncryptionKey()
							: null;

						// Load full collection (needed for parent-settings resolution and CliPreFetchContextProvider)
						const collection = await Col_Repository_GetCollectionById(ddColId, "");

						// Load ALL requests in the collection for pre-fetch lookup
						const { requests: allColReqs } =
							await Col_Repository_GetAllCollectionsById(ddColId, "", "col");
						const requestMap = new Map<string, IRequestModel>(
							allColReqs.map((r: IRequestModel) => [r.id, r]),
						);

						// Load requests scoped to this collection/folder for the ordered selected list
						const isFolderScope = !!ddFolderId;
						const { requests: scopedReqs } =
							await Col_Repository_GetAllCollectionsById(
								ddColId,
								ddFolderId,
								isFolderScope ? "fol" : "col",
							);

						const selectedRequests = selectedRequestIds
							.map((id) => scopedReqs.find((r: IRequestModel) => r.id === id))
							.filter((r): r is IRequestModel => !!r);

						// Load variable (may be undefined if no variable attached)
						const variable = ddVarId
							? await Var_Repository_FindByIdSync(ddVarId, encKey)
							: null;

						// Resolve parent settings for the scope
						const parentSettings = resolveParentSettings(
							collection,
							ddFolderId ?? "",
						);

						const ddFetchConfig: FetchConfig = {
							timeOut: getTimeOutConfiguration(),
							headersCase: getHeadersConfiguration(),
						};

						const finalResult = await runDataDrivenTest(
							selectedRequests,
							collection,
							requestMap,
							dataRows,
							variable ?? undefined,
							parentSettings,
							config,
							ddFetchConfig,
							cancelRef,
							(rowResult) => {
								if (!colPanel.webview) {
									return;
								}
								colPanel.webview.postMessage({
									type: responseTypes.dataDrivenRowResultResponse,
									data: rowResult,
								});
							},
						);

						if (!cancelRef.cancelled) {
							colPanel.webview.postMessage({
								type: responseTypes.dataDrivenCompleteResponse,
								data: { ...finalResult, testName },
							});
						}
					} catch (err) {
						colPanel.webview.postMessage({
							type: responseTypes.dataDrivenCompleteResponse,
							data: null,
							error: (err as Error).message,
						});
					}
				} else if (message.type === requestTypes.runDataDrivenCancelRequest) {
					const cancelRef = dataDrivenCancelRefs.get(colPanel);
					if (cancelRef) {
						cancelRef.cancelled = true;
					}
				}
			});
		},
	);

	return disposable;
};
