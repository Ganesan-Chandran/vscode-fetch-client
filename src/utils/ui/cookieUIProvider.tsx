import * as vscode from 'vscode';
import { requestTypes } from '../configuration';
import { DeleteAllCookies, DeleteCookieById, GetAllCookies } from '../db/cookieDBUtil';
import { ShowInformationDialog } from './helper';
import { buildWebviewHtml } from './webviewUtils';

export const CookieUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand('fetch-client.manageCookies', (id?: string) => {
		const cookiePanel = vscode.window.createWebviewPanel(
			"fetch-client",
			"Fetch Client - Manage Cookies",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true }
		);

		const iconUri = vscode.Uri.joinPath(extensionUri, "icons/fetch-client.png");
		cookiePanel.iconPath = iconUri;

		cookiePanel.webview.html = buildWebviewHtml(cookiePanel.webview, extensionUri, `managecookies@:@${id}`);

		cookiePanel.webview.onDidReceiveMessage((reqData: any) => {
			if (reqData.type === requestTypes.getAllCookiesRequest) {
				GetAllCookies(cookiePanel.webview);
			} else if (reqData.type === requestTypes.deleteCookieByIdRequest) {
				showConfirmationBox("Do you want to delete this cookie?").then((data: any) => {
					if (data === "Yes") {
						DeleteCookieById(reqData.data, cookiePanel.webview);
					}
				});
			} else if (reqData.type === requestTypes.deleteAllCookieRequest) {
				showConfirmationBox("Do you want to delete all cookies?").then((data: any) => {
					if (data === "Yes") {
						DeleteAllCookies(cookiePanel.webview);
					}
				});
			} else if (reqData.type === requestTypes.showMessageRequest) {
				ShowInformationDialog(reqData.data);
			}
		});
	});

	return disposable;

};

async function showConfirmationBox(text: string) {
	const res = await vscode.window.showWarningMessage(text, { modal: true }, "Yes", "No");
	return res;
}
