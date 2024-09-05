import fs from "fs";
import path from "path";
import * as vscode from 'vscode';
import { FCScheduler } from "./utils/autoRequest/scheduler";
import { pubSubTypes } from './utils/configuration';
import { GetAllCollections } from './utils/db/collectionDBUtil';
import { autoRequestDBPath, collectionDBPath, cookieDBPath, historyDBPath, mainDBPath, variableDBPath } from "./utils/db/dbPaths";
import { CreateAutoRequestDB, CreateCollectionDB, CreateCookieDB, CreateHistoryDB, CreateMainDB, CreateVariableDB } from './utils/db/dbUtil';
import { getExtDbPath, setGlobalStorageUri } from './utils/db/getExtDbPath';
import { GetAllHistory } from './utils/db/historyDBUtil';
import { transferDbConfig } from './utils/db/transferDBConfig';
import { GetAllVariable, UpdateToDecryptedVariables, UpdateToEncryptedVariables } from './utils/db/varDBUtil';
import { LocalStorageService } from './utils/LocalStorageService';
import { logPath } from './utils/logger/constants';
import { createLogFile } from './utils/logger/logger';
import { VSCodeLogger } from './utils/logger/vsCodeLogger';
import { IPubSubMessage, PubSub } from './utils/PubSub';
import { AddToColUI } from './utils/ui/addToCollectionUIProvider';
import { AutoRequestProviderUI } from './utils/ui/autoRequestUIProvider';
import { BulkExportProviderUI } from './utils/ui/bulkExportUIProvider';
import { CookieUI } from './utils/ui/cookieUIProvider';
import { CurlProviderUI } from './utils/ui/curlUIProvider';
import { ErrorLogUI } from './utils/ui/errorLogUIProvider';
import { WebAppPanel } from './utils/ui/mainUIProvider';
import { SideBarProvider } from './utils/ui/sideBarUIProvider';
import { VariableUI } from './utils/ui/variableUIProvider';
import { getVariableEncryptionFCConfiguration, setVariableEncryptionConfiguration } from './utils/vscodeConfig';

export var pubSub: PubSub<IPubSubMessage>;
export var vsCodeLogger: VSCodeLogger;
export var sideBarProvider: SideBarProvider;
var storageManager: LocalStorageService;
var extPath = "";
var extensionUri: vscode.Uri;

export function OpenExistingItem(id?: string, name?: string, colId?: string, folderId?: string, varId?: string, type?: string, newTab?: boolean) {
	WebAppPanel.createOrShow(extensionUri, id, (name && name.length > 15 ? name.substring(0, 15) + "..." : name), colId, varId, type, folderId, newTab);
}

export function OpenAddToColUI(id: string) {
	vscode.commands.executeCommand("fetch-client.addToCol", id, "", "", "addtocol");
}

export function OpenVariableUI(id?: string, type?: string) {
	vscode.commands.executeCommand("fetch-client.newVar", id, type);
}

export function OpenCopyToColUI(id: string, name: string) {
	vscode.commands.executeCommand("fetch-client.addToCol", id, "", name, "copytocol");
}

export function OpenAttachVariableUI(id: string, name: string) {
	vscode.commands.executeCommand("fetch-client.addToCol", id, "", name, "attachcol");
}

export function OpenRunAllUI(colId: string, folderId: string, name: string, varId: string) {
	vscode.commands.executeCommand("fetch-client.addToCol", colId, folderId, name, "runall", varId);
}

export function OpenCookieUI(id?: string) {
	vscode.commands.executeCommand("fetch-client.manageCookies", id);
}

export function OpenCurlUI() {
	vscode.commands.executeCommand("fetch-client.curlRequest");
}

export function OpenBulkExportUI(type: string) {
	vscode.commands.executeCommand("fetch-client.bulkExport", type);
}

export function OpenAutoRequestUI() {
	vscode.commands.executeCommand("fetch-client.autoRequest");
}

