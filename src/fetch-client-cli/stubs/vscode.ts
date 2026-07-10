/**
 * Minimal stub for the 'vscode' module used when running in CLI context.
 * Only the surface area called by fetch-client-core / fetch-client-vscode is covered.
 */

export enum ConfigurationTarget {
	Global = 1,
	Workspace = 2,
	WorkspaceFolder = 3,
}

export enum ColorThemeKind {
	Light = 1,
	Dark = 2,
	HighContrast = 3,
	HighContrastLight = 4,
}

function makeConfig() {
	return {
		get<T>(_key: string, defaultVal?: T): T {
			return defaultVal as T;
		},

		update(): Promise<void> {
			return Promise.resolve();
		},

		has(): boolean {
			return false;
		},

		inspect(): undefined {
			return undefined;
		},
	};
}

export const workspace = {
	getConfiguration(_section?: string) {
		return makeConfig();
	},

	workspaceFolders: null as null,

	onDidChangeConfiguration() {
		return { dispose() {} };
	},
};

export const window = {
	activeColorTheme: { kind: ColorThemeKind.Dark },

	showInformationMessage() {
		return Promise.resolve(undefined);
	},

	showWarningMessage() {
		return Promise.resolve(undefined);
	},

	showErrorMessage() {
		return Promise.resolve(undefined);
	},
};

export const Uri = {
	file(path: string) {
		return {
			fsPath: path,
			scheme: "file",
		};
	},

	parse(value: string) {
		return {
			fsPath: value,
			scheme: "file",
		};
	},
};

export const commands = {
	registerCommand() {
		return { dispose() {} };
	},

	executeCommand() {
		return Promise.resolve();
	},
};

export const extensions = {
	getExtension() {
		return undefined;
	},
};

export class EventEmitter {
	event = () => ({ dispose() {} });

	fire() {}

	dispose() {}
}

export class Disposable {
	static from(..._disposables: any[]) {
		return { dispose() {} };
	}

	dispose() {}
}

export default {
	workspace,
	window,
	Uri,
	commands,
	extensions,
	ConfigurationTarget,
	ColorThemeKind,
	EventEmitter,
	Disposable,
};
