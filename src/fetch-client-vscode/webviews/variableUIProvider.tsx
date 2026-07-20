import { buildWebviewHtml } from "./webviewUtils";
import {
	GetAllVariable,
	GetVariableById,
	SaveVariable,
	UpdateVariable,
} from "../db/varDBUtil";
import { GetCollectionsByVariable } from "../db/collectionDBUtil";
import { requestTypes, responseTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { sideBarProvider } from "../../extension";
import * as vscode from "vscode";
import { clearAwsSecretCache, handleAwsCheckConnectivity, handleAwsFetchAndCache } from "../../fetch-client-core/utils/secretMangerService/awsConnectivityService";

export class VariablePanel {
	public static currentPanel: VariablePanel | undefined;
	private static readonly panels = new Map<string, VariablePanel>();
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];
	private _currentId: string | undefined;

	public static createOrShow(extensionUri: vscode.Uri, type: string, id?: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		const panelKey = id ?? "__new__" + type;

		if (VariablePanel.panels.has(panelKey)) {
			const existing = VariablePanel.panels.get(panelKey);
			existing._panel.reveal(column);
			VariablePanel.currentPanel = existing;
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			"fetch-client",
			"Fetch Client - Variable",
			vscode.ViewColumn.One,
			{ enableScripts: true, retainContextWhenHidden: true },
		);

		const iconUri = vscode.Uri.joinPath(
			extensionUri,
			"icons/fetch-client.png",
		);
		panel.iconPath = iconUri;

		VariablePanel.currentPanel = new VariablePanel(panel, extensionUri, type, id);
	}

	public static kill() {
		VariablePanel.panels.forEach((p) => p._panel.dispose());
		VariablePanel.panels.clear();
		VariablePanel.currentPanel = undefined;
	}

	private constructor(
		panel: vscode.WebviewPanel,
		extensionUri: vscode.Uri,
		type: string,
		id?: string,
	) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._currentId = id;

		const panelKey = id ?? "__new__" + type;
		VariablePanel.panels.set(panelKey, this);

		this._panel.webview.html = buildWebviewHtml(
			this._panel.webview,
			this._extensionUri,
			`${type}@:@${id}`,
		);

		this._panel.onDidDispose(
			() => {
				const key = this._currentId ?? "__new__" + type;
				VariablePanel.panels.delete(key);
				this.dispose(this._currentId);
			},
			null,
			this._disposables,
		);

		this._panel.onDidChangeViewState(
			(event) => {
				if (event.webviewPanel.active) {
					sideBarProvider.view.webview.postMessage({
						type: requestTypes.selectItemRequest,
						colId: "",
						folId: "",
						id: "",
						varId: id,
					});
				}
			},
			null,
			this._disposables,
		);

		this._panel.webview.onDidReceiveMessage(async (reqData: any) => {
			if (reqData.type === requestTypes.getVariableItemRequest) {
				GetVariableById(
					reqData.data.id,
					reqData.data.isGlobal,
					this._panel.webview,
				);
				GetCollectionsByVariable(reqData.data.id, this._panel.webview);
			} else if (reqData.type === requestTypes.updateVariableRequest) {
				UpdateVariable(reqData.data, this._panel.webview);
			} else if (reqData.type === requestTypes.saveVariableRequest) {
				SaveVariable(
					reqData.data,
					this._panel.webview,
					sideBarProvider.view,
				);
			} else if (reqData.type === requestTypes.getAllVariableRequest) {
				GetAllVariable(this._panel.webview);
			} else if (reqData.type === requestTypes.awsCheckConnectivityRequest) {
				const results = await handleAwsCheckConnectivity(reqData.data.targets);
				this._panel.webview.postMessage({
					type: responseTypes.awsCheckConnectivityResponse,
					results,
				});
			} else if (reqData.type === requestTypes.awsFetchAndCacheRequest) {
				const results = await handleAwsFetchAndCache(reqData.data.targets);
				this._panel.webview.postMessage({
					type: responseTypes.awsFetchAndCacheResponse,
					results,
				});
			} else if (reqData.type === requestTypes.clearSecretCacheRequest) {
				const results = clearAwsSecretCache(reqData.data.targets);
				this._panel.webview.postMessage({ type: responseTypes.clearSecretCacheResponse, results });
			}
		});
	}

	public dispose(id?: string) {
		sideBarProvider.view.webview.postMessage({
			type: requestTypes.closeItemRequest,
			id: "",
			colId: "",
			folderId: "",
			varId: id,
		});

		if (VariablePanel.currentPanel === this) {
			VariablePanel.currentPanel = undefined;
		}

		this._panel.dispose();
		this._disposables.forEach((d) => d.dispose());
		this._disposables = [];
	}
}

export const VariableUI = (extensionUri: vscode.Uri) => {
	const disposable = vscode.commands.registerCommand(
		"fetch-client.newVar",
		(type: string, id?: string) => {
			VariablePanel.createOrShow(extensionUri, type, id);
		},
	);

	return disposable;
};
