import {
	AddToColUI,
	AutoRequestProviderUI,
	BulkExportProviderUI,
	CookieUI,
	CurlProviderUI,
	ErrorLogUI,
	SideBarProvider,
	VariableUI,
	WebAppPanel,
} from "./fetch-client-vscode/webviews";
import {
	autoRequestDBPath,
	collectionDBPath,
	cookieDBPath,
	getExtDbPath,
	getExtLocalDbPath,
	getGlobalStorageUri,
	historyDBPath,
	mainDBPath,
	responseDBPath,
	setGlobalStorageUri,
	variableDBPath,
} from "./fetch-client-core/db/dbHelper";
import {
	CreateAutoRequestDB,
	CreateCollectionDB,
	CreateCookieDB,
	CreateHistoryDB,
	CreateMainDB,
	CreateResponseDB,
	CreateVariableDB,
} from "./fetch-client-core/db/dbUtil";
import { createLogFile } from "./fetch-client-core/helpers/logger/logger";
import {
	DbPathOption,
	getCustomDbPathConfiguration,
	getDbPathConfiguration,
	getSaveToWorkspaceConfiguration,
	getVariableEncryptionFCConfiguration,
	getVariableEncryptionKey,
	setVariableEncryptionConfiguration,
	setVariableEncryptionKey,
	updateDbPathConfiguration,
	updateSaveToWorkspaceConfiguration,
	updateVariableEncryption,
	updateVariableEncryptionKey,
} from "./fetch-client-core/utils/vscodeConfig";
import {
	GetAllVariable,
	UpdateToDecryptedVariables,
	UpdateToEncryptedVariables,
	UpdateWithAnotherKey,
} from "./fetch-client-vscode/db/varDBUtil";
import { access, mkdir } from "fs/promises";
import { backupFile } from "./fetch-client-vscode/utils/common.utils";
import { FCScheduler } from "./fetch-client-vscode/utils/scheduler";
import { flushCollectionDB } from "./fetch-client-core/db/collectionDB.repository";
import { flushHistoryDB } from "./fetch-client-core/db/history.repository";
import { flushMainDB } from "./fetch-client-core/db/mainDB.repository";
import { flushVariableDB } from "./fetch-client-core/db/variableDB.repository";
import { GetAllCollections } from "./fetch-client-vscode/db/collectionDBUtil";
import { GetAllHistory } from "./fetch-client-vscode/db/historyDBUtil";
import { IPubSubMessage, PubSub } from "./fetch-client-core/utils/pubSub";
import { LocalStorageService } from "./fetch-client-vscode/utils/localStorageService";
import { logPath } from "./fetch-client-core/helpers/logger/constants";
import { MemoryCache } from "./fetch-client-vscode/utils/memoryCache";
import { pubSubTypes } from "./fetch-client-core/consts/requestTypes.consts";
import { transferDbConfig } from "./fetch-client-vscode/db/transferDBConfig";
import { VSCodeLogger } from "./fetch-client-vscode/logger/vsCodeLogger";
import * as vscode from "vscode";
import fs from "fs";
import path from "path";

export let pubSub: PubSub<IPubSubMessage>;
export let vsCodeLogger: VSCodeLogger;
export let sideBarProvider: SideBarProvider;

let storageManager: LocalStorageService;
let extensionUri: vscode.Uri;
let extCache: MemoryCache<string>;

export function OpenExistingItem(
	id?: string,
	name?: string,
	colId?: string,
	folderId?: string,
	varId?: string,
	type?: string,
	newTab?: boolean,
): void {
	const displayName =
		name && name.length > 15 ? `${name.substring(0, 15)}...` : name;
	WebAppPanel.createOrShow(
		extensionUri,
		id,
		displayName,
		colId,
		varId,
		type,
		folderId,
		newTab,
	);
}

export function OpenAddToColUI(id: string): void {
	vscode.commands.executeCommand(
		"fetch-client.addToCol",
		id,
		"",
		"",
		"addtocol",
	);
}

export function OpenVariableUI(id?: string, type?: string): void {
	vscode.commands.executeCommand("fetch-client.newVar", id, type);
}

