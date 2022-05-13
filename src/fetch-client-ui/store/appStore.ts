import { applyMiddleware, compose, createStore, Store } from "redux";
import thunk from "redux-thunk";
import createRootReducer, { IRootState } from "../reducer/combineReducer";

export const composeStore = (): any =>
  compose(applyMiddleware(thunk));

export const getAppStore = (): Store<IRootState> => createStore(createRootReducer(), composeStore());
