import { buildWebviewHtml } from "./webviewUtils";
import { GetAllAutoRequest, SaveAutoRequest } from "../db/autoRequestDBUtil";
import {
	GetAllCollectionName,
	GetAllCollectionsByIdWithPath,
} from "../db/collectionDBUtil";
import { requestTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import * as vscode from "vscode";

export const AutoRequestProviderUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.autoRequest",
		() => {
			const autoRequestPanel = vscode.window.createWebviewPanel(
				"fetch-client",
				"Fetch Client - Auto Request",
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
				if (message.type === requestTypes.getAllCollectionNameRequest) {
					GetAllCollectionName(autoRequestPanel.webview, message.data);
				} else if (
					message.type === requestTypes.getCollectionsByIdWithPathRequest
				) {
					GetAllCollectionsByIdWithPath(message.data, autoRequestPanel.webview);
				} else if (message.type === requestTypes.getAllAutoRequest) {
					GetAllAutoRequest(autoRequestPanel.webview);
				} else if (message.type === requestTypes.saveAutoRequestRequest) {
					SaveAutoRequest(message.data);
				}
			});
		},
	);

	return disposable;
};