export function OpenCopyToColUI(id: string, name: string): void {
	vscode.commands.executeCommand(
		"fetch-client.addToCol",
		id,
		"",
		name,
		"copytocol",
	);
}

export function OpenAttachVariableUI(id: string, name: string): void {
	vscode.commands.executeCommand(
		"fetch-client.addToCol",
		id,
		"",
		name,
		"attachcol",
	);
}

export function OpenRunAllUI(
	colId: string,
	folderId: string,
	name: string,
	varId: string,
): void {
	vscode.commands.executeCommand(
		"fetch-client.addToCol",
		colId,
		folderId,
		name,
		"runall",
		varId,
	);
}

export function OpenReOrderUI(colId: string, folderId: string): void {
	vscode.commands.executeCommand(
		"fetch-client.addToCol",
		colId,
		folderId,
		"",
		"reorder",
	);
}

export function OpenPerfTestUI(
	colId: string,
	folderId: string,
	name: string,
	varId: string,
): void {
	vscode.commands.executeCommand(
		"fetch-client.addToCol",
		colId,
		folderId,
		name,
		"perftest",
		varId,
	);
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

export function OpenColSettings(
	colId: string,
	folderId: string,
	name: string,
	type: string,
	varId: string,
): void {
	vscode.commands.executeCommand(
		"fetch-client.addToCol",
		colId,
		folderId,
		name,
		`colsettings@:@${type}`,
		varId,
	);
}

// ---------------------------------------------------------------------------
// Extension lifecycle
// ---------------------------------------------------------------------------

export async function activate(
	context: vscode.ExtensionContext,
): Promise<void> {
	setGlobalStorageUri(context.globalStorageUri.fsPath);
	setVariableEncryptionConfiguration(getVariableEncryptionFCConfiguration());

	extensionUri = context.extensionUri;
	pubSub = new PubSub<IPubSubMessage>();
	vsCodeLogger = new VSCodeLogger();
	context.subscriptions.push(vsCodeLogger);
	storageManager = new LocalStorageService(context.workspaceState);
	extCache = new MemoryCache<string>();

	// Migrate legacy saveToWorkspace boolean -> new dbPath enum
	if (
		getDbPathConfiguration() === "Default" &&
		getSaveToWorkspaceConfiguration()
	) {
		updateDbPathConfiguration("Workspace");
	}

	try {
		await initializeStorage();
	} catch (err) {
		vsCodeLogger.log(
			"error",
			"Fetch Client: failed to initialize storage.",
			err,
		);
	}

	registerProviders(context);
	registerCommands(context);
	registerEventListeners(context);
	extCache.set("oldKey", getVariableEncryptionKey());
	extCache.set("oldDbPathMode", getDbPathConfiguration());
	extCache.set("oldCustomDbPath", getCustomDbPathConfiguration());
}

export function getStorageManager(): LocalStorageService {
	return storageManager;
}

export async function deactivate(): Promise<void> {
	FCScheduler.Instance.StopAllJobs();
	pubSub?.clear();
	await Promise.allSettled([
		flushMainDB(),
		flushCollectionDB(),
		flushHistoryDB(),
		flushVariableDB(),
	]);
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

async function ensureDb(
	dbPath: string,
	createFn: () => void | Promise<void>,
	execFn?: () => void,
): Promise<void> {
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
		ensureDb(historyDBPath(), CreateHistoryDB),
		ensureDb(mainDBPath(), CreateMainDB),
		ensureDb(collectionDBPath(), CreateCollectionDB),
		ensureDb(variableDBPath(), CreateVariableDB),
		ensureDb(cookieDBPath(), CreateCookieDB),
		ensureDb(autoRequestDBPath(), CreateAutoRequestDB),
		ensureDb(responseDBPath(), CreateResponseDB),
		ensureDb(path.resolve(extPath, logPath), createLogFile),
	]);
}

// ---------------------------------------------------------------------------
// Registration helpers - keep activate() lean
// ---------------------------------------------------------------------------

