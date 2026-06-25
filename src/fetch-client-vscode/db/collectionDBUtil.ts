import {
	Col_Repository_CreateCollection, Col_Repository_AddToCollection, Col_Repository_DuplicateItem, Col_Repository_GetCollectionById,
	Col_Repository_NewRequestToCollection, Col_Repository_CopyToCollection, Col_Repository_GetAllCollectionNames, Col_Repository_GetAllCollections,
	Col_Repository_RenameCollectionItem, Col_Repository_DeleteCollectionItem, Col_Repository_RenameCollection, Col_Repository_UpdateCollectionItems,
	Col_Repository_DeleteCollection, Col_Repository_DeleteAllCollectionItems, Col_Repository_AttachVariable, Col_Repository_RemoveVariableByVariableId,
	Col_Repository_GetCollectionsByVariable, Col_Repository_RemoveVariable, Col_Repository_GetAllCollectionsById, Col_Repository_GetAllCollectionsByIdWithPath,
	Col_Repository_GetVariableByColId, Col_Repository_NewFolderToCollection, Col_Repository_UpdateCollection, Col_Repository_GetCollectionSettings,
	Col_Repository_GetParentSettings, Col_Repository_ExecuteRequest, Col_Repository_ExecuteMultipleRequests, Col_Repository_SaveCollectionSettings
} from '../../fetch-client-core/db/collectionDB.repository';
import { FetchConfig } from '../../fetch-client-core/utils/fetchUtil';
import { IFolder, IHistory, ICollections, ISettings } from '../../fetch-client-core/types/sidebar.types';
import { IRequestModel } from '../../fetch-client-core/types/request.types';
import { responseTypes } from '../../fetch-client-core/consts/requestTypes.consts';
import { SettingsType } from '../../fetch-client-ui/components/Collection/consts';
import { writeLog } from '../../fetch-client-core/helpers/logger/logger';
import * as vscode from 'vscode';

export async function CreateNewCollection(name: string, sideBarView: vscode.WebviewView): Promise<void> {
	try {
		const item = await Col_Repository_CreateCollection(name);
		sideBarView?.webview.postMessage({ type: responseTypes.appendToCollectionsResponse, collection: item });
	} catch (err) {
		writeLog("error::CreateNewCollection(): " + err);
	}
}

export async function AddToCollection(
	item: ICollections,
	hasFolder: boolean,
	isNewFolder: boolean,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView,
	request?: IRequestModel
): Promise<void> {
	try {
		const result = await Col_Repository_AddToCollection(item, hasFolder, isNewFolder, request);

		if (!result) {
			return;
		}

		const { newId, colItem } = result;

		webview?.postMessage({
			type: responseTypes.addToCollectionsResponse,
			colId: item.id,
			folderId: hasFolder ? item.data[0].id : "",
			historyId: newId,
			historyName: hasFolder
				? (item.data[0] as IFolder).data[0].name
				: item.data[0].name,
			varId: colItem?.variableId ?? "",
		});

		sideBarView?.webview.postMessage({
			type: responseTypes.appendToCollectionsResponse,
			collection: colItem ?? item,
		});
	} catch (err) {
		writeLog("error::AddToCollection(): " + err);
	}
}

export async function DuplicateItem(
	colId: string,
	folderId: string,
	historyId: string,
	folderType: boolean,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const result = await Col_Repository_DuplicateItem(colId, folderId, historyId, folderType);

		if (result === 'copy-collection') {
			await CopyToCollection(colId, require('uuid').v4(), `${(await Col_Repository_GetCollectionById(colId, ""))?.name} (Copy)`, null, sideBarView);
			return;
		}

		const { col } = result;
		sideBarView?.webview.postMessage({
			type: responseTypes.copyToCollectionsResponse,
			data: col,
		});
	} catch (err) {
		writeLog("error::DuplicateItem(): " + err);
	}
}

export async function NewRequestToCollection(
	item: IHistory,
	colId: string,
	folderId: string,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const { variableId } = await Col_Repository_NewRequestToCollection(item, colId, folderId);

		sideBarView?.webview.postMessage({
			type: responseTypes.createNewResponse,
			item,
			id: colId,
			folderId,
			variableId,
		});
	} catch (err) {
		writeLog("error::NewRequestToCollection(): " + err);
	}
}

export async function CopyToCollection(
	sourceId: string,
	destId: string,
	destName: string,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const resultCol = await Col_Repository_CopyToCollection(sourceId, destId, destName);

		webview?.postMessage({ type: responseTypes.copyToCollectionsResponse });
		sideBarView?.webview.postMessage({
			type: responseTypes.copyToCollectionsResponse,
			data: resultCol,
		});
	} catch (err) {
		writeLog("error::CopyToCollection(): " + err);
	}
}

