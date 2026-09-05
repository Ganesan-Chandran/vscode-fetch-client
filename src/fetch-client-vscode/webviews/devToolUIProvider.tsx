import { buildWebviewHtml } from "./webviewUtils";
import * as vscode from "vscode";

export const DevToolsUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.devTools",
		() => {
			const errorLogPanel = vscode.window.createWebviewPanel(
				"fetch-client",
				"Fetch Client - Dev Tools",
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true },
			);

			const iconUri = vscode.Uri.joinPath(
				extensionUri,
				"icons/fetch-client.png",
			);
			errorLogPanel.iconPath = iconUri;

			errorLogPanel.webview.html = buildWebviewHtml(
				errorLogPanel.webview,
				extensionUri,
				"devtools",
			);
		},
	);

	return disposable;
};
