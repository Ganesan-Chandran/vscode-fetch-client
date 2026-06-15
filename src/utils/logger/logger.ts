import { appendFile, stat, writeFile } from "fs/promises";
import { writeFileSync } from "fs";
import path from "path";
import { getExtDbPath } from "../db/helper";
import { formatDate } from "../helper";
import { logPath } from "./constants";

const LOG_SIZE_LIMIT_MB = 1;

export function createLogFile(): void {
	// Intentionally synchronous — called during extension storage bootstrap
	// where the caller (ensureDb) does not await the return value.
	writeFileSync(path.resolve(getExtDbPath(), logPath), "");
}

export async function writeLog(err: unknown): Promise<void> {
	try {
		const logFilePath = path.resolve(getExtDbPath(), logPath);
		await clearLogIfOversized(logFilePath);
		const data = `\n${formatDate()}  ${String(err)}\n`;
		await appendFile(logFilePath, data);
	} catch {
		// Swallow errors from the error-logger itself to avoid infinite loops
	}
}

async function clearLogIfOversized(logFilePath: string): Promise<void> {
	try {
		const stats = await stat(logFilePath);
		const fileSizeMB = stats.size / (1024 * 1024);
		if (fileSizeMB > LOG_SIZE_LIMIT_MB) {
			await writeFile(logFilePath, "");
		}
	} catch {
		// If the file doesn't exist yet, ignore — appendFile will create it
	}
}
