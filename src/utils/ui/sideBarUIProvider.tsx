import * as vscode from 'vscode';
import {
	getStorageManager, OpenAddToColUI, OpenAttachVariableUI, OpenAutoRequestUI, OpenBulkExportUI, OpenColSettings, OpenCopyToColUI,
	OpenCurlUI, OpenExistingItem, OpenRunAllUI, OpenVariableUI, pubSub, vsCodeLogger
} from '../../extension';
import { ICollections, IFolder, IHistory } from '../../fetch-client-ui/components/SideBar/redux/types';
import { getNonce, pubSubTypes, requestTypes, responseTypes } from '../../utils/configuration';
import {
	AddToCollection, AttachVariable, CreateNewCollection,
	DeleteAllCollectionItems, DeleteCollection, DeleteCollectionItem,
	DuplicateItem, GetAllCollections, NewFolderToCollection, NewRequestToCollection,
	RemoveVariableByVariableId, RenameCollection, RenameCollectionItem
} from '../../utils/db/collectionDBUtil';
import { DeleteAllHistory, DeleteHistory, GetAllHistory, RenameHistory } from '../../utils/db/historyDBUtil';
import { Export, Import, SaveRequest } from '../db/mainDBUtil';
import {
	ChangeVariableStatus, DeleteVariable, DuplicateVariable, ExportVariable,
	GetAllVariable,
	ImportVariableFromEnvFile,
	ImportVariableFromJsonFile,
	RenameVariable
} from '../db/varDBUtil';
import { formatDate } from '../helper';
import { IPubSubMessage, Subscription } from '../PubSub';
import { getVSCodeTheme } from '../vscodeConfig';

