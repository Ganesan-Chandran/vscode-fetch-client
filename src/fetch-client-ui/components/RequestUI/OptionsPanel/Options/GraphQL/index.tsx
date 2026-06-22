import "./style.css";
import { Actions } from "../../../redux";
import { AppDispatch } from "../../../../../store/appStore";
import { IRootState } from "../../../../../reducer/combineReducer";
import { AceEditor } from "../../../../Common/Editor";
import { useDispatch, useSelector } from "react-redux";
import React from "react";

export const GraphQL = () => {

	const dispatch = useDispatch<AppDispatch>();
	const { body } = useSelector((state: IRootState) => state.requestData);
	const { horizontalLayout } = useSelector((state: IRootState) => state.uiData);

	function onQueryContentChange(value: string) {
		let localbody = { ...body };
		if (localbody.graphql !== undefined) {
			localbody.graphql.query = value;
			dispatch(Actions.SetRequestBodyAction(localbody));
		}
	}

	function onVariablesContentChange(value: string) {
		let localbody = { ...body };
		if (localbody.graphql !== undefined) {
			localbody.graphql.variables = value;
			dispatch(Actions.SetRequestBodyAction(localbody));
		}
	}

	return (
		<div className={horizontalLayout ? "graphql-panel graphql-horizontal-panel" : "graphql-panel"}>
			<div className={horizontalLayout ? "graphql-horizontal-query-panel graphql-query-panel" : "graphql-vertical-query-panel graphql-query-panel"}>
				<span className="graphql-query-head">Query</span>
				<AceEditor
					value={body.graphql.query ?? ""}
					language="graphql"
					readOnly={false}
					copyButtonVisible={false}
					format={false}
					onContentChange={onQueryContentChange}
					className="graphql-editor"
				/>
			</div>
			<div className={horizontalLayout ? "graphql-horizontal-variable-panel graphql-variable-panel" : "graphql-vertical-variable-panel graphql-variable-panel"}>
				<span className="graphql-variable-head">Variables</span>
				<AceEditor
					value={body.graphql.variables ?? ""}
					language="graphql"
					readOnly={false}
					copyButtonVisible={false}
					format={false}
					onContentChange={onVariablesContentChange}
					className="graphql-editor"
				/>
			</div>
		</div>
	);
};
