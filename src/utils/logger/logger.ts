import fs from "fs";
import { getGlobalPath } from "../../extension";
import { formatDate } from "../helper";
import { logPath } from "./consts";

export function createLogFile() {
  fs.writeFileSync(getGlobalPath() + "\\" + logPath, "");
}

export function writeLog(err: any) {
  clearLog();
  const data = "\n" + formatDate() + "  " + err + "\n";
  fs.appendFileSync(getGlobalPath() + "\\" + logPath, data);
}

function clearLog() {
  const stats = fs.statSync(getGlobalPath() + "\\" + logPath);
  const fileSizeInBytes = stats.size;
  const fileSizeInMegabytes = fileSizeInBytes / (1024 * 1024);
  if (fileSizeInMegabytes > 1) {
    fs.writeFileSync(getGlobalPath() + "\\" + logPath, "");
  }
}
