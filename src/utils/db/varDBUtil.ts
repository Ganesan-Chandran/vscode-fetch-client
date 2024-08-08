import fs from "fs";
import loki, { LokiFsAdapter } from 'lokijs';
import { v4 as uuidv4 } from 'uuid';
import * as vscode from 'vscode';
import { pubSub } from '../../extension';
import { ITableData } from '../../fetch-client-ui/components/Common/Table/types';
import { IVariable } from "../../fetch-client-ui/components/SideBar/redux/types";
import { pubSubTypes, responseTypes } from '../configuration';
import { formatDate } from '../helper';
import { PostmanVariableSchema_2_1 } from '../importers/postman/postman_2_1.variable_types';
import { writeLog } from '../logger/logger';
import { FetchClientVariableProxy } from '../validators/fetchClientVariableValidator';
import { RemoveVariable } from './collectionDBUtil';
import { VariableImportType } from './constants';
import { variableDBPath } from './dbPaths';
import { ThunderClientVariableSchema_1_2 } from "../importers/thunderClient/thunderClient_1_2.variable_types";

function getDB(): loki {
  const idbAdapter = new LokiFsAdapter();
  const db = new loki(variableDBPath(), { adapter: idbAdapter });
  db.autosaveDisable();
  return db;
}

export function SaveVariable(item: IVariable, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userVariables = db.getCollection("userVariables");
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
      const sourceData = db.getCollection("userVariables").chain().find({ 'id': id }).data({ forceClones: true, removeMeta: true });
      if (sourceData && sourceData.length > 0) {
        let distData: IVariable = {
          id: uuidv4(),
          name: sourceData[0].name.toUpperCase().trim() === "GLOBAL" ? "Global - Copy" : sourceData[0].name + " - Copy",
          createdTime: formatDate(),
          isActive: true,
          data: sourceData[0].data
        };
        db.getCollection("userVariables").insert(distData);
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
      db.getCollection("userVariables").findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
      db.saveDatabase(function (err) {
        if (!err) {
          if (webview) {
            webview.postMessage({ type: responseTypes.updateVariableResponse });
          }

          if (pubSub.size > 0) {
            pubSub.publish({ messageType: pubSubTypes.updateVariables });
          }
        }
      });
    });

  } catch (err) {
    writeLog("error::SaveVariable(): " + err);
  }
}

export function UpdateVariableSync(item: IVariable) {
  try {
    return new Promise<IVariable>(async (resolve, _reject) => {
      const db = getDB();
      db.loadDatabase({}, function () {
        db.getCollection("userVariables").findAndUpdate({ 'id': item.id }, itm => { itm.data = item.data; });
        db.saveDatabase(function (err) {
          if (!err) {
            let vars = db.getCollection("userVariables").find({ 'id': item.id });
            resolve(vars && vars.length > 0 ? vars[0] as IVariable : null);
          }
        });
      });
    });
  } catch (err) {
    writeLog("error::UpdateVariableSync(): " + err);
  }
}

export function GetAllVariable(webview: vscode.Webview) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userVariables = db.getCollection("userVariables").data;
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
      let userVariables = db.getCollection("userVariables").find(isGlobal ? { 'name': 'Global' } : { 'id': id });
      webview.postMessage({ type: responseTypes.getVariableItemResponse, data: userVariables });
    });

  } catch (err) {
    writeLog("error::GetVariableById(): " + err);
  }
}

export function GetVariableByIdSync(id: string) {
  try {
    return new Promise<IVariable>(async (resolve, _reject) => {
      const db = getDB();
      db.loadDatabase({}, function () {
        let userVariables = db.getCollection("userVariables").find({ 'id': id });
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
      db.getCollection("userVariables").findAndRemove({ 'id': id });
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
      db.getCollection("userVariables").findAndUpdate({ 'id': id }, item => { item.name = name; });
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
      db.getCollection("userVariables").findAndUpdate({ 'id': id }, item => { item.isActive = status; });
      db.saveDatabase();
      webviewView.webview.postMessage({ type: responseTypes.activeVariableResponse, params: { id: id, status: status } });
    });

  } catch (err) {
    writeLog("error::ChangeVariableStatus(): " + err);
  }
}

export function ExportVariable(path: string, id: string) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      let vars = db.getCollection("userVariables").find({ 'id': id });
      if (vars && vars.length > 0) {
        let exportData = {
          app: "Fetch Client",
          id: vars[0].id,
          name: vars[0].name.toUpperCase().trim() === "GLOBAL" ? "Global Export" : vars[0].name,
          version: "1.0",
          type: "variables",
          createdTime: vars[0].createdTime,
          exportedDate: formatDate(),
          isActive: true,
          data: vars[0].data
        };

        fs.writeFile(path, JSON.stringify(exportData), (error) => {
          if (error) {
            vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message, { modal: true });
            writeLog("error::ExportVariable()::FileWrite()" + error.message);
          } else {
            vscode.window.showInformationMessage("Successfully saved to '" + path + "'.", { modal: true });
          }
        });
      }
    });

  } catch (err) {
    writeLog("error::ExportVariable(): " + err);
  }
}

