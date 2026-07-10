import { IChildrenProp } from "./types";
import { Provider } from "react-redux";
import { store } from "./appStore";
import * as React from "react";

interface IProps extends IChildrenProp {
	store: typeof store;
}

export const StateAndRouterProvider: React.FC<IProps> = (props: IProps) => {
	return (
		<Provider store={props.store}>
			{props.children}
		</Provider>
	);
};