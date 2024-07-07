import * as vscode from 'vscode';
import loki, { LokiFsAdapter } from 'lokijs';
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import { IVariable } from "../../fetch-client-ui/components/SideBar/redux/types";
import { variableDBPath } from "./consts";
import { pubSubTypes, responseTypes } from '../configuration';
import { writeLog } from '../logger/logger';
import { getGlobalPath, pubSub } from '../../extension';
import { FetchClientVariableProxy } from '../validators/fetchClientVariableValidator';
import { formatDate } from '../helper';
import { RemoveVariable } from './collectionDBUtil';


function getDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(getGlobalPath() + "\\" + variableDBPath, { adapter: idbAdapter });
  return db;
}

export function SaveVariable(item: IVariable, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userVariables = db.getCollection('userVariables');
      userVariables.insert(item);
      db.saveDatabase();

      if (webview) {
        webview.postMessage({ type: responseTypes.saveVariableResponse });
      }

      if (sideBarView) {
        sideBarView.webview.postMessage({ type: responseTypes.appendToVariableResponse, collection: item });
      }

      if (pubSub.size > 0) {
        pubSub.publish({ messageType: pubSubTypes.updateVariables });
      }

    });

  } catch (err) {
    writeLog("error::SaveVariable(): " + err);
  }
}

export function DuplicateVariable(id: string, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const sourceData = db.getCollection('userVariables').chain().find({ 'id': id }).data({ forceClones: true, removeMeta: true });
      if (sourceData && sourceData.length > 0) {
        let distData: IVariable = {
          id: uuidv4(),
          name: sourceData[0].name.toUpperCase().trim() === "GLOBAL" ? "Global - Copy" : sourceData[0].name + " - Copy",
          createdTime: formatDate(),
          isActive: true,
          data: sourceData[0].data
        };
        db.getCollection('userVariables').insert(distData);
        db.saveDatabase();

        if (webview) {
          webview.postMessage({ type: responseTypes.saveVariableResponse });
        }

        if (sideBarView) {
          sideBarView.webview.postMessage({ type: responseTypes.appendToVariableResponse, collection: distData });
        }
      }
    });

  } catch (err) {
    writeLog("error::DuplicateVariable(): " + err);
  }
}

export function UpdateVariable(item: IVariable, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userVariables').findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
      db.saveDatabase();

      if (webview) {
        webview.postMessage({ type: responseTypes.updateVariableResponse });
      }

      if (pubSub.size > 0) {
        pubSub.publish({ messageType: pubSubTypes.updateVariables });
      }
    });

  } catch (err) {
    writeLog("error::SaveVariable(): " + err);
  }
}

export function GetAllVariable(webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userVariables = db.getCollection('userVariables').data;
      webview.postMessage({ type: responseTypes.getAllVariableResponse, variable: userVariables });
    });

  } catch (err) {
    writeLog("error::GetAllVariable(): " + err);
  }
}

export function GetVariableById(id: string, isGlobal: boolean, webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let userVariables = db.getCollection('userVariables').find(isGlobal ? { 'name': 'Global' } : { 'id': id });
      webview.postMessage({ type: responseTypes.getVariableItemResponse, data: userVariables });
    });

  } catch (err) {
    writeLog("error::GetVariableById(): " + err);
  }
}

export function GetVariableByIdSync(id: string) {
  try {
    return new Promise<IVariable>((resolve, _reject) => {
      const db = getDB();

      db.loadDatabase({}, function (err: any) {
        if (err) {
          resolve(null);
        }
        let userVariables = db.getCollection('userVariables').find(id ? { 'id': id } : { 'name': 'Global' });
        resolve(userVariables && userVariables.length > 0 ? userVariables[0] as IVariable : null);
      });
    });
  } catch (err) {
    writeLog("error::GetVariableByIdSync(): " + err);
  }
}

export function DeleteVariable(webviewView: vscode.WebviewView, id: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userVariables').findAndRemove({ 'id': id });
      db.saveDatabase();
      RemoveVariable(id);
      webviewView.webview.postMessage({ type: responseTypes.deleteVariableResponse, id: id });
      if (pubSub.size > 0) {
        pubSub.publish({ messageType: pubSubTypes.updateVariables });
      }
    });

  } catch (err) {
    writeLog("error::DeleteVariable(): " + err);
  }
}

