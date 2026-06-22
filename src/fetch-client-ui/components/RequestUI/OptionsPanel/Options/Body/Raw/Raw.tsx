import "./style.css";
import { Actions } from "../../../../redux";
import { AppDispatch } from "../../../../../../store/appStore";
import { IRootState } from "../../../../../../reducer/combineReducer";
import { MonacoEditor } from "../../../../../Common/Editor";
import { requestBodyRaw } from "../../../../../../../fetch-client-core/consts/requestBody.consts";
import { useDispatch, useSelector } from "react-redux";
import React from "react";

export const Raw = (props: any) => {

	const dispatch = useDispatch<AppDispatch>();

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