export async function GetAllCollectionName(webview: vscode.Webview, from: string): Promise<void> {
	try {
		const result = await Col_Repository_GetAllCollectionNames();

		if (!result) {
			return;
		}

		const msgType =
			from === "addtocol"
				? responseTypes.getAllCollectionNameResponse
				: responseTypes.getAllCollectionNamesResponse;

		webview?.postMessage({ type: msgType, collectionNames: result.collections, folderNames: result.folders });
	} catch (err) {
		writeLog("error::GetAllCollectionName(): " + err);
	}
}

export async function GetAllCollections(webview: vscode.Webview): Promise<void> {
	try {
		const userCollections = await Col_Repository_GetAllCollections();
		webview?.postMessage({ type: responseTypes.getAllCollectionsResponse, collections: userCollections });
	} catch (err) {
		writeLog("error::GetAllCollections(): " + err);
	}
}

export async function RenameCollectionItem(
	webviewView: vscode.WebviewView,
	colId: string,
	historyId: string,
	folderId: string,
	folderType: boolean,
	name: string
): Promise<void> {
	try {
		await Col_Repository_RenameCollectionItem(colId, historyId, folderId, folderType, name);

		webviewView?.webview.postMessage({
			type: responseTypes.renameCollectionItemResponse,
			params: { colId, historyId, folderId, isFolder: folderType, name },
		});
	} catch (err) {
		writeLog("error::RenameCollectionItem(): " + err);
	}
}

export async function DeleteCollectionItem(
	webviewView: vscode.WebviewView,
	colId: string,
	folderId: string,
	historyId: string,
	folderType: boolean
): Promise<void> {
	try {
		await Col_Repository_DeleteCollectionItem(colId, folderId, historyId, folderType);

		webviewView?.webview.postMessage({
			type: responseTypes.deleteCollectionItemResponse,
			params: { colId, folderId, historyId, isFolder: folderType },
		});
	} catch (err) {
		writeLog("error::DeleteCollectionItem(): " + err);
	}
}

export async function RenameCollection(
	webviewView: vscode.WebviewView,
	colId: string,
	name: string
): Promise<void> {
	try {
		await Col_Repository_RenameCollection(colId, name);

		webviewView?.webview.postMessage({
			type: responseTypes.renameCollectionResponse,
			params: { id: colId, name },
		});
	} catch (err) {
		writeLog("error::RenameCollection(): " + err);
	}
}

export async function UpdateCollectionItems(
	colId: string,
	folderId: string,
	items: ICollections | IFolder
): Promise<void> {
	try {
		await Col_Repository_UpdateCollectionItems(colId, folderId, items);
	} catch (err) {
		writeLog("error::UpdateCollectionItems(): " + err);
	}
}

export async function DeleteCollection(
	webviewView: vscode.WebviewView,
	colId: string
): Promise<void> {
	try {
		await Col_Repository_DeleteCollection(colId);
		webviewView?.webview.postMessage({ type: responseTypes.deleteCollectionResponse, id: colId });
	} catch (err) {
		writeLog("error::DeleteCollection(): " + err);
	}
}

export async function DeleteAllCollectionItems(
	webviewView: vscode.WebviewView,
	colId: string,
	folderId: string
): Promise<void> {
	try {
		await Col_Repository_DeleteAllCollectionItems(colId, folderId);

		webviewView?.webview.postMessage({
			type: responseTypes.clearResponse,
			id: colId,
			folderId,
		});
	} catch (err) {
		writeLog("error::DeleteAllCollectionItems(): " + err);
	}
}

export async function AttachVariable(
	colId: string,
	varId: string,
	webview: vscode.Webview,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		await Col_Repository_AttachVariable(colId, varId);

		webview?.postMessage({ type: responseTypes.attachVariableResponse });
		sideBarView?.webview.postMessage({
			type: responseTypes.attachVariableResponse,
			params: { id: colId, varId },
		});
	} catch (err) {
		writeLog("error::AttachVariable(): " + err);
	}
}

export async function RemoveVariableByVariableId(
	varId: string,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		const userCollections = await Col_Repository_RemoveVariableByVariableId(varId);

		if (sideBarView) {
			sideBarView.webview.postMessage({
				type: responseTypes.getAllCollectionsResponse,
				collections: userCollections,
			});
		}
	} catch (err) {
		writeLog("error::RemoveVariableByVariableId(): " + err);
	}
}

export async function GetCollectionsByVariable(varId: string, webview: vscode.Webview): Promise<void> {
	try {
		const colNames = await Col_Repository_GetCollectionsByVariable(varId);
		webview?.postMessage({ type: responseTypes.getAttachedColIdsResponse, colNames });
	} catch (err) {
		writeLog("error::GetCollectionsByVariable(): " + err);
	}
}

export async function RemoveVariable(varId: string): Promise<void> {
	try {
		await Col_Repository_RemoveVariable(varId);
	} catch (err) {
		writeLog("error::RemoveVariable(): " + err);
	}
}

