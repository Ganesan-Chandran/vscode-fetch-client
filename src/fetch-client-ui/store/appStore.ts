import createRootReducer, { } from "../reducer/combineReducer";
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
	reducer: createRootReducer(),
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			immutableCheck: false,
			serializableCheck: false
		})
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;