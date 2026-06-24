import { getExtDbBKPPath, getExtLocalDbPath, getGlobalStorageUri } from "../../fetch-client-core/db/dbHelper";
import { getSaveToWorkspaceConfiguration, updateWorkspacePathConfiguration } from "../utils/vscodeConfig";
import { invalidateCollectionDB } from "../../fetch-client-core/db/collectionDB.repository";
import { invalidateHistoryDB } from "../../fetch-client-core/db/history.repository";
import { invalidateMainDB } from "../../fetch-client-core/db/mainDB.repository";
import { invalidateVariableDB } from "../../fetch-client-core/db/variableDB.repository";
import fs from "fs";
import path from "path";

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

export const transferDbConfig = () => {
	const customPath = getExtLocalDbPath();
	const pathState = getSaveToWorkspaceConfiguration();
	const actualPath = getGlobalStorageUri();
	const dbFile = path.join(customPath, "fetchClientCollection.db");

	if (actualPath && customPath && actualPath !== customPath) {
		if (pathState) {
			const bkpPath = getExtDbBKPPath();
			if (!fs.existsSync(bkpPath)) {
				fs.cpSync(actualPath, bkpPath, { recursive: true });
			}

			if (fs.existsSync(dbFile)) {
				const customBKPPath = path.join(customPath, "BKP");
				if (!fs.existsSync(customBKPPath)) {
					fs.mkdirSync(customBKPPath, { recursive: true });
				}

				DB_FILES.forEach(file => {
					safeCopyFile(path.join(customPath, file), path.join(customBKPPath, file));
				});
			}

			DB_FILES.forEach(file => {
				safeCopyFile(path.join(actualPath, file), path.join(customPath, file));
				safeDeleteFile(path.join(actualPath, file));
			});
			updateWorkspacePathConfiguration(customPath);
		} else {
			DB_FILES.forEach(file => {
				safeCopyFile(path.join(customPath, file), path.join(actualPath, file));
				safeDeleteFile(path.join(customPath, file));
			});
			updateWorkspacePathConfiguration("");
		}

		invalidateCollectionDB();
		invalidateHistoryDB();
		invalidateMainDB();
		invalidateVariableDB();
	}
};

