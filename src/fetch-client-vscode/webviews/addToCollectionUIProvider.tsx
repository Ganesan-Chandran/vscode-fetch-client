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
import * as vscode from "vscode";
import axios from "axios";

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
						JSON.stringify(message.data),
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
				}
			});
		},
	);

	return disposable;
};
