import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { MonacoEditor } from "../../../../../Common/Editor";
import { Actions } from "../../../../redux";
import { requestBodyRaw } from "../consts";
import "./style.css";

export const Raw = (props: any) => {

	const dispatch = useDispatch();

	const requestData = useSelector((state: IRootState) => state.requestData);

	const onContentChange = (value: string) => {
		dispatch(Actions.SetRequestRawAction(value));
	};

	return (
		<div className="raw-panel">
			<MonacoEditor
				value={requestData.body.raw.data}
				language={requestData.body.raw.lang ?? requestBodyRaw[1].value}
				readOnly={false}
				copyButtonVisible={false}
				format={props.format}
				onContentChange={onContentChange}
			/>
		</div>
	);
};
