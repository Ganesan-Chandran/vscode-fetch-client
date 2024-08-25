/* eslint-disable @typescript-eslint/no-redeclare */
import { ReactChild, ReactPortal, Children } from "react";

type Children = ReactChild | Array<Children> | ReactPortal;

export interface IChildrenProp {
	children: Children;
}

export interface IElementProps {
	className: string;
}
