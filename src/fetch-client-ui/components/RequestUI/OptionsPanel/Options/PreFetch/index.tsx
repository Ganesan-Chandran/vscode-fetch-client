import { Actions } from "../../../redux";
import { IRunRequest } from "../../../redux/types";
import { InitialTest } from "../../../redux/reducer";
import { IRootState } from "../../../../../reducer/combineReducer";
import { PreRequest } from "./preRequest";
import { useDispatch, useSelector } from "react-redux";
import React from "react";
import "./style.css";

export const PreFetch = () => {

  const dispatch = useDispatch();
  const { preFetch } = useSelector((state: IRootState) => state.requestData);

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


  const makeRequests = (reqs: IRunRequest[]) => {
    return (
      reqs?.map((item: IRunRequest, index: number) => {
        return <div key={"preReq_req_panel_" + index} id={"preReq_req_panel_" + index}><PreRequest request={item} reqIndex={index} /></div>;
      })
    );
  };

  return (
    <div className="preReq-container">
      <div><div className="max-req">* Max 5 request</div><button onClick={onAddReqClick} disabled={preFetch?.requests?.length > 4} className="format-button">Add Pre-request</button></div>
      {
        makeRequests(preFetch?.requests)
      }
    </div>
  );
};