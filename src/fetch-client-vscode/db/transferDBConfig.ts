import { DbPathOption, getCustomDbPathConfiguration, updateWorkspacePathConfiguration } from "../../fetch-client-core/utils/vscodeConfig";
import { getExtLocalDbPath, getGlobalStorageUri } from "../../fetch-client-core/db/dbHelper";
import { flushCollectionDB, invalidateCollectionDB } from "../../fetch-client-core/db/collectionDB.repository";
import { flushHistoryDB, invalidateHistoryDB } from "../../fetch-client-core/db/history.repository";
import { flushMainDB, invalidateMainDB } from "../../fetch-client-core/db/mainDB.repository";
import { flushVariableDB, invalidateVariableDB } from "../../fetch-client-core/db/variableDB.repository";
import * as vscode from 'vscode';
import fs from "fs";
import path from "path";

const DB_FILES = [
	'fetchClientCookies.db',
	'fetchClientHistory.db',
	'fetchClientCollection.db',
	'fetchClient.db',
	'fetchClientVariable.db',
	'fetchClientResponse.db',
	'fetch-client.log'
] as const;

function safeCopyFile(src: string, dest: string): void {
	try {
		fs.cpSync(src, dest, { recursive: true, force: true });
	} catch {
		// Individual file may not exist (e.g. log file on first run); skip silently
	}
}

function targetHasDbFiles(targetPath: string): boolean {
	return fs.existsSync(path.join(targetPath, "fetchClientCollection.db")) || fs.existsSync(path.join(targetPath, "fetchClientHistory.db"));
}

function resolveTargetPath(newMode: DbPathOption): string | null {
	if (newMode === "Default") { return getGlobalStorageUri(); }
	if (newMode === "Workspace") { return getExtLocalDbPath(); }
	if (newMode === "Custom Path") {
		const custom = getCustomDbPathConfiguration();
		return custom || null;
	}
	return null;
}

function applyPathSwitch(newMode: DbPathOption, targetPath: string): void {
	if (newMode !== "Custom Path") {
		updateWorkspacePathConfiguration(newMode === "Default" ? "" : targetPath);
	}
	invalidateCollectionDB();
	invalidateHistoryDB();
	invalidateMainDB();
	invalidateVariableDB();
}

export async function transferDbConfig(
	newMode: DbPathOption,
	currentPath: string,
): Promise<boolean> {

	const targetPath = resolveTargetPath(newMode);

	if (!targetPath) {
		// Custom Path chosen but customDbPath is empty - caller already validated this
		return false;
	}

	if (targetPath === currentPath) { return true; }

	// Ensure the target directory exists
	try {
		fs.mkdirSync(targetPath, { recursive: true });
	} catch {
		vscode.window.showErrorMessage(`Fetch Client: Could not create directory at "${targetPath}".`);
		return false;
	}

	// Overwrite confirmation
	if (newMode !== "Default" && targetHasDbFiles(targetPath)) {
		const choice = await vscode.window.showWarningMessage(
			`Fetch Client: DB files already exist at "${targetPath}". Overwrite them with your current data?`,
			{ modal: true },
			"Overwrite",
			"Keep Existing",
		);

		if (!choice) {
			// Dialog dismissed - signal caller to revert
			return false;
		}

		if (choice === "Keep Existing") {
			// Switch path without copying
			applyPathSwitch(newMode, targetPath);
			return true;
		}

		// "Overwrite" -> fall through to copy
	}

	await Promise.allSettled([
		flushMainDB(),
		flushCollectionDB(),
		flushHistoryDB(),
		flushVariableDB()
	]);

	// Copy all DB files from currentPath to targetPath
	DB_FILES.forEach(file => {
		safeCopyFile(path.join(currentPath, file), path.join(targetPath, file));
	});

	applyPathSwitch(newMode, targetPath);

	return true;
}
