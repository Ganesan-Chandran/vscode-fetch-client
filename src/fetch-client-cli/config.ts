import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join, resolve } from "path";

const PUBLISHER = 'GanesanChandran';
const EXT_NAME = 'fetch-client';
const EXT_ID = `${PUBLISHER}.${EXT_NAME}`;

/**
 * Resolves the directory that contains the LokiJS database files.
 *
 * Resolution order:
 * 1. VS Code user settings → fetch-client.workspacePath (when saveToWorkspace=true)
 * 2. VS Code user settings → fetch-client.saveToWorkspace (cwd/fetch-client fallback)
 * 3. VS Code global-storage path for this extension
 */
export function resolveDbPath(): string {
    const settings = readVSCodeSettings();

    const saveToWorkspace: boolean =
        settings['fetch-client.saveToWorkspace'] === true;

    if (saveToWorkspace) {
        const workspacePath: string =
            (settings['fetch-client.workspacePath'] as string) ?? '';

        if (workspacePath) {
            return workspacePath;
        }

        // Fallback: use cwd as the workspace root (same as VS Code using workspaceFolders[0])
        return resolve(process.cwd(), 'fetch-client');
    }

    return defaultStoragePath();
}

/**
 * Reads the VS Code user-level settings.json and returns it as a flat object.
 * Returns an empty object if the file cannot be read or parsed.
 */
function readVSCodeSettings(): Record<string, unknown> {
    const settingsPath = vscodeUserSettingsPath();

    if (!existsSync(settingsPath)) {
        return {};
    }

    try {
        const raw = readFileSync(settingsPath, 'utf-8');

        // VS Code settings.json may contain comments (JSONC); strip them before parsing.
        const stripped = raw
            .replace(/\/\/[^\n]*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '');

        return JSON.parse(stripped) as Record<string, unknown>;
    } catch {
        return {};
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

export function resolveEncryptionEnabled(): boolean {
    const settings = readVSCodeSettings();
    return settings['fetch-client.encryptedVariables'] === true;
}


export function resolveEncryptionKey(): string {
    const settings = readVSCodeSettings();
    const key = settings['fetch-client.variableEncryptionKey'];
    return typeof key === 'string' ? key : '';
}