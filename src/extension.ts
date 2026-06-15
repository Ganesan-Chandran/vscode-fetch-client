import { access, mkdir } from "fs/promises";
import path from "path";
import * as vscode from 'vscode';
import { FCScheduler } from "./utils/autoRequest/scheduler";
import { pubSubTypes } from './utils/configuration';
import { GetAllCollections } from './utils/db/collectionDBUtil';
import { autoRequestDBPath, collectionDBPath, cookieDBPath, getExtDbPath, historyDBPath, mainDBPath, setGlobalStorageUri, settingsDBPath, variableDBPath } from "./utils/db/helper";
import { CreateAutoRequestDB, CreateCollectionDB, CreateCookieDB, CreateHistoryDB, CreateMainDB, CreateSettingsDB, CreateVariableDB } from './utils/db/dbUtil';
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
import { GetEncryptionKeyFromSettings, InitSettingsDB } from "./utils/db/settingsDBUtil";

export let pubSub: PubSub<IPubSubMessage>;
export let vsCodeLogger: VSCodeLogger;
export let sideBarProvider: SideBarProvider;

let storageManager: LocalStorageService;
let extensionUri: vscode.Uri;

// ---------------------------------------------------------------------------
// Public navigation helpers — called by webview providers
// ---------------------------------------------------------------------------

export function OpenExistingItem(
	id?: string, name?: string, colId?: string,
	folderId?: string, varId?: string, type?: string, newTab?: boolean
): void {
	const displayName = name && name.length > 15 ? `${name.substring(0, 15)}...` : name;
	WebAppPanel.createOrShow(extensionUri, id, displayName, colId, varId, type, folderId, newTab);
}

export function OpenAddToColUI(id: string): void {
	vscode.commands.executeCommand("fetch-client.addToCol", id, "", "", "addtocol");
}

export function OpenVariableUI(id?: string, type?: string): void {
	vscode.commands.executeCommand("fetch-client.newVar", id, type);
}

export function OpenCopyToColUI(id: string, name: string): void {
	vscode.commands.executeCommand("fetch-client.addToCol", id, "", name, "copytocol");
}

export function OpenAttachVariableUI(id: string, name: string): void {
	vscode.commands.executeCommand("fetch-client.addToCol", id, "", name, "attachcol");
}

export function OpenRunAllUI(colId: string, folderId: string, name: string, varId: string): void {
	vscode.commands.executeCommand("fetch-client.addToCol", colId, folderId, name, "runall", varId);
}

export function OpenCookieUI(id?: string): void {
	vscode.commands.executeCommand("fetch-client.manageCookies", id);
}

export function OpenCurlUI(): void {
	vscode.commands.executeCommand("fetch-client.curlRequest");
}

export function OpenBulkExportUI(type: string): void {
	vscode.commands.executeCommand("fetch-client.bulkExport", type);
}

export function OpenAutoRequestUI(): void {
	vscode.commands.executeCommand("fetch-client.autoRequest");
}

