import {
	IMockRequestLog,
	IMockRoute,
	IMockServer,
	MockServerStatus,
} from "../../../../fetch-client-core/types/mockServer.types";
import {
	MockServerActionTypes,
	MS_APPEND_LOG,
	MS_SET_LOCAL_CHANGE,
	MS_SET_LOGS,
	MS_SET_ROUTES,
	MS_SET_SELECTED_ROUTE,
	MS_SET_SERVER,
	MS_SET_STATUS,
} from "./types";

export const SetServerAction = (
	server: IMockServer,
): MockServerActionTypes => ({
	type: MS_SET_SERVER,
	payload: { server },
});

export const SetStatusAction = (
	status: MockServerStatus,
	error?: string,
): MockServerActionTypes => ({
	type: MS_SET_STATUS,
	payload: { status, error },
});

export const SetRoutesAction = (
	routes: IMockRoute[],
): MockServerActionTypes => ({
	type: MS_SET_ROUTES,
	payload: { routes },
});

export const SetSelectedRouteAction = (
	routeId: string | null,
): MockServerActionTypes => ({
	type: MS_SET_SELECTED_ROUTE,
	payload: { routeId },
});

export const AppendLogAction = (
	log: IMockRequestLog,
): MockServerActionTypes => ({
	type: MS_APPEND_LOG,
	payload: { log },
});

export const SetLogsAction = (
	logs: IMockRequestLog[],
): MockServerActionTypes => ({
	type: MS_SET_LOGS,
	payload: { logs },
});

export const SetLocalChangeAction = (
	changed: boolean,
): MockServerActionTypes => ({
	type: MS_SET_LOCAL_CHANGE,
	payload: { changed },
});
