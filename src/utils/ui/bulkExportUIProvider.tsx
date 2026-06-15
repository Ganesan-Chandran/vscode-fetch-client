import * as vscode from 'vscode';
import { requestTypes, responseTypes } from '../configuration';
import { GetAllCollectionName } from '../db/collectionDBUtil';
import { BulkExport } from '../db/mainDBUtil';
import { BulkExportVariables, GetAllVariable } from '../db/varDBUtil';
import { buildWebviewHtml } from './webviewUtils';

export const BulkExportProviderUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand('fetch-client.bulkExport', (type: string) => {
		const bulkExportPanel = vscode.window.createWebviewPanel(
			"fetch-client",
			"Fetch Client - Bulk Export",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
		bulkExportPanel.iconPath = iconUri;

		bulkExportPanel.webview.html = buildWebviewHtml(bulkExportPanel.webview, extensionUri, `bulkexport@:@${type}`);

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
