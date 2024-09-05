import * as vscode from 'vscode';
import { getNonce, requestTypes } from '../configuration';
import { GetAllCollectionName, GetAllCollectionsByIdWithPath } from '../db/collectionDBUtil';
import { GetAllAutoRequest, SaveAutoRequest } from '../db/autoRequestDBUtil';

export const AutoRequestProviderUI = (extensionUri: any) => {
	const disposable = vscode.commands.registerCommand('fetch-client.autoRequest', () => {
		const autoRequestPanel = vscode.window.createWebviewPanel(
			"fetch-client",
			"Fetch Client - Auto Request",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		const scriptUri = autoRequestPanel.webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
		);

		const styleUri = autoRequestPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

		const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
		autoRequestPanel.iconPath = iconUri;

		const nonce = getNonce();
		const title = `autorequest`;

		autoRequestPanel.webview.html = `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link href="${styleUri}" rel="stylesheet" type="text/css"/>
				<title>${title}</title>
			</head>
			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
		</html>`;

		autoRequestPanel.webview.onDidReceiveMessage((message: any) => {
			if (message.type === requestTypes.getAllCollectionNameRequest) {
				GetAllCollectionName(autoRequestPanel.webview, message.data);
			} else if (message.type === requestTypes.getCollectionsByIdWithPathRequest) {
				GetAllCollectionsByIdWithPath(message.data, autoRequestPanel.webview);
			} else if (message.type === requestTypes.getAllAutoRequest) {
				GetAllAutoRequest(autoRequestPanel.webview);
			} else if (message.type === requestTypes.saveAutoRequestRequest) {
				SaveAutoRequest(message.data);
			}
		});
	});

	return disposable;

};
