import { existsSync, statSync } from "fs";
import {
  mainDBPath,
  collectionDBPath,
  historyDBPath,
  variableDBPath,
  cookieDBPath,
  settingsDBPath,
  responseDBPath,
  getExtDbPath,
} from "../../fetch-client-core/db/dbHelper";
import { printSection, printTable } from "../utils/display";
import { writeConsoleLog } from "../utils/logger";

// ANSI helpers (inline to avoid coupling to unexported internals)
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;

interface DbFileEntry {
  label: string;
  pathFn: () => string;
}

const DB_FILES: DbFileEntry[] = [
  { label: "Main DB", pathFn: mainDBPath },
  { label: "Collections DB", pathFn: collectionDBPath },
  { label: "History DB", pathFn: historyDBPath },
  { label: "Variables DB", pathFn: variableDBPath },
  { label: "Cookies DB", pathFn: cookieDBPath },
  { label: "Settings DB", pathFn: settingsDBPath },
  { label: "Response DB", pathFn: responseDBPath },
];

export function checkDbFiles(): void {
  const dbDir = getExtDbPath();

  printSection("Fetch Client DB Check");
  writeConsoleLog(`  ${dim("DB directory:")} ${cyan(dbDir)}\n`);

  let allFound = true;

  const header = [bold("File"), bold("Path"), bold("Status"), bold("Size")];
  const rows: string[][] = [header];

  for (const entry of DB_FILES) {
    const filePath = entry.pathFn();
    const exists = existsSync(filePath);

    if (!exists) {
      allFound = false;
    }

    const status = exists ? green("✓ Found") : red("✗ Missing");
    const size = exists
      ? dim(`${(statSync(filePath).size / 1024).toFixed(1)} KB`)
      : dim("-");

    rows.push([cyan(entry.label), dim(filePath), status, size]);
  }

  printTable(rows);

  if (allFound) {
    writeConsoleLog(`  ${green("All DB files are present.")}`);
  } else {
    writeConsoleLog(`  ${red("One or more DB files are missing.")}`);
    writeConsoleLog(
      `  ${dim("Missing files will be created automatically when the VS Code extension runs.")}`
    );
  }
}