function ValidateData(data: string): VariableImportType | null {
  try {
    if (!data || data.length === 0) {
      vscode.window.showErrorMessage("Could not import the variable - Empty Data.", { modal: true });
      writeLog("error::ImportVariable::ValidateData() " + "Error Message : Could not import the variable - Empty Data.");
      return null;
    }

    try {
      FetchClientVariableProxy.Parse(data);
      return VariableImportType.FetchClient_Variable_1_0;
    } catch (err) {
      let postmanData = JSON.parse(data) as PostmanVariableSchema_2_1;
      if (postmanData?._postman_variable_scope && postmanData?._postman_exported_using) {
        return VariableImportType.Postman_Variable_2_1;
      }

      let thunderClientData = JSON.parse(data) as ThunderClientVariableSchema_1_2;
      if (thunderClientData?.clientName === "Thunder Client" && thunderClientData?.ref) {
        if (thunderClientData?.version !== "1.2") {
          vscode.window.showErrorMessage("Could not import the variable - Invalid version.", { modal: true });
          return null;
        }
        return VariableImportType.ThunderClient_Variable_1_2;
      }

      return null;
    }
  }
  catch (err) {
    vscode.window.showErrorMessage("Could not import the variable - Invalid Data.", { modal: true });
    writeLog("error::ImportVariable::ValidateData() " + "Error Message : Could not import the variable - " + err);
    return null;
  }
}

export function ImportVariableFromJsonFile(webviewView: vscode.WebviewView, path: string) {
  try {
    const data = fs.readFileSync(path, "utf8");
    var type = ValidateData(data);
    switch (type) {
      case VariableImportType.FetchClient_Variable_1_0:
        ImportFetchClientVariable(webviewView, data);
        break;
      case VariableImportType.Postman_Variable_2_1:
        ImportPostmanVariable(webviewView, data);
        break;
      case VariableImportType.ThunderClient_Variable_1_2:
        ImportThunderClientVariable(webviewView, data);
        break;
      default:
        vscode.window.showErrorMessage("Could not import the collection - Invalid type.", { modal: true });
    }
  } catch (err) {
    vscode.window.showErrorMessage("Could not import the variable - Invalid data.", { modal: true });
    writeLog("error::ImportVariableFromJsonFile(): - Error Mesaage : " + err);
  }
}

function ImportFetchClientVariable(webviewView: vscode.WebviewView, data: string) {
  const parsedData = JSON.parse(data);
  let reqData = parsedData as IVariable;
  reqData.id = uuidv4();
  reqData.createdTime = formatDate();
  ImportVariable(webviewView, reqData);
}

function ImportPostmanVariable(webviewView: vscode.WebviewView, data: string) {
  const parsedData = JSON.parse(data) as PostmanVariableSchema_2_1;
  let varData: ITableData[] = [];

  if (!parsedData?._postman_exported_using?.includes("Postman/") || !parsedData?._postman_variable_scope?.includes("environment")) {
    writeLog("error::ImportPostmanVariable(): - Error Mesaage : Could not import the variable - Invalid data.");
    throw new Error("Could not import the variable - Invalid data.");
  }

  for (let i = 0; i < parsedData.values?.length; i++) {
    if (parsedData.values[i].key) {
      varData.push({
        isChecked: parsedData.values[i].enabled,
        key: parsedData.values[i].key,
        value: parsedData.values[i].value
      });
    }
  }

  let convertedData: IVariable = {
    id: uuidv4(),
    createdTime: formatDate(),
    name: parsedData.name,
    isActive: true,
    data: varData
  };

  ImportVariable(webviewView, convertedData);
}

function ImportThunderClientVariable(webviewView: vscode.WebviewView, data: string) {
  const parsedData = JSON.parse(data) as ThunderClientVariableSchema_1_2;

  let varData: ITableData[] = [];

  for (let i = 0; i < parsedData.variables?.length; i++) {
    if (parsedData.variables[i].name) {
      varData.push({
        isChecked: true,
        key: parsedData.variables[i].name,
        value: parsedData.variables[i].value
      });
    }
  }

  let convertedData: IVariable = {
    id: uuidv4(),
    createdTime: formatDate(),
    name: parsedData.environmentName,
    isActive: true,
    data: varData
  };

  ImportVariable(webviewView, convertedData);
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
    vscode.window.showErrorMessage("Could not import the variable - Invalid data.", { modal: true });
    writeLog("error::ImportVariableFromEnvFile(): - Error Mesaage : " + err);
  }
}

export function ImportVariable(webviewView: vscode.WebviewView, reqData: IVariable) {
  try {
    const db = getDB();

    db.loadDatabase({}, function () {
      const userVariables = db.getCollection("userVariables");
      userVariables.insert(reqData);
      db.saveDatabase();
      webviewView.webview.postMessage({ type: responseTypes.importVariableResponse, vars: reqData });
    });

  } catch (err) {
    vscode.window.showErrorMessage("Could not import the variable - Invalid data.", { modal: true });
    writeLog("error::ImportVariable(): - Error Mesaage : " + err);
  }
}