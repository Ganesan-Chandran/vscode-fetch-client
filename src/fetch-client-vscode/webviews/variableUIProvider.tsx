import { buildWebviewHtml } from "./webviewUtils";
import {
	GetAllVariable,
	GetVariableById,
	SaveVariable,
	UpdateVariable,
} from "../db/varDBUtil";
import { GetCollectionsByVariable } from "../db/collectionDBUtil";
import { requestTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { sideBarProvider } from "../../extension";
import * as vscode from "vscode";

export const VariableUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.newVar",
		(id?: string) => {
			const varPanel = vscode.window.createWebviewPanel(
				"fetch-client",
				"Fetch Client - Variable",
				vscode.ViewColumn.One,
				{ enableScripts: true, retainContextWhenHidden: true },
			);

			const iconUri = vscode.Uri.joinPath(
				extensionUri,
				"icons/fetch-client.png",
			);
			varPanel.iconPath = iconUri;

			varPanel.webview.html = buildWebviewHtml(
				varPanel.webview,
				extensionUri,
				`newvar@:@${id}`,
			);

			varPanel.webview.onDidReceiveMessage((reqData: any) => {
				if (reqData.type === requestTypes.getVariableItemRequest) {
					GetVariableById(
						reqData.data.id,
						reqData.data.isGlobal,
						varPanel.webview,
					);
					GetCollectionsByVariable(reqData.data.id, varPanel.webview);
				} else if (reqData.type === requestTypes.updateVariableRequest) {
					UpdateVariable(reqData.data, varPanel.webview);
				} else if (reqData.type === requestTypes.saveVariableRequest) {
					SaveVariable(reqData.data, varPanel.webview, sideBarProvider.view);
				} else if (reqData.type === requestTypes.getAllVariableRequest) {
					GetAllVariable(varPanel.webview);
				}
			});
		},
	);

	return disposable;
};
