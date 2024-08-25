import React from "react";
import { useSelector } from "react-redux";
import { IRootState } from "../../../reducer/combineReducer";
import "./style.css";

export interface EditorProps {
	copyButtonVisible: boolean;
	format: boolean;
	language: string;
	readOnly: boolean;
	value: string;
	onContentChange?: any;
	className?: string;
	theme?: number;
	wordWrap?:boolean;
}

const EditorProvider = React.lazy(() => import('./EditorProvider'));

export const MonacoEditor = (props: EditorProps) => {

	const { theme } = useSelector((state: IRootState) => state.uiData);

	return (
		<React.Suspense fallback={<div>loading...</div>}>
			<EditorProvider
				copyButtonVisible={props.copyButtonVisible}
				format={props.format}
				language={props.language}
				readOnly={props.readOnly}
				value={props.value}
				onContentChange={props.onContentChange}
				className={props.className}
				theme={theme}
				wordWrap={props.wordWrap}
			/>
		</React.Suspense>
	);
};
