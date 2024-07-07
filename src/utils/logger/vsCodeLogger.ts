import * as vscode from 'vscode';

export class VSCodeLogger {

  private _logChannel: vscode.OutputChannel;

  constructor() {
    this._logChannel = vscode.window.createOutputChannel("Fetch Client");
  }

  public showLog() {
    if (this._logChannel) {
      this._logChannel.show();
    }
  }

  public log(category: string, ...o: any) {
    switch (category.toLowerCase()) {
      case 'info':
        o.map((args: any) => {
          this._logChannel.appendLine('' + this.mapObject(args));
        });
        return;

      case 'warn':
        o.map((args: any) => {
          this._logChannel.appendLine('' + this.mapObject(args));
        });
        return;

      case 'error':
        let err: string = '';
        o.map((args: any) => {
          err += this.mapObject(args);
        });
        this._logChannel.appendLine(err);
        vscode.window.showErrorMessage(err);
        return;

      default:
        this._logChannel.appendLine(this.mapObject(category));
        o.map((args: any) => {
          this._logChannel.appendLine('' + this.mapObject(args));
        });
        return;
    }
  }

  private mapObject(obj: any) {
    switch (typeof obj) {
      case 'undefined':
        return 'undefined';

      case 'string':
        return obj;

      case 'number':
        return obj.toString;

      case 'object':
        let ret: string = '';
        for (const [key, value] of Object.entries(obj)) {
          ret += (`${key}: ${value}\n`);
        }
        return ret;

      default:
        return obj;
    }
  }
};
