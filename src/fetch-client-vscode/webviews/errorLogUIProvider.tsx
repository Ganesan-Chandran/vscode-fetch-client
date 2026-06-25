import { buildWebviewHtml } from './webviewUtils';
import { getExtDbPath } from '../../fetch-client-core/db/dbHelper';
import { logPath } from '../../fetch-client-core/helpers/logger/constants';
import { requestTypes, responseTypes } from '../../fetch-client-core/consts/requestTypes.consts';
import * as vscode from 'vscode';
import fs from "fs";
import path from 'path';

export const ErrorLogUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand('fetch-client.openErrorLog', () => {
		const errorLogPanel = vscode.window.createWebviewPanel(
			"fetch-client",
			"Fetch Client - Error Log",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
		errorLogPanel.iconPath = iconUri;

		errorLogPanel.webview.html = buildWebviewHtml(errorLogPanel.webview, extensionUri, 'errorlog');

		errorLogPanel.webview.onDidReceiveMessage(async (reqData: any) => {
			if (reqData.type === requestTypes.getErrorLogRequest) {
				let data = '';
				try {
					data = await fs.promises.readFile(path.resolve(getExtDbPath(), logPath), 'utf8');
				} catch {
					data = '';
				}
				errorLogPanel.webview.postMessage({ type: responseTypes.getErrorLogResponse, fileData: data });
			}
		});
	});

	return disposable;

};
