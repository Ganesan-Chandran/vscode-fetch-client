import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IRootState } from "../../../../../reducer/combineReducer";
import { Actions } from "../../../redux";
import { InitialTest } from "../../../redux/reducer";
import { IRunRequest } from "../../../redux/types";
import { PreRequest } from "./preRequest";
import "./style.css";

export interface IPreFecthProps {
	settingsMode?: boolean;
}

export const PreFetch = (props: IPreFecthProps) => {

	const dispatch = useDispatch();
	const { preFetch } = useSelector((state: IRootState) => state.requestData);
	const { skipParentPreFetch } = useSelector((state: IRootState) => state.reqSettings);

	function onAddReqClick() {
		let newPreReq: IRunRequest = {
			reqId: "",
			parentId: "",
			colId: "",
			order: preFetch && preFetch?.requests ? preFetch.requests.length + 1 : 1,
			condition: JSON.parse(JSON.stringify(InitialTest))
		};
		dispatch(Actions.SetAddPreRequestAction(newPreReq));
	};

	useEffect(() => {
		if (preFetch?.requests?.length <= 0) {
			let newPreReq: IRunRequest = {
				reqId: "",
				parentId: "",
				colId: "",
				order: preFetch && preFetch?.requests ? preFetch.requests.length + 1 : 1,
				condition: JSON.parse(JSON.stringify(InitialTest))
			};
			dispatch(Actions.SetAddPreRequestAction(newPreReq));
		}
	}, []);

	const makeRequests = (reqs: IRunRequest[]) => {
		return (
			reqs?.map((item: IRunRequest, index: number) => {
				return <div key={"preReq_req_panel_" + index} id={"preReq_req_panel_" + index}><PreRequest request={item} reqIndex={index} /></div>;
			})
		);
	};

	const isDisabled = () => {
		return props.settingsMode ? preFetch?.requests?.length > 1 : preFetch?.requests?.length > 4;
	};

	function onSelectChange(evt: React.ChangeEvent<HTMLInputElement>) {
		dispatch(Actions.SetSkipPreFetchAction(evt.currentTarget.checked));
	}

	return (
		<div className="preReq-container">
			<div>
				<div className="max-req">
					{props?.settingsMode ? "* Max 2 request (It is recommended that each request does not contain any PreFetch requests. If there are any PreFetch requests, then they won't be executed.)" : "* Max 5 request"}
				</div>
				<button onClick={onAddReqClick} disabled={isDisabled()} className="format-button">Add Pre-request
				</button>
			</div>
			{!props?.settingsMode ?
				<div className="request-prefetch-panel">
					<label className="request-header-panel-text">
						<input type="checkbox"
							className="request-header-panel-option"
							checked={skipParentPreFetch}
							onChange={(e) => onSelectChange(e)}
						/> Skip parent pre-requests</label>
				</div>
				:
				<>
				</>
			}
			{
				makeRequests(preFetch?.requests)
			}
		</div>
	);
};
