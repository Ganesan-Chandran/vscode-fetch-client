import * as React from "react";
import { Provider } from "react-redux";
import { IChildrenProp } from "./types";
import { store } from "./appStore";

// interface IProps extends IChildrenProp {
// 	store: Store<IRootState, AppActions>;
// }

// export const StateAndRouterProvider: React.FC<IProps> = (props: IProps) => {

// 	return (
// 		<Provider store={props.store}>
// 			{props.children}
// 		</Provider>
// 	);
// };

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