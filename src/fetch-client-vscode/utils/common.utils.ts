import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import fs from "fs";
import path from "path";

export function backupFile(filePath: string, backupDir: string): string {
	if (!fs.existsSync(filePath)) {
		return "";
	}

	// Create backup directory if it doesn't exist
	if (!fs.existsSync(backupDir)) {
		fs.mkdirSync(backupDir, { recursive: true });
	}

	const ext = path.extname(filePath);
	const baseName = path.basename(filePath, ext);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupPath = path.join(backupDir, `${baseName}_${timestamp}${ext}`);

	fs.copyFileSync(filePath, backupPath);
	writeLog(`Backed up: ${filePath} -> ${backupPath}`);

	return backupPath;
}