import fs from "fs";
import path from "path";
import { getExtDbPath } from "../db/getExtDbPath";
import { formatDate } from "../helper";
import { logPath } from "./constants";

export function createLogFile() {
	fs.writeFileSync(path.resolve(getExtDbPath(), logPath), "");
}

export function writeLog(err: any) {
	clearLog();
	const data = "\n" + formatDate() + "  " + err + "\n";
	fs.appendFileSync(path.resolve(getExtDbPath(), logPath), data);
}

function clearLog() {
	const logFilePath = path.resolve(getExtDbPath(), logPath);
	const stats = fs.statSync(logFilePath);
	const fileSizeInBytes = stats.size;
	const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
	if (fileSizeInMegabytes > 1) {
		fs.writeFileSync(logFilePath, "");
	}
}