export function OpenColSettings(colId: string, folderId: string, name: string, type: string, varId: string) {
	vscode.commands.executeCommand("fetch-client.addToCol", colId, folderId, name, "colsettings@:@" + type, varId);
}

export function activate(context: vscode.ExtensionContext) {

	setGlobalStorageUri(context.globalStorageUri.fsPath);
	setVariableEncryptionConfiguration(getVariableEncryptionFCConfiguration());

	extPath = getExtDbPath();
	extensionUri = context.extensionUri;

	pubSub = new PubSub<IPubSubMessage>();
	vsCodeLogger = new VSCodeLogger();

	if (!fs.existsSync(extPath)) {
		fs.mkdirSync(extPath, { recursive: true });
	}

	if (!fs.existsSync(historyDBPath())) {
		CreateHistoryDB();
	}

	if (!fs.existsSync(mainDBPath())) {
		CreateMainDB();
	}

	if (!fs.existsSync(collectionDBPath())) {
		CreateCollectionDB();
	}

	if (!fs.existsSync(variableDBPath())) {
		CreateVariableDB();
	}

	if (!fs.existsSync(cookieDBPath())) {
		CreateCookieDB();
	}

	if (!fs.existsSync(autoRequestDBPath())) {
		CreateAutoRequestDB();
	}

	if (!fs.existsSync(path.resolve(extPath, logPath))) {
		createLogFile();
	}

	storageManager = new LocalStorageService(context.workspaceState);

	vscode.window.onDidChangeActiveColorTheme((_e: vscode.ColorTheme) => {
		if (pubSub) {
			pubSub.publish({ messageType: pubSubTypes.themeChanged });
		}
	});

	sideBarProvider = new SideBarProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider(SideBarProvider.viewType, sideBarProvider));
	context.subscriptions.push(vscode.commands.registerCommand('fetch-client.newRequest', () => { WebAppPanel.createOrShow(context.extensionUri); }));
	context.subscriptions.push(AddToColUI(context.extensionUri));
	context.subscriptions.push(VariableUI(context.extensionUri));
	context.subscriptions.push(CookieUI(context.extensionUri));
	context.subscriptions.push(vscode.commands.registerCommand('fetch-client.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', 'Fetch Client');
	}));
	context.subscriptions.push(ErrorLogUI(context.extensionUri));
	context.subscriptions.push(CurlProviderUI(context.extensionUri));
	context.subscriptions.push(BulkExportProviderUI(context.extensionUri));
	context.subscriptions.push(AutoRequestProviderUI(context.extensionUri));

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("fetch-client.saveToWorkspace")) {
				transferDbConfig();
			} else if (e.affectsConfiguration("fetch-client.encryptedVariables")) {
				if (getVariableEncryptionFCConfiguration()) {
					UpdateToEncryptedVariables();
					setVariableEncryptionConfiguration(true);
				} else {
					UpdateToDecryptedVariables();
					setVariableEncryptionConfiguration(false);
				}
			}
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand('fetch-client.reloadData', () => {
		GetAllCollections(sideBarProvider?.view?.webview);
		GetAllHistory(sideBarProvider?.view);
		GetAllVariable(sideBarProvider?.view?.webview);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('fetch-client.documentation', () => {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/Ganesan-Chandran/vscode-fetch-client/wiki'));
	}));

	context.subscriptions.push(vscode.commands.registerCommand('fetch-client.raiseRequest', () => {
		vscode.env.openExternal(vscode.Uri.parse('https://github.com/Ganesan-Chandran/vscode-fetch-client/issues'));
	}));

	context.subscriptions.push(vscode.commands.registerCommand('fetch-client.feedback', () => {
		vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=GanesanChandran.fetch-client&ssr=false#review-details'));
	}));
}

export function getStorageManager(): LocalStorageService {
	return storageManager;
}

export function deactivate() {
	FCScheduler.Instance.StopAllJobs();
	pubSub.clear();
}
