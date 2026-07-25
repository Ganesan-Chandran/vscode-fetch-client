import { buildWebviewHtml } from "./webviewUtils";
import {
	DeleteAutoRequestHistory,
	GetAutoRequestByColId,
	GetAutoRequestHistory,
	SaveAutoRequest,
} from "../db/autoRequestDBUtil";
import {
	GetAllCollectionName,
	GetAllCollectionsByIdWithPath,
} from "../db/collectionDBUtil";
import { requestTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import * as vscode from "vscode";
import { SESSION_ID } from "../../fetch-client-core/utils/vscodeConfig";

export const AutoRequestProviderUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.autoRequest",
		(colId: string = "", name: string = "") => {
			const autoRequestPanel = vscode.window.createWebviewPanel(
				"fetch-client",
				colId
					? `Fetch Client - Scheduled Runs (${name})`
					: "Fetch Client - Scheduled Runs",
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true },
			);

			const iconUri = vscode.Uri.joinPath(
				extensionUri,
				"icons/fetch-client.png",
			);
			autoRequestPanel.iconPath = iconUri;

			autoRequestPanel.webview.html = buildWebviewHtml(
				autoRequestPanel.webview,
				extensionUri,
				"autorequest",
			);

			autoRequestPanel.webview.onDidReceiveMessage((message: any) => {
				if (message.type === requestTypes.getAutoRequestByColIdRequest) {
					GetAutoRequestByColId(colId, name, autoRequestPanel.webview);
				} else if (message.type === requestTypes.getAllCollectionNameRequest) {
					GetAllCollectionName(autoRequestPanel.webview, message.data);
				} else if (
					message.type === requestTypes.getCollectionsByIdWithPathRequest
				) {
					GetAllCollectionsByIdWithPath(message.data, autoRequestPanel.webview);
				} else if (message.type === requestTypes.getAutoRequestHistoryRequest) {
					GetAutoRequestHistory(colId, autoRequestPanel.webview);
				} else if (
					message.type === requestTypes.deleteAutoRequestHistoryRequest
				) {
					DeleteAutoRequestHistory(message.data, colId, autoRequestPanel.webview);
				} else if (message.type === requestTypes.saveAutoRequestRequest) {
					SaveAutoRequest(message.data, SESSION_ID, autoRequestPanel.webview);
				}
			});
		},
	);

	return disposable;
};
