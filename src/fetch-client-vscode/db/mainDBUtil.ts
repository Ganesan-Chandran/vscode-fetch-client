import { IRequestModel } from '../../fetch-client-core/types/request.types';
import {
	ExportPayload,
	Main_Repository_BuildBulkExport, Main_Repository_BuildBulkExportV2, Main_Repository_BuildExport, Main_Repository_BuildExport_V2, Main_Repository_CopyExistingItems,
	Main_Repository_DeleteExistingItem, Main_Repository_DeleteExistingItems,
	Main_Repository_GetCollectionRequests, Main_Repository_GetExistingItem,
	Main_Repository_GetRequestItem, Main_Repository_Import,
	Main_Repository_RenameRequestItem, Main_Repository_SaveRequest,
	Main_Repository_UpdateRequest
} from '../../fetch-client-core/db/mainDB.repository';
import { responseTypes } from '../../fetch-client-core/consts/requestTypes.consts';
import { writeLog } from '../../fetch-client-core/helpers/logger/logger';
import * as vscode from "vscode";
import fs from "fs";
import { IFetchClientExportV2 } from '../../fetch-client-core/types/fetchClient_2_0_types';

export async function SaveRequest(reqData: IRequestModel): Promise<void> {
	try {
		await Main_Repository_SaveRequest(reqData);
	} catch (err) {
		writeLog("error::SaveRequest(): " + err);
	}
}

export async function UpdateRequest(reqData: IRequestModel): Promise<void> {
	try {
		await Main_Repository_UpdateRequest(reqData);
	} catch (err) {
		writeLog("error::UpdateRequest(): " + err);
		throw err;
	}
}

export async function GetRequestItem(reqId: string): Promise<IRequestModel | null> {
	try {
		const results = await Main_Repository_GetRequestItem(reqId);
		return results;
	} catch (err) {
		writeLog("error::GetRequestItem(): " + err);
		throw err;
	}
}

export async function GetExitingItem(webview: vscode.Webview, id: string, callback?: (results: IRequestModel[]) => void, type?: string): Promise<void> {
	try {
		const results = await Main_Repository_GetExistingItem(id);
		const msgType =
			type === "OpenAndRun"
				? responseTypes.getOpenAndRunItemDataResponse
				: responseTypes.openExistingItemResponse;
		webview?.postMessage({ type: msgType, item: results });
		callback?.(results);
	} catch (err) {
		writeLog("error::GetExitingItem(): " + err);
	}
}

export async function CopyExitingItems(oldIds: string[], ids: Record<string, string>): Promise<void> {
	try {
		await Main_Repository_CopyExistingItems(oldIds, ids);
	} catch (err) {
		writeLog("error::CopyExitingItems(): " + err);
	}
}

export async function DeleteExitingItem(id: string): Promise<void> {
	try {
		await Main_Repository_DeleteExistingItem(id);
	} catch (err) {
		writeLog("error::DeleteExitingItem(): " + err);
	}
}

export async function DeleteExitingItems(ids: string[]): Promise<void> {
	try {
		await Main_Repository_DeleteExistingItems(ids);
	} catch (err) {
		writeLog("error::DeleteExitingItems(): " + err);
	}
}

export async function RenameRequestItem(id: string, name: string): Promise<void> {
	try {
		await Main_Repository_RenameRequestItem(id, name);
	} catch (err) {
		writeLog("error::RenameRequestItem(): " + err);
	}
}

export async function GetColsRequests(ids: string[], paths: unknown, webview: vscode.Webview): Promise<void> {
	try {
		const apiRequests = await Main_Repository_GetCollectionRequests(ids);
		webview?.postMessage({ type: responseTypes.getCollectionsByIdResponse, collections: apiRequests, paths, });
	} catch (err) {
		writeLog("error::GetColsRequests(): " + err);
	}
}

export async function Export(path: string, colId: string, hisId: string, folderId: string, version: number): Promise<void> {

	try {
		const exportData = version === 1 ? await Main_Repository_BuildExport(colId, hisId, folderId) : await Main_Repository_BuildExport_V2(colId, hisId, folderId);
		fs.writeFile(
			path,
			version === 1 ? JSON.stringify(exportData) : JSON.stringify(exportData, null, "\t"),
			(error) => {
				if (error) {
					vscode.window.showErrorMessage(`Could not save to '${path}'. Error Message : ${error.message}`, { modal: true });
					writeLog("error::Export()::FileWrite() " + error.message);
				}
				else {
					vscode.window.showInformationMessage(`Successfully saved to '${path}'.`, { modal: true });
				}
			}
		);
	} catch (err) {
		writeLog("error::Export(): " + err);
		vscode.window.showErrorMessage("Export failed.", { modal: true });
	}
}

export async function BulkExportV2(path: string, selectedCols: string[], webview: vscode.Webview): Promise<void> {
	if (!selectedCols?.length) {
		webview?.postMessage({ type: responseTypes.bulkColExportResponse });
		return;
	}

	try {
		const exportPayloads = await Main_Repository_BuildBulkExportV2(selectedCols);
		const writePromises = exportPayloads.map((exportData) => {
			return exportIntoFile(path, exportData, 2);
		});
		await Promise.all(writePromises);
		webview?.postMessage({ type: responseTypes.bulkColExportResponse });
	} catch (err) {
		writeLog("error::BulkExport(): " + err);
		vscode.window.showErrorMessage("Bulk export failed.", { modal: true });
	}
}

export async function BulkExport(path: string, selectedCols: string[], webview: vscode.Webview): Promise<void> {
	if (!selectedCols?.length) {
		webview?.postMessage({ type: responseTypes.bulkColExportResponse });
		return;
	}

	try {
		const exportPayloads = await Main_Repository_BuildBulkExport(selectedCols);
		const writePromises = exportPayloads.map((exportData) => {
			return exportIntoFile(path, exportData, 1);
		});

		await Promise.all(writePromises);
		webview?.postMessage({ type: responseTypes.bulkColExportResponse });
	} catch (err) {
		writeLog("error::BulkExport(): " + err);
		vscode.window.showErrorMessage("Bulk export failed.", { modal: true });
	}
}

async function exportIntoFile(path: string, exportData: ExportPayload | IFetchClientExportV2, version: number): Promise<void> {
	const name = "name" in exportData ? exportData.name : exportData.metadata.name;
	const safeName = name.replace(/[/\\?%*:|"<>]/g, "-");
	const fullPath = `${path}\\fetch-client-collection_${safeName}.json`;

	return new Promise<void>((resolve) => {
		fs.writeFile(
			fullPath,
			version === 1 ? JSON.stringify(exportData) : JSON.stringify(exportData, null, "\t"),
			(error) => {

				if (error) {
					vscode.window.showErrorMessage(
						`Could not save to '${fullPath}'. Error Message : ${error.message}`,
						{ modal: true }
					);

					writeLog(
						"error::BulkExport()::FileWrite() " +
						error.message
					);
				}

				resolve();
			}
		);
	});
}

export async function Import(webviewView: vscode.WebviewView, path: string): Promise<void> {
	try {
		const data = fs.readFileSync(path, "utf8");
		const result = await Main_Repository_Import(data);

		webviewView?.webview?.postMessage({
			type: responseTypes.importResponse,
			data: result.fcCollection
		});

		if (result.fcVariable) {
			webviewView?.webview?.postMessage({
				type: responseTypes.importVariableResponse,
				vars: result.fcVariable
			});
		}
	} catch (err) {
		vscode.window.showErrorMessage("Could not import the collection - Invalid data.", { modal: true });
		writeLog("error::Import() - " + err);
	}
}
