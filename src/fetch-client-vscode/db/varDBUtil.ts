import { FCCipher } from "../../fetch-client-packages/crypto/index";
import { FetchClientVariableProxy } from '../../fetch-client-core/helpers/validators/fetchClientVariableValidator';
import { formatDate } from '../../fetch-client-core/helpers/helper';
import { getVariableEncryptionConfiguration, getVariableEncryptionKey } from "../../fetch-client-core/utils/vscodeConfig";
import { ITableData } from "../../fetch-client-core/types/common.types";
import { IVariable } from "../../fetch-client-core/types/sidebar.types";
import { PostmanVariableSchema_2_1 } from '../../fetch-client-core/types/postman_2_1.variable_types';
import { pubSub } from '../../extension';
import { pubSubTypes, responseTypes } from '../../fetch-client-core/consts/requestTypes.consts';
import { RemoveVariable } from './collectionDBUtil';
import { ThunderClientVariableSchema_1_2 } from "../../fetch-client-core/types/thunderClient_1_2.variable_types";
import { v4 as uuidv4 } from 'uuid';
import { VariableImportType } from "../../fetch-client-core/consts/import.consts";
import { writeLog } from '../../fetch-client-core/helpers/logger/logger';
import * as vscode from 'vscode';
import fs from "fs";
import {
	Var_Repository_Insert, Var_Repository_InsertDuplicate, Var_Repository_Update, Var_Repository_UpdateAndReturn,
	Var_Repository_FindAll, Var_Repository_UpdateAllWithReEncryption, Var_Repository_EncryptAll, Var_Repository_DecryptAll,
	Var_Repository_FindById, Var_Repository_FindByIdSync, Var_Repository_Delete, Var_Repository_Rename, Var_Repository_UpdateStatus,
	Var_Repository_FindByIdRaw, Var_Repository_InsertRaw
} from "../../fetch-client-core/db/variableDB.repository";


export async function SaveVariable(item: IVariable, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
	try {
		await Var_Repository_Insert(item);

		if (webview) {
			webview.postMessage({ type: responseTypes.saveVariableResponse });
		}

		if (sideBarView) {
			sideBarView.webview.postMessage({ type: responseTypes.appendToVariableResponse, collection: item });
		}

		if (pubSub.size > 0) {
			pubSub.publish({ messageType: pubSubTypes.updateVariables });
		}
	} catch (err) {
		writeLog("error::SaveVariable(): " + err);
	}
}

export async function DuplicateVariable(id: string, webview: vscode.Webview, sideBarView: vscode.WebviewView) {
	try {
		const distData = await Var_Repository_InsertDuplicate(id);

		if (distData) {
			if (webview) {
				webview.postMessage({ type: responseTypes.saveVariableResponse });
			}

			if (sideBarView) {
				sideBarView.webview.postMessage({ type: responseTypes.appendToVariableResponse, collection: distData });
			}
		}
	} catch (err) {
		writeLog("error::DuplicateVariable(): " + err);
	}
}

export async function UpdateVariable(item: IVariable, webview: vscode.Webview) {
	try {
		await Var_Repository_Update(item);

		if (webview) {
			webview.postMessage({ type: responseTypes.updateVariableResponse });
		}

		if (pubSub.size > 0) {
			pubSub.publish({ messageType: pubSubTypes.updateVariables });
		}
	} catch (err) {
		writeLog("error::UpdateVariable(): " + err);
	}
}

export function UpdateVariableSync(item: IVariable) {
	try {
		return new Promise<IVariable>(async (resolve, _reject) => {
			const result = await Var_Repository_UpdateAndReturn(item);
			resolve(result);
		});
	} catch (err) {
		writeLog("error::UpdateVariableSync(): " + err);
		throw err;
	}
}

export async function GetAllVariable(webview: vscode.Webview) {
	try {
		const userVariables = await Var_Repository_FindAll();
		webview?.postMessage({ type: responseTypes.getAllVariableResponse, variable: userVariables });
	} catch (err) {
		writeLog("error::GetAllVariable(): " + err);
	}
}

export async function UpdateWithAnotherKey(oldKey: string, newKey: string) {
	try {
		await Var_Repository_UpdateAllWithReEncryption(oldKey, newKey);
	} catch (err) {
		writeLog("error::UpdateWithAnotherKey(): " + err);
		throw err;
	}
}

export async function UpdateToEncryptedVariables(key: string) {
	try {
		await Var_Repository_EncryptAll(key);
	} catch (err) {
		writeLog("error::UpdateToEncryptedVariables(): " + err);
	}
}

export async function UpdateToDecryptedVariables(key: string) {
	try {
		await Var_Repository_DecryptAll(key);
	} catch (err) {
		writeLog("error::UpdateToDecryptedVariables(): " + err);
	}
}

