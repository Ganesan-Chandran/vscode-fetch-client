import {
	DeleteExitingItem,
	DeleteExitingItems,
	RenameRequestItem,
} from "./mainDBUtil";
import { getHistoryLimitConfiguration } from "../../fetch-client-core/utils/vscodeConfig";
import {
	History_Repository_DeleteAllHistory,
	History_Repository_DeleteHistory,
	History_Repository_GetAllHistory,
	History_Repository_GetHistoryById,
	History_Repository_InsertHistory,
	History_Repository_RenameHistory,
	History_Repository_UpdateHistory,
} from "../../fetch-client-core/db/history.repository";
import { IHistory } from "../../fetch-client-core/types/sidebar.types";
import { responseTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";

export async function SaveHistory(
	item: IHistory,
	webviewView: vscode.WebviewView,
) {
	try {
		await History_Repository_InsertHistory(item);

		webviewView.webview.postMessage({
			type: responseTypes.newHistoryResponse,
			history: item,
		});
	} catch (err) {
		writeLog("error::SaveHistory(): " + err);
	}
}

export async function UpdateHistory(item: IHistory) {
	try {
		await History_Repository_UpdateHistory(item);
	} catch (err) {
		writeLog("error::UpdateHistory(): " + err);
	}
}

export async function GetHistoryById(id: string, webview: vscode.Webview) {
	try {
		const history = await History_Repository_GetHistoryById(id);

		webview.postMessage({
			type: responseTypes.getHistoryItemResponse,
			history,
		});
	} catch (err) {
		writeLog("error::GetHistoryById(): " + err);
	}
}

export async function GetAllHistory(webviewView: vscode.WebviewView) {
	try {
		const history = await History_Repository_GetAllHistory();

		let result: IHistory[] = [];

		const limit = getHistoryLimitConfiguration();

		switch (limit) {
			case "All":
				result = [...history].reverse();
				break;

			default: {
				const intLimit = parseInt(limit);

				result =
					history.length > intLimit
						? history.slice(history.length - intLimit).reverse()
						: [...history].reverse();

				break;
			}
		}

		webviewView.webview.postMessage({
			type: responseTypes.getAllHistoryResponse,
			history: result,
		});
	} catch (err) {
		writeLog("error::GetAllHistory(): " + err);
	}
}

export async function DeleteAllHistory(webviewView: vscode.WebviewView) {
	try {
		const ids = await History_Repository_DeleteAllHistory();

		DeleteExitingItems(ids);

		webviewView.webview.postMessage({
			type: responseTypes.deleteAllHistoryResponse,
		});
	} catch (err) {
		writeLog("error::DeleteAllHistory(): " + err);
	}
}

export async function DeleteHistory(
	webviewView: vscode.WebviewView,
	id: string,
) {
	try {
		await History_Repository_DeleteHistory(id);

		DeleteExitingItem(id);

		webviewView.webview.postMessage({
			type: responseTypes.deleteHistoryResponse,
			id,
		});
	} catch (err) {
		writeLog("error::DeleteHistory(): " + err);
	}
}

export async function RenameHistory(
	webviewView: vscode.WebviewView,
	id: string,
	name: string,
) {
	try {
		const updated = await History_Repository_RenameHistory(id, name);

		if (!updated) {
			return;
		}

		RenameRequestItem(id, name);

		webviewView.webview.postMessage({
			type: responseTypes.renameHistoryResponse,
			params: {
				id,
				name,
			},
		});
	} catch (err) {
		writeLog("error::RenameHistory(): " + err);
	}
}
