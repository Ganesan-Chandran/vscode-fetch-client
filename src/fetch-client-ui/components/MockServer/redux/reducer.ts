import {
	IMockServerPanelState,
	MockServerActionTypes,
	MS_APPEND_LOG,
	MS_SET_LOCAL_CHANGE,
	MS_SET_LOGS,
	MS_SET_ROUTES,
	MS_SET_SELECTED_ROUTE,
	MS_SET_SERVER,
	MS_SET_STATUS,
} from "./types";

const MAX_UI_LOG_ENTRIES = 200;

export const InitialState: IMockServerPanelState = {
	server: null,
	status: "stopped",
	statusError: "",
	selectedRouteId: null,
	logs: [],
	isLocalChange: false,
};

export const MockServerReducer = (
	state: IMockServerPanelState = InitialState,
	action: MockServerActionTypes = {} as MockServerActionTypes,
): IMockServerPanelState => {
	switch (action.type) {
		case MS_SET_SERVER:
			return { ...state, server: action.payload.server };

		case MS_SET_STATUS:
			return {
				...state,
				status: action.payload.status,
				statusError: action.payload.error ?? "",
			};

		case MS_SET_ROUTES:
			if (!state.server) { return state; }
			return {
				...state,
				server: { ...state.server, routes: action.payload.routes },
			};

		case MS_SET_SELECTED_ROUTE:
			return { ...state, selectedRouteId: action.payload.routeId };

		case MS_APPEND_LOG: {
			const logs = [...state.logs, action.payload.log];
			if (logs.length > MAX_UI_LOG_ENTRIES) { logs.shift(); }
			return { ...state, logs };
		}

		case MS_SET_LOGS:
			return { ...state, logs: action.payload.logs };

		case MS_SET_LOCAL_CHANGE:
			return { ...state, isLocalChange: action.payload.changed };

		default:
			return state;
	}
};