export class SideBarProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'fetch-client.sideBar';

	public view?: vscode.WebviewView;

	private _scriptionId: Subscription;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) {
		this._pushMessages = this._pushMessages.bind(this);
		this._scriptionId = pubSub.subscribe(this._pushMessages);
	}

	public resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken,) {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

		webviewView.onDidDispose(() => {
			this._scriptionId.unsubscribe();
		});

		webviewView.webview.onDidReceiveMessage(reqData => {
			switch (reqData.type) {
				case requestTypes.getAllHistoryRequest:
					GetAllHistory(webviewView);
					break;
				case requestTypes.deleteAllHistoryRequest:
					this.showConfirmationBox("Do you want to clear all history?").then((data: any) => {
						if (data === "Yes") {
							DeleteAllHistory(webviewView);
						}
					});
					break;
				case requestTypes.deleteHistoryRequest:
					this.showConfirmationBox(`Do you want to delete the '${reqData.name}' history item?`).then((data: any) => {
						if (data === "Yes") {
							DeleteHistory(webviewView, reqData.data);
						}
					});
					break;
				case requestTypes.renameHistoryRequest:
					this.showInputBox().then((data: any) => {
						if (data) {
							RenameHistory(webviewView, reqData.data, data);
						}
					});
					break;
				case requestTypes.openHistoryItemRequest:
					OpenExistingItem(reqData.data.id, reqData.data.name, reqData.data.colId, reqData.data.folderId, reqData.data.varId, undefined, reqData.data.isNewTab);
					break;
				case requestTypes.openAndRunItemRequest:
					OpenExistingItem(reqData.data.id, reqData.data.name, reqData.data.colId, reqData.data.folderId, reqData.data.varId, "OpenAndRun", reqData.data.isNewTab);
					break;
				case requestTypes.addToCollectionsRequest:
					OpenAddToColUI(reqData.data);
					break;
				case requestTypes.getAllCollectionsRequest:
					GetAllCollections(webviewView.webview);
					break;
				case requestTypes.renameCollectionItemRequest:
					this.showInputBox().then((name: any) => {
						if (name) {
							RenameCollectionItem(webviewView, reqData.data.colId, reqData.data.historyId, reqData.data.folderId, reqData.data.isFolder, name);
						}
					});
					break;
				case requestTypes.deleteCollectionItemRequest:
					this.showConfirmationBox(`Do you want to delete the '${reqData.data.name}' ${reqData.data.isFolder ? "folder?" : "item?"}`).then((data: any) => {
						if (data === "Yes") {
							DeleteCollectionItem(webviewView, reqData.data.colId, reqData.data.folderId, reqData.data.historyId, reqData.data.isFolder);
						}
					});
					break;
				case requestTypes.renameCollectionRequest:
					this.showInputBox().then((name: any) => {
						if (name) {
							RenameCollection(webviewView, reqData.data, name);
						}
					});
					break;
				case requestTypes.deleteCollectionRequest:
					this.showConfirmationBox(`Do you want to delete the '${reqData.name}' collection?`).then((data: any) => {
						if (data === "Yes") {
							DeleteCollection(webviewView, reqData.data);
						}
					});
					break;
				case requestTypes.newRequest:
					OpenExistingItem();
					break;
				case requestTypes.duplicateCollectionsRequest:
					DuplicateItem(reqData.data.coldId, reqData.data.folderId, reqData.data.historyId, reqData.data.isFolder, webviewView);
					break;
				case requestTypes.exportRequest:
					vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-collection_" + reqData.data.name?.replace(/[/\\?%*:|"<>]/g, '-') + ".json") }).then((uri: vscode.Uri | undefined) => {
						if (uri) {
							const value = uri.fsPath;
							Export(value, reqData.data.colId, reqData.data.hisId, reqData.data.folderId);
						}
					});
					break;
				case requestTypes.clearRequest:
					this.showConfirmationBox(`Do you want to clear all items in '${reqData.data.name}' ?`).then((data: any) => {
						if (data === "Yes") {
							DeleteAllCollectionItems(webviewView, reqData.data.colId, reqData.data.folderId);
						}
					});
					break;
				case requestTypes.importRequest:
					vscode.window.showOpenDialog({ filters: { 'Json Files': ['json'] }, canSelectMany: true }).then((uri: vscode.Uri[] | undefined) => {
						if (uri && uri.length > 0) {
							uri.forEach((item, index) => {
								const value = item.fsPath;
								setTimeout(function () { Import(webviewView, value); }, 250 * index);
							});
						}
					});
					break;
				case requestTypes.copyToCollectionsRequest:
					OpenCopyToColUI(reqData.data.id, reqData.data.name);
					break;
				case requestTypes.getAllVariableRequest:
					GetAllVariable(webviewView.webview);
					break;
				case requestTypes.renameVariableRequest:
					this.showInputBox().then((name: any) => {
						if (name) {
							RenameVariable(webviewView, reqData.data, name);
						}
					});
					break;
				case requestTypes.deleteVariableRequest:
					this.showConfirmationBox(`Do you want to delete the '${reqData.name}' variable?`).then((data: any) => {
						if (data === "Yes") {
							DeleteVariable(webviewView, reqData.data);
						}
					});
					break;
				case requestTypes.newVariableRequest:
					OpenVariableUI();
					break;
				case requestTypes.openVariableItemRequest:
					OpenVariableUI(reqData.data);
					break;
				case requestTypes.attachVariableRequest:
					OpenAttachVariableUI(reqData.data.id, reqData.data.name);
					break;
				case requestTypes.removeVariableRequest:
					this.showConfirmationBox(`Do you want to remove the variable from '${reqData.data.name}' collection?`).then((data: any) => {
						if (data === "Yes") {
							AttachVariable(reqData.data.id, "", null, webviewView);
						}
					});
					break;
				case requestTypes.activeVariableRequest:
					ChangeVariableStatus(reqData.data.id, reqData.data.status, webviewView);
					break;
				case requestTypes.exportVariableRequest:
					vscode.window.showSaveDialog({ defaultUri: vscode.Uri.file("fetch-client-variable_" + reqData.vars.name?.replace(/[/\\?%*:|"<>]/g, '-') + ".json") }).then((uri: vscode.Uri | undefined) => {
						if (uri) {
							const value = uri.fsPath;
							ExportVariable(value, reqData.vars.id);
						}
					});
					break;
				case requestTypes.importVariableRequest:
					vscode.window.showOpenDialog({ filters: { 'Files': ['json', 'env'] }, canSelectMany: true }).then((uri: vscode.Uri[] | undefined) => {
						if (uri && uri.length > 0) {
							uri.forEach((item, index) => {
								const value = item.fsPath;
								let ext = value.split('.').pop();
								if (ext.toLowerCase() === "json") {
									setTimeout(function () { ImportVariableFromJsonFile(webviewView, value); }, 250 * index);
								} else {
									setTimeout(function () { ImportVariableFromEnvFile(webviewView, value); }, 250 * index);
								}
							});
						}
					});
					break;
				case requestTypes.duplicateVariableRequest:
					DuplicateVariable(reqData.id, null, webviewView);
					break;
				case requestTypes.runAllUIOpenRequest:
					OpenRunAllUI(reqData.data.colId, reqData.data.folderId, reqData.data.name, reqData.data.varId);
					break;
				case requestTypes.createNewRequest:
					this.showInputBox().then((data: any) => {
						if (data) {
							reqData.data.request.name = data;
							SaveRequest(reqData.data.request);
							let item: IHistory = {
								id: reqData.data.request.id,
								method: reqData.data.request.method,
								name: data,
								url: reqData.data.request.url,
								createdTime: reqData.data.request.createdTime ? reqData.data.request.createdTime : formatDate()
							};
							NewRequestToCollection(item, reqData.data.colId, reqData.data.folderId, webviewView);
						}
					});
					break;
				case requestTypes.createNewFolderRequest:
					this.showInputBox().then((data: any) => {
						if (data) {
							let folder = reqData.data.folder as IFolder;
							folder.name = data;
							NewFolderToCollection(folder, reqData.data.colId, reqData.data.folderId, webviewView);
						}
					});
					break;
				case requestTypes.newCollectionRequest:
					this.showInputBox().then((name: string) => {
						if (name) {
							if (name.toLocaleLowerCase() === "default") {
								vscode.window.showInformationMessage("Collection name should not be 'default'", { modal: true });
							}
							else {
								CreateNewCollection(name, webviewView);
							}
						}
					});
					break;
				case requestTypes.openColSettingsRequest:
					OpenColSettings(reqData.data.colId, reqData.data.folderId, reqData.data.name, reqData.data.type, reqData.data.varId);
					break;
				case requestTypes.copyItemRequest:
					getStorageManager().setValue("item-copy-data", reqData.data.history);
					webviewView.webview.postMessage({ type: responseTypes.copyItemResponse });
					break;
				case requestTypes.pasteItemRequest:
					let history = getStorageManager().getValue("item-copy-data");
					if (history) {
						getStorageManager().setValue("item-copy-data", "");
						let col: ICollections = reqData.data.col;
						if (reqData.data.isFolder) {
							(col.data[0] as IFolder).data.push(history as IHistory);
						} else {
							col.data.push(history as IHistory);
						}
						AddToCollection(col, reqData.data.isFolder, false, null, webviewView);
						webviewView.webview.postMessage({ type: responseTypes.pasteItemResponse });
					}
					break;
				case requestTypes.importCurlRequest:
					OpenCurlUI();
					break;
				case requestTypes.removeVariableFromColRequest:
					if (reqData.data.varId) {
						RemoveVariableByVariableId(reqData.data.varId, webviewView);
					}
					break;
				case requestTypes.viewLogRequest:
					if (vsCodeLogger) {
						vsCodeLogger.showLog();
					}
					break;
				case requestTypes.themeRequest:
					webviewView.webview.postMessage(getVSCodeTheme());
					break;
				case requestTypes.bulkExportRequest:
					OpenBulkExportUI(reqData.data.type);
					break;
				case requestTypes.openAutoRequest:
					OpenAutoRequestUI();
					break;
			}
		});
	}

	private _pushMessages(message: IPubSubMessage) {
		if (message.messageType === pubSubTypes.themeChanged) {
			this.view.webview.postMessage({ type: message.messageType });
		}
	}

	private async showInputBox() {
		const res = await vscode.window.showInputBox({
			value: "", prompt: "Enter new name", placeHolder: "Enter new name", ignoreFocusOut: false,
			validateInput: text => {
				return text !== "" && text.length <= 50 ? null : "Enter the valid name (length should be <=50)";
			}
		});

		return res;
	}

	private async showConfirmationBox(text: string) {
		const res = await vscode.window.showWarningMessage(text, { modal: true }, "Yes", "No");
		return res;
	}

	private getHtmlForWebview(webview: vscode.Webview) {

		const nonce = getNonce();

		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, "dist/fetch-client-ui.js")
		);

		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "/dist/main.css"));

		return `<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link href="${styleUri}" rel="stylesheet" type="text/css"/>
				<title>sideBar</title>
			</head>
			<body>
				<noscript>You need to enable JavaScript to run this app.</noscript>
				<div id="root"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
		</html>`;;
	}
}

