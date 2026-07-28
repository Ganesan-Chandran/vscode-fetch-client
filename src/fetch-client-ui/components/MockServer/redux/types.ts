import {
	IMockRequestLog,
	IMockRoute,
	IMockServer,
	MockServerStatus,
} from "../../../../fetch-client-core/types/mockServer.types";

// ---------------------------------------------------------------------------
// Action type constants
// ---------------------------------------------------------------------------
export const MS_SET_SERVER: "MS_SET_SERVER" = "MS_SET_SERVER";
export const MS_SET_STATUS: "MS_SET_STATUS" = "MS_SET_STATUS";
export const MS_SET_ROUTES: "MS_SET_ROUTES" = "MS_SET_ROUTES";
export const MS_SET_SELECTED_ROUTE: "MS_SET_SELECTED_ROUTE" =
	"MS_SET_SELECTED_ROUTE";
export const MS_APPEND_LOG: "MS_APPEND_LOG" = "MS_APPEND_LOG";
export const MS_SET_LOGS: "MS_SET_LOGS" = "MS_SET_LOGS";
export const MS_SET_LOCAL_CHANGE: "MS_SET_LOCAL_CHANGE" = "MS_SET_LOCAL_CHANGE";

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------
export interface IMockServerPanelState {
	server: IMockServer | null;
	status: MockServerStatus;
	statusError: string;
	selectedRouteId: string | null;
	logs: IMockRequestLog[];
	isLocalChange: boolean;
}

// ---------------------------------------------------------------------------
// Action interfaces
// ---------------------------------------------------------------------------
export interface IMSSetServer {
	type: typeof MS_SET_SERVER;
	payload: { server: IMockServer };
}

export interface IMSSetStatus {
	type: typeof MS_SET_STATUS;
	payload: { status: MockServerStatus; error?: string };
}

export interface IMSSetRoutes {
	type: typeof MS_SET_ROUTES;
	payload: { routes: IMockRoute[] };
}

export interface IMSSetSelectedRoute {
	type: typeof MS_SET_SELECTED_ROUTE;
	payload: { routeId: string | null };
}

export interface IMSAppendLog {
	type: typeof MS_APPEND_LOG;
	payload: { log: IMockRequestLog };
}

export interface IMSSetLogs {
	type: typeof MS_SET_LOGS;
	payload: { logs: IMockRequestLog[] };
}

export interface IMSSetLocalChange {
	type: typeof MS_SET_LOCAL_CHANGE;
	payload: { changed: boolean };
}

export type MockServerActionTypes =
	| IMSSetServer
	| IMSSetStatus
	| IMSSetRoutes
	| IMSSetSelectedRoute
	| IMSAppendLog
	| IMSSetLogs
	| IMSSetLocalChange;
