import createRootReducer, { IRootState } from "../reducer/combineReducer";
import { configureStore } from "@reduxjs/toolkit";
import { InitialState as UIInitialState } from "../components/MainUI/redux/reducer";

function getPreloadedState(): Partial<IRootState> | undefined {
	const layoutConfig = window.__initialConfig?.layout;
	if (!layoutConfig) {
		return undefined;
	}

	return {
		uiData: {
			...UIInitialState,
			horizontalLayout: layoutConfig === "Horizontal Split",
		},
	};
}

export const store = configureStore({
	reducer: createRootReducer(),
	preloadedState: getPreloadedState(),
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false,
		}),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
