import {
	Cookie_Repository_SaveCookie,
	Cookie_Repository_GetAllCookies,
	Cookie_Repository_GetCookieById,
	Cookie_Repository_DeleteCookieById,
	Cookie_Repository_DeleteAllCookies,
} from "../../fetch-client-core/db/cookie.repository";
import { ICookie } from "../../fetch-client-core/types/cookie.types";
import { responseTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { ShowInformationDialog } from "../webviews/helper";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";

export async function SaveCookie(item: ICookie, webview: vscode.Webview) {
	try {
		await Cookie_Repository_SaveCookie(item);

		if (webview) {
			webview.postMessage({
				type: responseTypes.saveCookieResponse,
			});
		}
	} catch (err) {
		writeLog("error::SaveCookie(): " + err);
	}
}

export async function GetAllCookies(webview: vscode.Webview) {
	try {
		const cookies = await Cookie_Repository_GetAllCookies();

		webview.postMessage({
			type: responseTypes.getAllCookiesResponse,
			cookies,
		});
	} catch (err) {
		writeLog("error::GetAllCookies(): " + err);
	}
}

export async function GetCookieById(id: string, webview: vscode.Webview) {
	try {
		const data = await Cookie_Repository_GetCookieById(id);

		if (webview) {
			webview.postMessage({
				type: responseTypes.getCookiesByIdResponse,
				data,
			});
		}
	} catch (err) {
		writeLog("error::GetCookieById(): " + err);
	}
}

export async function DeleteCookieById(id: string, webview: vscode.Webview) {
	try {
		await Cookie_Repository_DeleteCookieById(id);

		if (webview) {
			webview.postMessage({
				type: responseTypes.deleteCookieByIdResponse,
				id,
			});

			ShowInformationDialog("Deleted successfully");
		}
	} catch (err) {
		writeLog("error::DeleteCookieById(): " + err);
	}
}

export async function DeleteAllCookies(webview: vscode.Webview) {
	try {
		await Cookie_Repository_DeleteAllCookies();

		if (webview) {
			webview.postMessage({
				type: responseTypes.deleteAllCookieResponse,
			});

			ShowInformationDialog("Deleted successfully");
		}
	} catch (err) {
		writeLog("error::DeleteAllCookies(): " + err);
	}
}