function registerProviders(context: vscode.ExtensionContext): void {
	sideBarProvider = new SideBarProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			SideBarProvider.viewType,
			sideBarProvider,
		),
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
		vscode.commands.registerCommand("fetch-client.newRequest", () => {
			WebAppPanel.createOrShow(context.extensionUri);
		}),
		vscode.commands.registerCommand("fetch-client.openSettings", () => {
			vscode.commands.executeCommand(
				"workbench.action.openSettings",
				"Fetch Client",
			);
		}),
		vscode.commands.registerCommand("fetch-client.reloadData", () => {
			GetAllCollections(sideBarProvider?.view?.webview);
			GetAllHistory(sideBarProvider?.view);
			GetAllVariable(sideBarProvider?.view?.webview);
		}),
		vscode.commands.registerCommand("fetch-client.documentation", () => {
			vscode.env.openExternal(
				vscode.Uri.parse(
					"https://github.com/Ganesan-Chandran/vscode-fetch-client/wiki",
				),
			);
		}),
		vscode.commands.registerCommand("fetch-client.raiseRequest", () => {
			vscode.env.openExternal(
				vscode.Uri.parse(
					"https://github.com/Ganesan-Chandran/vscode-fetch-client/issues",
				),
			);
		}),
		vscode.commands.registerCommand("fetch-client.feedback", () => {
			vscode.env.openExternal(
				vscode.Uri.parse(
					"https://marketplace.visualstudio.com/items?itemName=GanesanChandran.fetch-client&ssr=false#review-details",
				),
			);
		}),
	);
}

function getSourcePath(mode: DbPathOption): string {
	if (mode === "Workspace") {
		return getExtLocalDbPath();
	}
	if (mode === "Custom Path") {
		return extCache.get("oldCustomDbPath") ?? "";
	}
	return getGlobalStorageUri();
}

let isUpdatingEncryptionSetting = false;

