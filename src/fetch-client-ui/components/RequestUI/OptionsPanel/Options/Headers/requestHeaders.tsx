import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { HeadersPanel } from ".";
import { IRootState } from "../../../../../reducer/combineReducer";
import { Actions } from "../../../redux";
import { AppDispatch } from "../../../../../store/appStore";

export const RequestHeadersPanel = () => {
	const dispatch = useDispatch<AppDispatch>();

	const { selectedVariable } = useSelector(
		(state: IRootState) => state.variableData,
	);
	const { skipParentHeaders } = useSelector(
		(state: IRootState) => state.reqSettings,
	);

	function onSelectChange(evt: React.ChangeEvent<HTMLInputElement>) {
		dispatch(Actions.SetSkipHeadersAction(evt.currentTarget.checked));
	}

	return (
		<div className="request-header-panel">
			<div>
				<label className="request-header-panel-text">
					<input
						type="checkbox"
						className="request-header-panel-option"
						checked={skipParentHeaders}
						onChange={(e) => onSelectChange(e)}
					/>{" "}
					Skip parent headers
				</label>
			</div>
			<HeadersPanel selectedVariable={selectedVariable} />
		</div>
	);
};

export default RequestHeadersPanel;
