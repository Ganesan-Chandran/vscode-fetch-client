import * as React from "react";
import { Provider } from "react-redux";
import { Store } from "redux";
import { IChildrenProp } from "./types";

interface IProps extends IChildrenProp {
  store: Store;
}

export const StateAndRouterProvider: React.FC<IProps> = (props: IProps) => {

  return (
    <Provider store={props.store}>
      {props.children}
    </Provider>
  );
};
