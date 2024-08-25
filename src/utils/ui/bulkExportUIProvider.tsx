import * as vscode from 'vscode';
import { getNonce, requestTypes, responseTypes } from '../configuration';
import { GetAllCollectionName } from '../db/collectionDBUtil';
import { BulkExport } from '../db/mainDBUtil';
import { BulkExportVariables, GetAllVariable } from '../db/varDBUtil';

export const BulkExportProviderUI = (extensionUri: any) => {
	const disposable = vscode.commands.registerCommand('fetch-client.bulkExport', (type: string) => {
		const bulkExportPanel = vscode.window.createWebviewPanel(
			"fetch-client",
			"Fetch Client - Bulk Export",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		const scriptUri = bulkExportPanel.webview.asWebviewUri(
			vscode.Uri.joinPath(extensionUri, "dist/fetch-client-ui.js")
		);

		const styleUri = bulkExportPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "/dist/main.css"));

		const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
		bulkExportPanel.iconPath = iconUri;

		const nonce = getNonce();
		const title = `bulkexport@:@${type}`;

		bulkExportPanel.webview.html = `<!DOCTYPE html>
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

		bulkExportPanel.webview.onDidReceiveMessage((message: any) => {
			if (message.type === requestTypes.getAllCollectionNameRequest) {
				GetAllCollectionName(bulkExportPanel.webview, message.data);
			} else if (message.type === requestTypes.selectPathRequest) {
				vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, canSelectMany: false, openLabel: 'Select', }).then(fileUri => {
					if (fileUri && fileUri[0]) {
						bulkExportPanel.webview.postMessage({ type: responseTypes.selectPathResponse, path: fileUri[0].fsPath });
					}
				});
			} else if (message.type === requestTypes.bulkColExportRequest) {
				if(message.data.type === "col"){
					BulkExport(message.data.path, message.data?.cols, bulkExportPanel.webview);
				} else {
					BulkExportVariables(message.data.path, message.data?.cols, bulkExportPanel.webview);
				}
			} else if (message.type === requestTypes.getAllVariableRequest) {
				GetAllVariable(bulkExportPanel.webview);
			}
		});
	});

	return disposable;

};