export async function GetVariableById(id: string, isGlobal: boolean, webview: vscode.Webview) {
	try {
		const userVariables = await Var_Repository_FindById(id, isGlobal);
		webview.postMessage({ type: responseTypes.getVariableItemResponse, data: userVariables });
	} catch (err) {
		writeLog("error::GetVariableById(): " + err);
	}
}

export function GetVariableByIdSync(id: string) {
	try {
		return new Promise<IVariable>(async (resolve, _reject) => {
			const result = await Var_Repository_FindByIdSync(id);
			resolve(result);
		});
	} catch (err) {
		writeLog("error::GetVariableByIdSync(): " + err);
		throw err;
	}
}

export async function DeleteVariable(webviewView: vscode.WebviewView, id: string) {
	try {
		await Var_Repository_Delete(id);
		RemoveVariable(id);
		webviewView.webview.postMessage({ type: responseTypes.deleteVariableResponse, id: id });
		if (pubSub.size > 0) {
			pubSub.publish({ messageType: pubSubTypes.updateVariables });
		}
	} catch (err) {
		writeLog("error::DeleteVariable(): " + err);
	}
}

export async function RenameVariable(webviewView: vscode.WebviewView, id: string, name: string) {
	try {
		await Var_Repository_Rename(id, name);
		webviewView.webview.postMessage({ type: responseTypes.renameVariableResponse, params: { id: id, name: name } });
		if (pubSub.size > 0) {
			pubSub.publish({ messageType: pubSubTypes.updateVariables });
		}
	} catch (err) {
		writeLog("error::RenameVariable(): " + err);
	}
}

export async function ChangeVariableStatus(id: string, status: boolean, webviewView: vscode.WebviewView) {
	try {
		await Var_Repository_UpdateStatus(id, status);
		webviewView.webview.postMessage({ type: responseTypes.activeVariableResponse, params: { id: id, status: status } });
	} catch (err) {
		writeLog("error::ChangeVariableStatus(): " + err);
	}
}

export async function BulkExportVariables(path: string, selectedVars: string[], exportKey: string, webview: vscode.Webview) {
	try {
		selectedVars?.forEach(async (item: string) => {
			let vars = await Var_Repository_FindByIdRaw(item);
			if (vars?.length > 0) {
				let exportData = FormatExportedVariables(vars, exportKey);
				let fullPath = path + "\\" + "fetch-client-variable_" + exportData.name.replace(/[/\\?%*:|"<>]/g, '-') + ".json";
				fs.writeFile(fullPath, JSON.stringify(exportData), (error) => {
					if (error) {
						vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message, { modal: true });
						writeLog("error::BulkExport()::FileWrite()" + error.message);
					}
				});
			}
		});

		webview?.postMessage({ type: responseTypes.bulkColExportResponse });
	} catch (err) {
		writeLog("error::BulkExport(): " + err);
	}
}

export async function ExportVariable(path: string, id: string, exportKey: string) {
	try {
		let vars = await Var_Repository_FindByIdRaw(id);
		if (vars && vars.length > 0) {
			let exportData = FormatExportedVariables(vars, exportKey);
			fs.writeFile(path, JSON.stringify(exportData), (error) => {
				if (error) {
					vscode.window.showErrorMessage("Could not save to '" + path + "'. Error Message : " + error.message, { modal: true });
					writeLog("error::ExportVariable()::FileWrite()" + error.message);
				} else {
					vscode.window.showInformationMessage("Successfully saved to '" + path + "'.", { modal: true });
				}
			});
		}
	} catch (err) {
		writeLog("error::ExportVariable(): " + err);
	}
}

function FormatExportedVariables(vars: any[], exportKey: string) {
	let exportData = {
		app: "Fetch Client",
		id: vars[0].id,
		name: vars[0].name.toUpperCase().trim() === "GLOBAL" ? "Global Export" : vars[0].name,
		version: "1.0",
		type: "variables",
		createdTime: vars[0].createdTime,
		exportedDate: formatDate(),
		isActive: true,
		secretVariables: false,
		data: vars[0].data,
	};

	const config = getVariableEncryptionConfiguration();
	if (config) {
		let key = getVariableEncryptionKey();
		const fcCryptoDecrypt = new FCCipher(key);
		exportData.data.forEach((item: ITableData) => {
			item.value = fcCryptoDecrypt.DecryptData(item.value);
		});
	}

	if (exportKey) {
		const fcCryptoEncrypt = new FCCipher(exportKey);
		exportData.data.forEach((item: ITableData) => {
			item.value = fcCryptoEncrypt.EncryptData(item.value);
		});
		exportData.secretVariables = true;
	}

	return exportData;
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
	} catch (err) {
		vscode.window.showErrorMessage("Could not import the variable - Invalid Data.", { modal: true });
		writeLog("error::ImportVariable::ValidateData() " + "Error Message : Could not import the variable - " + err);
		return null;
	}
}

