import {
	Auto_Repository_SaveAutoRequests,
	Auto_Repository_GetAllAutoRequests,
	Auto_Repository_GetAutoRequestById,
} from "../../fetch-client-core/db/autoRequest.repository";
import { FCScheduler } from "../utils/scheduler";
import { IAutoRequest } from "../../fetch-client-core/types/autorequest.types";
import { responseTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";

export async function SaveAutoRequest(requests: IAutoRequest[]) {
	try {
		const result = await Auto_Repository_SaveAutoRequests(requests);
		const scheduler = FCScheduler.Instance;
		scheduler.CreateJobs(result.savedRequests, true);
		result.deletedRequests.forEach((item) => {
			scheduler.RemoveJob(item);
		});

		vscode.window.showInformationMessage(
			"Successfully enabled the auto requests",
			{ modal: true },
		);
	} catch (err) {
		writeLog(`error::SaveAutoRequest(): ${err}`);
	}
}

export async function GetAllAutoRequest(webview: vscode.Webview) {
	try {
		const autoRequests = await Auto_Repository_GetAllAutoRequests();
		webview.postMessage({
			type: responseTypes.getAllAutoRequestResponse,
			autoRequests,
		});
	} catch (err) {
		writeLog(`error::GetAllAutoRequest(): ${err}`);
	}
}

export async function GetAutoRequestById(id: string, webview: vscode.Webview) {
	try {
		const autoRequests = await Auto_Repository_GetAutoRequestById(id);
		if (webview) {
			webview.postMessage({
				type: responseTypes.getAutoRequestByIdResponse,
				data: autoRequests,
			});
		}
	} catch (err) {
		writeLog(`error::GetAutoRequestById(): ${err}`);
	}
}