export function RenameVariable(webviewView: vscode.WebviewView, id: string, name: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userVariables').findAndUpdate({ 'id': id }, item => { item.name = name; });
      db.saveDatabase();
      webviewView.webview.postMessage({ type: responseTypes.renameVariableResponse, params: { id: id, name: name } });
      if (pubSub.size > 0) {
        pubSub.publish({ messageType: pubSubTypes.updateVariables });
      }
    });

  } catch (err) {
    writeLog("error::RenameVariable(): " + err);
  }
}

export function ChangeVariableStatus(id: string, status: boolean, webviewView: vscode.WebviewView) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      db.getCollection('userVariables').findAndUpdate({ 'id': id }, item => { item.isActive = status; });
      db.saveDatabase();
      webviewView.webview.postMessage({ type: responseTypes.activeVariableResponse, params: { id: id, status: status } });
    });

  } catch (err) {
    writeLog("error::ChangeVariableStatus(): " + err);
  }
}

export function ExportVariable(path: string, vars: IVariable) {
  try {
    let exportData = {
      app: "Fetch Client",
      id: vars.id,
      name: vars.name.toUpperCase().trim() === "GLOBAL" ? "Global Export" : vars.name,
      version: "1.0",
      type: "variables",
      createdTime: vars.createdTime,
      exportedDate: formatDate(),
      isActive: true,
      data: vars.data
    };

    fs.writeFile(path, JSON.stringify(exportData), (error) => {
      if (error) {
        vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message);
        writeLog("error::ExportVariable()::FileWrite()" + error.message);
      } else {
        vscode.window.showInformationMessage("Successfully saved to '" + path + "'.");
      }
    });
  } catch (err) {
    writeLog("error::ExportVariable(): " + err);
  }
}

function ValidateData(data: string): boolean {
  try {
    if (!data || data.length === 0) {
      vscode.window.showErrorMessage("Could not import the variable - Empty Data.");
      writeLog("error::ImportVariable::ValidateData() " + "Error Message : Could not import the variable - Empty Data.");
      return false;
    }

    FetchClientVariableProxy.Parse(data);

    return true;
  }
  catch (err) {
    vscode.window.showErrorMessage("Could not import the variable - Invalid Data.");
    writeLog("error::ImportVariable::ValidateData() " + "Error Message : Could not import the variable - " + err);
    return false;
  }
}

export function ImportVariableFromJsonFile(webviewView: vscode.WebviewView, path: string) {
  try {
    const data = fs.readFileSync(path, "utf8");

    if (!ValidateData(data)) {
      return;
    }

    const parsedData = JSON.parse(data);

    let reqData = parsedData as IVariable;

    reqData.id = uuidv4();
    reqData.createdTime = formatDate();

    ImportVariable(webviewView, reqData);

  } catch (err) {
    vscode.window.showErrorMessage("Could not import the variable - Invalid data.");
    writeLog("error::ImportVariableFromJsonFile(): - Error Mesaage : " + err);
  }
}

export function ImportVariableFromEnvFile(webviewView: vscode.WebviewView, path: string) {
  try {
    const data = fs.readFileSync(path, "utf8").toString().split("\n");
    let fileName = path.split('\\').pop().split('/').pop().split('.')[0]?.trim();

    let reqData: IVariable = {
      id: uuidv4(),
      name: fileName ? fileName : ".env",
      createdTime: formatDate(),
      isActive: true,
      data: []
    };

    for (let l in data) {
      let line = data[l].trim();
      if (line.indexOf("=") > -1) {
        reqData.data.push({
          isChecked: true,
          key: line.substring(0, line.indexOf("=")).trim(),
          value: line.substring(line.indexOf("=") + 1).trim()
        });
      }
    }

    ImportVariable(webviewView, reqData);

  } catch (err) {
    vscode.window.showErrorMessage("Could not import the variable - Invalid data.");
    writeLog("error::ImportVariableFromEnvFile(): - Error Mesaage : " + err);
  }
}

export function ImportVariable(webviewView: vscode.WebviewView, reqData: IVariable) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userVariables = db.getCollection('userVariables');
      userVariables.insert(reqData);
      db.saveDatabase();
      webviewView.webview.postMessage({ type: responseTypes.importVariableResponse, vars: reqData });
    });

  } catch (err) {
    vscode.window.showErrorMessage("Could not import the variable - Invalid data.");
    writeLog("error::ImportVariable(): - Error Mesaage : " + err);
  }
}