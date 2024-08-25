import fs from "fs";
import path from "path";
import { getSaveToWorkspaceConfiguration, updateWorkspacePathConfiguration } from "../vscodeConfig";
import {
	getExtDbBKPPath,
	getExtLocalDbPath,
	getGlobalStorageUri
} from "./getExtDbPath";

/**
 * In case we use the config option keepInLocalPath,
 * we have to move the db files to the local path of the user if the option is enabled.
 * And the db files should be moved to the global path if the option is disabled.
 */
export const transferDbConfig = () => {
	const customPath = getExtLocalDbPath();
	const pathState = getSaveToWorkspaceConfiguration();
	const actualPath = getGlobalStorageUri();
	const files = ['fetchClientCookies.db', 'fetchClientHistory.db', 'fetchClientCollection.db', 'fetchClient.db', 'fetchClientVariable.db', 'fetch-client.log'];
	const dbFile = path.resolve(customPath, "fetchClientCollection.db");

	if (actualPath && customPath && actualPath !== customPath) {
		if (pathState) {
			// First time taking bakeup of the data in actual global path
			let bkpPath = getExtDbBKPPath();
			if (!fs.existsSync(bkpPath)) {
				fs.cpSync(actualPath, bkpPath, { recursive: true });
			}

			// Check if files are already available in the workspace path
			if (fs.existsSync(dbFile)) {
				let customBKPPath = path.resolve(customPath, "BKP");
				if (!fs.existsSync(customBKPPath)) {
					fs.mkdirSync(customBKPPath, { recursive: true });
				}

				// Copy all files to backup path in custom folder
				files.forEach(file => {
					fs.cpSync(path.resolve(customPath, file), path.resolve(customBKPPath, file), { recursive: true, force: true });
				});
			}

			// Copy all files to custom folder
			files.forEach(file => {
				fs.cpSync(path.resolve(actualPath, file), path.resolve(customPath, file), { recursive: true, force: true });
				fs.unlinkSync(path.resolve(actualPath, file));
			});
			updateWorkspacePathConfiguration(customPath);
		} else {

			// Copy all files to actual global path
			files.forEach(file => {
				fs.cpSync(path.resolve(customPath, file), path.resolve(actualPath, file), { recursive: true, force: true });
				fs.unlinkSync(path.resolve(customPath, file));
			});
			updateWorkspacePathConfiguration("");
		}
	}
};