export function ImportVariableFromJsonFile(webviewView: vscode.WebviewView, path: string, decryptKey: string) {
	try {
		const data = fs.readFileSync(path, "utf8");
		var type = ValidateData(data);
		switch (type) {
			case VariableImportType.FetchClient_Variable_1_0:
				ImportFetchClientVariable(webviewView, data, decryptKey);
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

function ImportFetchClientVariable(webviewView: vscode.WebviewView, data: string, decryptKey: string) {
	const parsedData = JSON.parse(data);
	let secretVariables = parsedData.secretVariables;
	let encryptVariableConfiguration = getVariableEncryptionConfiguration();
	let reqData: IVariable = {
		id: uuidv4(),
		createdTime: formatDate(),
		name: parsedData.name,
		isActive: parsedData.isActive,
		data: parsedData.data
	};

	let fcCryptoEncrypt: FCCipher;

	if (encryptVariableConfiguration) {
		let key = getVariableEncryptionKey();
		fcCryptoEncrypt = new FCCipher(key);
	}

	reqData.data.forEach((item) => {
		if (secretVariables) {
			let fcCryptoDecrypt = new FCCipher(decryptKey);
			item.value = fcCryptoDecrypt.DecryptData(item.value);
		}
		if (encryptVariableConfiguration) {
			item.value = fcCryptoEncrypt.EncryptData(item.value);
		}
	});

	ImportVariable(webviewView, reqData);
}

function ImportPostmanVariable(webviewView: vscode.WebviewView, data: string) {
	const parsedData = JSON.parse(data) as PostmanVariableSchema_2_1;
	let varData: ITableData[] = [];

	if (!parsedData?._postman_exported_using?.includes("Postman/") || !parsedData?._postman_variable_scope?.includes("environment")) {
		writeLog("error::ImportPostmanVariable(): - Error Mesaage : Could not import the variable - Invalid data.");
		throw new Error("Could not import the variable - Invalid data.");
	}

	let encryptVariableConfiguration = getVariableEncryptionConfiguration();
	let fcCrypto: FCCipher;

	if (encryptVariableConfiguration) {
		let key = getVariableEncryptionKey();
		fcCrypto = new FCCipher(key);
	}

	for (let i = 0; i < parsedData.values?.length; i++) {
		if (parsedData.values[i].key) {
			varData.push({
				isChecked: parsedData.values[i].enabled,
				key: parsedData.values[i].key,
				value: encryptVariableConfiguration ? fcCrypto.EncryptData(parsedData.values[i].value) : parsedData.values[i].value
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

	let encryptVariableConfiguration = getVariableEncryptionConfiguration();

	let key = getVariableEncryptionKey();
	let fcCrypto = new FCCipher(key);

	for (let i = 0; i < parsedData.variables?.length; i++) {
		if (parsedData.variables[i].name) {
			varData.push({
				isChecked: true,
				key: parsedData.variables[i].name,
				value: encryptVariableConfiguration ? fcCrypto.EncryptData(parsedData.variables[i].value) : parsedData.variables[i].value
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

		let encryptVariableConfiguration = getVariableEncryptionConfiguration();
		let fcCrypto: FCCipher;

		if (encryptVariableConfiguration) {
			let key = getVariableEncryptionKey();
			fcCrypto = new FCCipher(key);
		}

		for (let l in data) {
			let line = data[l].trim();
			if (line.indexOf("=") > -1) {
				reqData.data.push({
					isChecked: true,
					key: line.substring(0, line.indexOf("=")).trim(),
					value: encryptVariableConfiguration ? fcCrypto.EncryptData(line.substring(line.indexOf("=") + 1).trim()) : line.substring(line.indexOf("=") + 1).trim()
				});
			}
		}

		ImportVariable(webviewView, reqData);
	} catch (err) {
		vscode.window.showErrorMessage("Could not import the variable - Invalid data.", { modal: true });
		writeLog("error::ImportVariableFromEnvFile(): - Error Mesaage : " + err);
	}
}

export async function ImportVariable(webviewView: vscode.WebviewView, reqData: IVariable) {
	try {
		await Var_Repository_InsertRaw(reqData);
		webviewView.webview.postMessage({ type: responseTypes.importVariableResponse, vars: reqData });
	} catch (err) {
		vscode.window.showErrorMessage("Could not import the variable - Invalid data.", { modal: true });
		writeLog("error::ImportVariable(): - Error Mesaage : " + err);
	}
}
