import * as vscode from 'vscode';

export type LogLevel = 'info' | 'warn' | 'error';

export class VSCodeLogger implements vscode.Disposable {

	private readonly _logChannel: vscode.OutputChannel;
	private _isOpen = false;

	constructor() {
		this._logChannel = vscode.window.createOutputChannel("Fetch Client", { log: true });
	}

	public showLog(): void {
		this._isOpen ? this._logChannel.hide() : this._logChannel.show();
		this._isOpen = !this._isOpen;
	}

	public log(category: LogLevel | string, ...args: unknown[]): void {
		switch (category.toLowerCase()) {
			case 'info':
			case 'warn':
				for (const arg of args) {
					this._logChannel.appendLine(this.mapObject(arg));
				}
				return;

			case 'error': {
				const message = args.map(a => this.mapObject(a)).join('');
				this._logChannel.appendLine(message);
				vscode.window.showErrorMessage(message, { modal: true });
				return;
			}

			default:
				this._logChannel.appendLine(this.mapObject(category));
				for (const arg of args) {
					this._logChannel.appendLine(this.mapObject(arg));
				}
				return;
		}
	}

	public dispose(): void {
		this._logChannel.dispose();
	}

	private mapObject(obj: unknown): string {
		if (obj === undefined) {
			return 'undefined';
		}
		if (obj === null) {
			return 'null';
		}
		if (typeof obj === 'string') {
			return obj;
		}
		if (typeof obj === 'number' || typeof obj === 'boolean') {
			return obj.toString();
		}
		if (typeof obj === 'object') {
			let ret = '';
			for (const [key, value] of Object.entries(obj)) {
				ret += `${key}: ${value}\n`;
			}
			return ret;
		}
		return String(obj);
	}
}
