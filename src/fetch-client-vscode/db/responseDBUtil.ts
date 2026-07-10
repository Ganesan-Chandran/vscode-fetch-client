import { IReponseModel } from "../../fetch-client-core/types/response.types";
import {
	Response_Repository_SaveResponse,
	Response_Repository_GetExitingItemResponse,
} from "../../fetch-client-core/db/responseDB.repository";
import { responseTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";

export async function SaveResponse(resData: IReponseModel) {
	try {
		await Response_Repository_SaveResponse(resData);
	} catch (err) {
		writeLog("error::SaveResponse(): " + err);
	}
}

export async function GetExitingItemResponse(
	webview: vscode.Webview,
	id: string,
) {
	try {
		const results = await Response_Repository_GetExitingItemResponse(id);

		if (results?.length > 0) {
			webview.postMessage({
				type: responseTypes.apiResponse,
				response: results[0].response,
				cookies: results[0].cookies,
				headers: results[0].headers,
			});
		}
	} catch (err) {
		writeLog("error::GetExitingItemResponse(): " + err);
	}
}
