import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { ICliConfig } from "./types/common.types";
import { join, resolve } from "path";
import { wrtieConsleError } from "./utils/logger";

const PUBLISHER = 'GanesanChandran';
const EXT_NAME = 'fetch-client';
const EXT_ID = `${PUBLISHER}.${EXT_NAME}`;
export const cliConfig = getCliConfig();


/**
 * Resolves the directory that contains the LokiJS database files.
 *
 * Resolution order (mirrors the VS Code extension's getExtDbPath()):
 * 1. fetch-client.dbPath = "Custom Path"  → fetch-client.customDbPath
 * 2. fetch-client.dbPath = "Workspace"    → fetch-client.workspacePath, or cwd/fetch-client
 * 3. fetch-client.dbPath = "Default"      → global-storage path
 * 4. Legacy: fetch-client.saveToWorkspace = true (deprecated boolean)
 */

export function getCliConfig(): ICliConfig {
    let cliConfig: ICliConfig = {
        dbPath: null,
        encryptionEnabled: null,
        encryptionKey: null
    };

    if (process.env.FC_DB_PATH) {
        cliConfig.dbPath = process.env.FC_DB_PATH;
        cliConfig.encryptionEnabled = process.env.FC_ENCRYPTION_ENABLED?.toLowerCase() === "true";
        if (cliConfig.encryptionEnabled && !process.env.FC_ENCRYPTION_KEY) {
            wrtieConsleError("An encryption key is required when encryption is enabled. If you are running the CLI standalone, configure encryption using environment variables.");
            process.exit(1);
        }
        cliConfig.encryptionKey = process.env.FC_ENCRYPTION_KEY;
    } else {
        const settings = readVSCodeSettings();
        if (settings) {
            cliConfig.dbPath = resolveDbPath(settings);
            cliConfig.encryptionEnabled = resolveEncryptionEnabled(settings);
            cliConfig.encryptionKey = resolveEncryptionKey(settings);
        } else {
            wrtieConsleError(
                "Database path and encryption configuration not found. If you are running the CLI standalone, set the database path and encryption configuration using environment variables."
            );
            process.exit(1);
        }
    }

    return cliConfig;
}

export function resolveDbPath(settings: Record<string, unknown>): string {
    const dbPathMode = (settings['fetch-client.dbPath'] as string) ?? 'Default';
    if (dbPathMode === 'Custom Path') {
        const customPath = (settings['fetch-client.customDbPath'] as string) ?? '';
        if (customPath) {
            return customPath;
        }
        // customDbPath is empty – fall back to default storage
        return defaultStoragePath();
    }

    if (dbPathMode === 'Workspace') {
        const workspacePath: string = (settings['fetch-client.workspacePath'] as string) ?? '';

        if (workspacePath) {
            return workspacePath;
        }

        // Fallback: use cwd as the workspace root (same as VS Code using workspaceFolders[0])
        return resolve(process.cwd(), 'fetch-client');
    }

    // "Default" mode – but also handle legacy saveToWorkspace boolean for older configs
    const saveToWorkspace: boolean = settings['fetch-client.saveToWorkspace'] === true;

    if (saveToWorkspace) {
        const workspacePath: string =
            (settings['fetch-client.workspacePath'] as string) ?? '';

        if (workspacePath) {
            return workspacePath;
        }

        return resolve(process.cwd(), 'fetch-client');
    }
    return defaultStoragePath();
}

/**
 * Reads the VS Code user-level settings.json and returns it as a flat object.
 * Returns an empty object if the file cannot be read or parsed.
 */
function readVSCodeSettings(): Record<string, unknown> | null {
    const settingsPath = vscodeUserSettingsPath();

    if (!existsSync(settingsPath)) {
        return null;
    }

    try {
        const raw = readFileSync(settingsPath, 'utf-8');

        // VS Code settings.json may contain comments (JSONC); strip them before parsing.
        const stripped = raw
            .replace(/\/\/[^\n]*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        return JSON.parse(stripped) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function vscodeUserSettingsPath(): string {
    if (process.platform === 'win32') {
        const appData =
            process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');

        return join(appData, 'Code', 'User', 'settings.json');
    }

    if (process.platform === 'darwin') {
        return join(
            homedir(),
            'Library',
            'Application Support',
            'Code',
            'User',
            'settings.json'
        );
    }

    return join(homedir(), '.config', 'Code', 'User', 'settings.json');
}

function defaultStoragePath(): string {
    if (process.platform === 'win32') {
        const appData =
            process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');

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

export function resolveEncryptionEnabled(settings: Record<string, unknown>): boolean {
    return settings['fetch-client.encryptedVariables'] === true;
}


export function resolveEncryptionKey(settings: Record<string, unknown>): string {
    const key = settings['fetch-client.variableEncryptionKey'];
    return typeof key === 'string' ? key : '';
}
