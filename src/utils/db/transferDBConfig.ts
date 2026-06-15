import fs from "fs";
import path from "path";
import { getSaveToWorkspaceConfiguration, updateWorkspacePathConfiguration } from "../vscodeConfig";
import {
	getExtDbBKPPath,
	getExtLocalDbPath,
	getGlobalStorageUri
} from "./helper";

const DB_FILES = ['fetchClientCookies.db', 'fetchClientHistory.db', 'fetchClientCollection.db', 'fetchClient.db', 'fetchClientVariable.db', 'fetchClientSettings.db', 'fetchClientResponse.db', 'fetch-client.log'] as const;

function safeCopyFile(src: string, dest: string): void {
	try {
		fs.cpSync(src, dest, { recursive: true, force: true });
	} catch (err) {
		// Individual file may not exist (e.g. log file on first run); skip silently
	}
}

function safeDeleteFile(filePath: string): void {
	try {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	} catch (err) {
		// Ignore deletion errors for non-critical files
	}
}

/**
 * In case we use the config option keepInLocalPath,
 * we have to move the db files to the local path of the user if the option is enabled.
 * And the db files should be moved to the global path if the option is disabled.
 */
export const transferDbConfig = () => {
	const customPath = getExtLocalDbPath();
	const pathState = getSaveToWorkspaceConfiguration();
	const actualPath = getGlobalStorageUri();
	const dbFile = path.join(customPath, "fetchClientCollection.db");

	if (actualPath && customPath && actualPath !== customPath) {
		if (pathState) {
			// First time taking backup of the data in actual global path
			const bkpPath = getExtDbBKPPath();
			if (!fs.existsSync(bkpPath)) {
				fs.cpSync(actualPath, bkpPath, { recursive: true });
			}

			// Check if files are already available in the workspace path
			if (fs.existsSync(dbFile)) {
				const customBKPPath = path.join(customPath, "BKP");
				if (!fs.existsSync(customBKPPath)) {
					fs.mkdirSync(customBKPPath, { recursive: true });
				}

				// Copy existing files to backup path in custom folder
				DB_FILES.forEach(file => {
					safeCopyFile(path.join(customPath, file), path.join(customBKPPath, file));
				});
			}

			// Copy all files from global path to custom folder
			DB_FILES.forEach(file => {
				safeCopyFile(path.join(actualPath, file), path.join(customPath, file));
				safeDeleteFile(path.join(actualPath, file));
			});
			updateWorkspacePathConfiguration(customPath);
		} else {
			// Copy all files back to actual global path
			DB_FILES.forEach(file => {
				safeCopyFile(path.join(customPath, file), path.join(actualPath, file));
				safeDeleteFile(path.join(customPath, file));
			});
			updateWorkspacePathConfiguration("");
		}
	}
};