export async function GetCollectionById(
	colId: string,
	folderId: string,
	webview: vscode.Webview
): Promise<void> {
	try {
		const items = await Col_Repository_GetCollectionById(colId, folderId);
		webview?.postMessage({ type: responseTypes.getCollectionDetailsByIdResponse, items });
	} catch (err) {
		writeLog("error::GetCollectionById(): " + err);
	}
}

export async function GetAllCollectionsById(
	colId: string,
	folderId: string,
	type: string,
	webview: vscode.Webview
): Promise<void> {
	try {
		const { requests, paths, settings } = await Col_Repository_GetAllCollectionsById(colId, folderId, type);
		webview?.postMessage({ type: responseTypes.getCollectionsByIdResponse, collections: requests, paths: paths });
		webview?.postMessage({ type: responseTypes.getParentSettingsResponse, settings });
	} catch (err) {
		writeLog("error::GetAllCollectionsById(): " + err);
	}
}

export async function GetAllCollectionsByIdWithPath(colId: string, webview: vscode.Webview): Promise<void> {
	try {
		const paths = await Col_Repository_GetAllCollectionsByIdWithPath(colId);

		webview?.postMessage({
			type: responseTypes.getCollectionsByIdWithPathResponse,
			colId,
			paths,
		});
	} catch (err) {
		writeLog("error::GetAllCollectionsByIdWithPath(): " + err);
	}
}

export async function GetVariableByColId(colId: string): Promise<string> {
	try {
		return await Col_Repository_GetVariableByColId(colId);
	} catch (err) {
		writeLog("error::GetVariableByColId(): " + err);
		throw err;
	}
}

export async function NewFolderToCollection(
	item: IFolder,
	colId: string,
	folderId: string,
	sideBarView: vscode.WebviewView
): Promise<void> {
	try {
		await Col_Repository_NewFolderToCollection(item, colId, folderId);

		sideBarView?.webview.postMessage({
			type: responseTypes.createNewFolderResponse,
			folder: item,
			colId,
			folderId,
		});
	} catch (err) {
		writeLog("error::NewFolderToCollection(): " + err);
	}
}

export async function UpdateCollection(colId: string, item: IHistory): Promise<void> {
	try {
		await Col_Repository_UpdateCollection(colId, item);
	} catch (err) {
		writeLog("error::UpdateCollection(): " + err);
	}
}

export async function GetCollectionSettings(
	webview: vscode.Webview,
	colId: string,
	folderId: string
): Promise<void> {
	try {
		const result = await Col_Repository_GetCollectionSettings(colId, folderId);

		if (!result) {
			return;
		}

		webview?.postMessage({
			type: responseTypes.getColSettingsResponse,
			data: {
				settings: result.settings,
				type: folderId ? SettingsType.Folder : SettingsType.Collection,
				variableId: result.variableId,
			},
		});
	} catch (err) {
		writeLog("error::GetCollectionSettings(): " + err);
	}
}

export async function GetParentSettings(
	colId: string,
	folderId: string,
	webview: vscode.Webview
): Promise<void> {
	try {
		const settings = await Col_Repository_GetParentSettings(colId, folderId);

		if (settings === null) {
			return;
		}

		webview?.postMessage({ type: responseTypes.getParentSettingsResponse, settings });
	} catch (err) {
		writeLog("error::GetParentSettings(): " + err);
	}
}

export async function GetParentSettingsSync(colId: string, folderId: string): Promise<ISettings | null> {
	try {
		return await Col_Repository_GetParentSettings(colId, folderId);
	} catch (err) {
		writeLog("error::GetParentSettingsSync(): " + err);
		throw err;
	}
}

export async function ExecuteRequest(
	reqData: any,
	fetchConfig: FetchConfig,
	webview: vscode.Webview
): Promise<void> {
	try {
		const result = await Col_Repository_ExecuteRequest(reqData, fetchConfig);

		if (result) {
			webview?.postMessage(result);
		}
	} catch (err) {
		writeLog("error::ExecuteRequest(): " + err);
	}
}

export async function ExecuteMultipleRequest(
	reqData: any,
	fetchConfig: FetchConfig,
	webview: vscode.Webview
): Promise<void> {
	try {
		const values = await Col_Repository_ExecuteMultipleRequests(reqData, fetchConfig);
		webview?.postMessage({ type: responseTypes.multipleApiResponse, output: values });
	} catch (err) {
		writeLog("error::ExecuteMultipleRequest(): " + err);
	}
}

export async function SaveCollectionSettings(
	webview: vscode.Webview,
	colId: string,
	folderId: string,
	settings: ISettings
): Promise<void> {
	try {
		await Col_Repository_SaveCollectionSettings(colId, folderId, settings);
		webview?.postMessage({ type: responseTypes.saveColSettingsResponse, colId, folderId });
	} catch (err) {
		writeLog("error::SaveCollectionSettings(): " + err);
	}
}