function registerEventListeners(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.window.onDidChangeActiveColorTheme(() => {
			pubSub?.publish({ messageType: pubSubTypes.themeChanged });
		}),
		vscode.workspace.onDidChangeConfiguration(async (e) => {
			if (e.affectsConfiguration("fetch-client.dbPath")) {
				const oldMode = (extCache.get("oldDbPathMode") ??
					"Default") as DbPathOption;
				const newMode = getDbPathConfiguration();

				if (newMode === oldMode) {
					return;
				}

				if (newMode === "Custom Path") {
					const customPath = getCustomDbPathConfiguration().trim();
					if (!customPath) {
						vscode.window.showErrorMessage(
							"Fetch Client: Please enter a Custom DB Path first, then change the DB Path option.",
						);
						updateDbPathConfiguration(oldMode);
						return;
					}

					if (!fs.existsSync(customPath)) {
						vscode.window.showErrorMessage(
							`Fetch Client: Custom DB Path "${customPath}" does not exist. Please enther a valid directory path`,
						);
						updateDbPathConfiguration(oldMode);
						return;
					}

					if (!fs.statSync(customPath).isDirectory()) {
						vscode.window.showErrorMessage(
							`Fetch Client: Custom DB Path "${customPath}" is not a directory.`,
						);
						updateDbPathConfiguration(oldMode);
						return;
					}
				}

				if (newMode === "Workspace") {
					const wsPath = vscode.workspace.workspaceFolders?.[0]?.uri?.fsPath;
					if (!wsPath) {
						vscode.window.showErrorMessage(
							"Fetch Client: No workspace folder is open. Open a folder first before using Workspace DB Path.",
						);
						updateDbPathConfiguration(oldMode);
						return;
					}
				}

				const sourcePath = getSourcePath(oldMode);
				if (!sourcePath) {
					vscode.window.showErrorMessage(
						"Fetch Client: Could not determine the current DB location. Please check your settings.",
					);
					updateDbPathConfiguration(oldMode);
					return;
				}
				transferDbConfig(newMode, sourcePath)
					.then((applied) => {
						if (applied) {
							extCache.set("oldDbPathMode", newMode);
							updateSaveToWorkspaceConfiguration(
								newMode === "Workspace" ? true : false,
							);
						} else {
							// Transfer was cancelled or failed - revert the config setting.
							// Do NOT update cache so the next change event sees the correct oldMode.
							updateDbPathConfiguration(oldMode);
						}
					})
					.catch(() => {
						updateDbPathConfiguration(oldMode);
					});
			}

			if (e.affectsConfiguration("fetch-client.customDbPath")) {
				const currentMode = getDbPathConfiguration();
				const newCustom = getCustomDbPathConfiguration().trim();
				const oldCustom = (extCache.get("oldCustomDbPath") ?? "").trim();

				// Always keep the cache up to date
				extCache.set("oldCustomDbPath", newCustom);

				// Only act if mode is already Custom Path and the path actually changed
				if (
					currentMode === "Custom Path" &&
					newCustom !== oldCustom &&
					oldCustom
				) {
					if (!newCustom) {
						vscode.window.showWarningMessage(
							"Fetch Client: Custom DB Path is now empty. Enter a valid path or change the DB Path option.",
						);
						return;
					}
					if (!fs.existsSync(newCustom)) {
						vscode.window.showErrorMessage(
							`Fetch Client: New custom DB path "${newCustom}" does not exist.`,
						);
						return;
					}
					if (!fs.statSync(newCustom).isDirectory()) {
						vscode.window.showErrorMessage(
							`Fetch Client: New custom DB path "${newCustom}" is not a directory.`,
						);
						return;
					}
					// Migrate DB files from old custom path to new custom path
					const currentActivePath = oldCustom || getGlobalStorageUri();
					transferDbConfig("Custom Path", currentActivePath)
						.then((applied) => {
							extCache.set("oldCustomDbPath", applied ? newCustom : oldCustom);
						})
						.catch(() => {
							extCache.set("oldCustomDbPath", oldCustom);
						});
				}
			}

			if (e.affectsConfiguration("fetch-client.variableEncryptionKey")) {
				const oldKey = extCache.get("oldKey");

				try {
					const newKey = getVariableEncryptionKey();
					if (!newKey) {
						updateVariableEncryptionKey(oldKey);
						return;
					}

					if (newKey === oldKey) {
						return;
					}

					if (getVariableEncryptionFCConfiguration()) {
						UpdateWithAnotherKey(oldKey, newKey);
					}

					setVariableEncryptionKey(newKey);
					extCache.set("oldKey", newKey);
				} catch (error) {
					updateVariableEncryptionKey(oldKey);
				}
			}

			if (e.affectsConfiguration("fetch-client.encryptedVariables")) {
				await handleEncryptedVariablesChange();
			}
		}),
	);
}

const BACKUP_DIR_SUFFIX = "\\backups\\";

function getBackupDir(): string {
	return `${getGlobalStorageUri() + BACKUP_DIR_SUFFIX}`;
}

async function handleEncryptedVariablesChange(): Promise<void> {
	if (isUpdatingEncryptionSetting) {
		return;
	}

	const shouldEncrypt = getVariableEncryptionFCConfiguration();
	const key = getVariableEncryptionKey();

	if (!key) {
		vscode.window.showInformationMessage(
			"Encryption key is required. Enter the encryption key in Fetch Client Settings -> Variable Encryption Key",
		);

		isUpdatingEncryptionSetting = true;
		try {
			await updateVariableEncryption(!shouldEncrypt);
		} finally {
			isUpdatingEncryptionSetting = false;
		}
		return;
	}

	try {
		backupFile(variableDBPath(), getBackupDir());

		if (shouldEncrypt) {
			await UpdateToEncryptedVariables(key);
		} else {
			await UpdateToDecryptedVariables(key);
		}

		isUpdatingEncryptionSetting = true;
		try {
			setVariableEncryptionConfiguration(shouldEncrypt);
		} finally {
			isUpdatingEncryptionSetting = false;
		}
	} finally {
		await vscode.window.showInformationMessage(
			"Reload VS Code to apply the changes",
			{ modal: true },
		);
		await deactivate();
		await vscode.commands.executeCommand("workbench.action.reloadWindow");
	}
}