export function OpenColSettings(colId: string, folderId: string, name: string, type: string, varId: string): void {
	vscode.commands.executeCommand("fetch-client.addToCol", colId, folderId, name, `colsettings@:@${type}`, varId);
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

export async function activate(context: vscode.ExtensionContext): Promise<void> {
	setGlobalStorageUri(context.globalStorageUri.fsPath);
	setVariableEncryptionConfiguration(getVariableEncryptionFCConfiguration());

	extensionUri = context.extensionUri;
	pubSub = new PubSub<IPubSubMessage>();
	vsCodeLogger = new VSCodeLogger();
	context.subscriptions.push(vsCodeLogger);
	storageManager = new LocalStorageService(context.workspaceState);

	try {
		await initializeStorage();
	} catch (err) {
		vsCodeLogger.log("error", "Fetch Client: failed to initialize storage.", err);
	}

	registerProviders(context);
	registerCommands(context);
	registerEventListeners(context);
}

export function getStorageManager(): LocalStorageService {
	return storageManager;
}

export function deactivate(): void {
	FCScheduler.Instance.StopAllJobs();
	pubSub?.clear();
}

// ---------------------------------------------------------------------------
// Initialization helpers
// ---------------------------------------------------------------------------

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

async function ensureDb(dbPath: string, createFn: () => void | Promise<void>, execFn?: () => void): Promise<void> {
	if (!(await pathExists(dbPath))) {
		await createFn();
	} else {
		execFn?.();
	}
}

async function initializeStorage(): Promise<void> {
	const extPath = getExtDbPath();

	if (!(await pathExists(extPath))) {
		await mkdir(extPath, { recursive: true });
	}

	await Promise.all([
		ensureDb(settingsDBPath(), CreateSettingsDB),
		ensureDb(historyDBPath(), CreateHistoryDB),
		ensureDb(mainDBPath(), CreateMainDB),
		ensureDb(collectionDBPath(), CreateCollectionDB),
		ensureDb(variableDBPath(), CreateVariableDB),
		ensureDb(cookieDBPath(), CreateCookieDB),
		ensureDb(autoRequestDBPath(), CreateAutoRequestDB),
		ensureDb(path.resolve(extPath, logPath), createLogFile),
	]).then(async () => {
		await InitSettingsDB();
	});
}

// ---------------------------------------------------------------------------
// Registration helpers — keep activate() lean
// ---------------------------------------------------------------------------

function registerProviders(context: vscode.ExtensionContext): void {
	sideBarProvider = new SideBarProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SideBarProvider.viewType, sideBarProvider),
		AddToColUI(context.extensionUri),
		VariableUI(context.extensionUri),
		CookieUI(context.extensionUri),
		ErrorLogUI(context.extensionUri),
		CurlProviderUI(context.extensionUri),
		BulkExportProviderUI(context.extensionUri),
		AutoRequestProviderUI(context.extensionUri),
	);
}

function registerCommands(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.commands.registerCommand('fetch-client.newRequest', () => {
			WebAppPanel.createOrShow(context.extensionUri);
		}),
		vscode.commands.registerCommand('fetch-client.openSettings', () => {
			vscode.commands.executeCommand('workbench.action.openSettings', 'Fetch Client');
		}),
		vscode.commands.registerCommand('fetch-client.reloadData', () => {
			GetAllCollections(sideBarProvider?.view?.webview);
			GetAllHistory(sideBarProvider?.view);
			GetAllVariable(sideBarProvider?.view?.webview);
		}),
		vscode.commands.registerCommand('fetch-client.documentation', () => {
			vscode.env.openExternal(vscode.Uri.parse('https://github.com/Ganesan-Chandran/vscode-fetch-client/wiki'));
		}),
		vscode.commands.registerCommand('fetch-client.raiseRequest', () => {
			vscode.env.openExternal(vscode.Uri.parse('https://github.com/Ganesan-Chandran/vscode-fetch-client/issues'));
		}),
		vscode.commands.registerCommand('fetch-client.feedback', () => {
			vscode.env.openExternal(vscode.Uri.parse('https://marketplace.visualstudio.com/items?itemName=GanesanChandran.fetch-client&ssr=false#review-details'));
		}),
	);
}

function registerEventListeners(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveColorTheme(() => {
			pubSub?.publish({ messageType: pubSubTypes.themeChanged });
		}),
		vscode.workspace.onDidChangeConfiguration(async (e) => {
			if (e.affectsConfiguration("fetch-client.saveToWorkspace")) {
				transferDbConfig();
			}

			if (e.affectsConfiguration("fetch-client.encryptedVariables")) {
				const shouldEncrypt = getVariableEncryptionFCConfiguration();
				let key = await GetEncryptionKeyFromSettings();
				if (shouldEncrypt) {
					UpdateToEncryptedVariables(key);
					setVariableEncryptionConfiguration(true);
				} else {
					UpdateToDecryptedVariables(key);
					setVariableEncryptionConfiguration(false);
				}
			}
		}),
	);
}
