import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PUBLISHER = 'GanesanChandran';
const EXT_NAME = 'fetch-client';
const EXT_ID = `${PUBLISHER}.${EXT_NAME}`;
const CONFIG_FILE = join(homedir(), '.fc-config.json');

/**
 * Resolves the directory that contains the LokiJS database files.
 *
 * Resolution order:
 * 1. FC_DB_PATH environment variable
 * 2. ~/.fc-config.json -> { "dbPath": "<path>" }
 * 3. Auto-detect from the default VS Code global-storage location
 */
export function resolveDbPath(): string {
  if (process.env.FC_DB_PATH) {
    return process.env.FC_DB_PATH;
  }

  if (existsSync(CONFIG_FILE)) {
    try {
      const cfg = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
      if (cfg && typeof cfg.dbPath === 'string' && cfg.dbPath) {
        return cfg.dbPath;
      }
    } catch {
      // fall through to auto-detect
    }
  }

  return defaultStoragePath();
}

function defaultStoragePath(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    return join(appData, 'Code', 'User', 'globalStorage', EXT_ID);
  }

  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Code',
      'User',
      'globalStorage',
      EXT_ID
    );
  }

  return join(
    homedir(),
    '.config',
    'Code',
    'User',
    'globalStorage',
    EXT_ID
  );
}
