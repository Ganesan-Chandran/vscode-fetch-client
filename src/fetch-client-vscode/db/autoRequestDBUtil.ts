import {
	Auto_Repository_AddAutoRequests,
	Auto_Repository_GetAllAutoRequests,
	Auto_Repository_GetAutoRequestsByColId,
	Auto_Repository_GetAutoRequestById,
} from "../../fetch-client-core/db/autoRequest.repository";
import {
	AutoReqHistory_Repository_GetAll,
	AutoReqHistory_Repository_GetByColId,
	AutoReqHistory_Repository_Delete,
	AutoReqHistory_Repository_GetDistinctRunningScheduleIds,
	AutoReqHistory_Repository_Upsert,
} from "../../fetch-client-core/db/autoRequestHistory.repository";
import { FCScheduler } from "../utils/scheduler";
import { IAutoRequest } from "../../fetch-client-core/types/autorequest.types";
import { responseTypes } from "../../fetch-client-core/consts/requestTypes.consts";
import { writeLog } from "../../fetch-client-core/helpers/logger/logger";
import * as vscode from "vscode";

const MAX_REQUESTS_PER_SCHEDULE = 5;

export async function SaveAutoRequest(
	requests: IAutoRequest[],
	sessionId: string,
	webview: vscode.Webview,
) {
	try {
		const validRequests = requests.filter((request) => request.colId && request.reqId);

		if (validRequests.length === 0 || validRequests.length > MAX_REQUESTS_PER_SCHEDULE) {
			webview.postMessage({
				type: responseTypes.saveAutoRequestResponse,
				success: false,
				message: `A schedule can contain up to ${MAX_REQUESTS_PER_SCHEDULE} requests.`,
			});
			return;
		}

		const scheduler = FCScheduler.Instance;

		const runningBefore = await AutoReqHistory_Repository_GetDistinctRunningScheduleIds();
		if (runningBefore.length > 0 || scheduler.GetActiveJobCount() > 0) {
			webview.postMessage({
				type: responseTypes.saveAutoRequestResponse,
				success: false,
				message: "Another schedule is already running. Wait for it to finish, complete, or stop before creating a new one.",
			});
			return;
		}

		const savedRequests = await Auto_Repository_AddAutoRequests(validRequests);
		await scheduler.CreateJobs(savedRequests, true);

		const runningAfter = await AutoReqHistory_Repository_GetDistinctRunningScheduleIds();
		if (runningAfter.length > 1) {
			for (const request of savedRequests) {
				scheduler.RemoveJob(request);
				await AutoReqHistory_Repository_Upsert({
					autoReqId: request.id,
					scheduleId: request.scheduleId ?? request.id,
					colId: request.colId,
					reqId: request.reqId,
					requestName: request.reqName ?? "",
					status: "fail",
					scheduleStatus: "stopped",
					nextRunTime: "-",
					ownerSessionId: sessionId,
				});
			}
			webview.postMessage({
				type: responseTypes.saveAutoRequestResponse,
				success: false,
				message: "Another window started a schedule at the same moment. Please try again.",
			});
			return;
		}

		webview.postMessage({ type: responseTypes.saveAutoRequestResponse, success: true });
	} catch (err) {
		writeLog(`error::SaveAutoRequest(): ${err}`);
	}
}

export async function GetAutoRequestByColId(
	colId: string,
	name: string,
	webview: vscode.Webview,
) {
	try {
		const autoRequests = colId
			? await Auto_Repository_GetAutoRequestsByColId(colId)
			: await Auto_Repository_GetAllAutoRequests();

		webview.postMessage({
			type: responseTypes.getAutoRequestByColIdResponse,
			colId: colId ?? "",
			name: name ?? "",
			autoRequests: FCScheduler.Instance.GetSchedules(autoRequests),
		});
	} catch (err) {
		writeLog(`error::GetAutoRequestByColId(): ${err}`);
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

export async function GetAutoRequestHistory(colId: string, webview: vscode.Webview) {
	try {
		const history = colId
			? await AutoReqHistory_Repository_GetByColId(colId)
			: await AutoReqHistory_Repository_GetAll();

		webview.postMessage({
			type: responseTypes.getAutoRequestHistoryResponse,
			history,
		});
	} catch (err) {
		writeLog(`error::GetAutoRequestHistory(): ${err}`);
	}
}

export async function DeleteAutoRequestHistory(
	id: string,
	colId: string,
	webview: vscode.Webview,
) {
	try {
		await AutoReqHistory_Repository_Delete(id);
		const history = colId
			? await AutoReqHistory_Repository_GetByColId(colId)
			: await AutoReqHistory_Repository_GetAll();

		webview.postMessage({
			type: responseTypes.getAutoRequestHistoryResponse,
			history,
		});
	} catch (err) {
		writeLog(`error::DeleteAutoRequestHistory(): ${err}`);
	}
}
