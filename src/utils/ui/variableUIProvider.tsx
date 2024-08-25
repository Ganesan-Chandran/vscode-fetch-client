import * as vscode from 'vscode';
import { sideBarProvider } from '../../extension';
import { getNonce, requestTypes } from '../configuration';
import { GetCollectionsByVariable } from '../db/collectionDBUtil';
import { GetAllVariable, GetVariableById, SaveVariable, UpdateVariable } from '../db/varDBUtil';

export const VariableUI = (extensionUri: any) => {
	const disposable = vscode.commands.registerCommand('fetch-client.newVar', (id?: string) => {
		const varPanel = vscode.window.createWebviewPanel(
			"fetch-client",
			"Fetch Client - Variable",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		const scriptUri = varPanel.webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
		);

		const styleUri = varPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

		const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
		varPanel.iconPath = iconUri;

		const nonce = getNonce();
		const title = `newvar@:@${id}`;

		varPanel.webview.html = `<!DOCTYPE html>
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

		varPanel.webview.onDidReceiveMessage((reqData: any) => {
			if (reqData.type === requestTypes.getVariableItemRequest) {
				GetVariableById(reqData.data.id, reqData.data.isGlobal, varPanel.webview);
				GetCollectionsByVariable(reqData.data.id, varPanel.webview);
			} else if (reqData.type === requestTypes.updateVariableRequest) {
				UpdateVariable(reqData.data, varPanel.webview);
			} else if (reqData.type === requestTypes.saveVariableRequest) {
				SaveVariable(reqData.data, varPanel.webview, sideBarProvider.view);
			} else if (reqData.type === requestTypes.getAllVariableRequest) {
				GetAllVariable(varPanel.webview);
			}
		});
	});

	return disposable;

};
