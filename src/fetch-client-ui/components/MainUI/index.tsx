import React from "react";
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Split from 'react-split';
import { requestTypes, responseTypes } from "../../../utils/configuration";
import { IRootState } from '../../reducer/combineReducer';
import vscode from "../Common/vscodeAPI";
import { OptionsPanel } from "../RequestUI/OptionsPanel";
import { Actions } from "../RequestUI/redux";
import { IRequestModel } from "../RequestUI/redux/types";
import { RequestPanel } from "../RequestUI/RequestPanel";
import { ResponseActions } from "../ResponseUI/redux";
import { ReponsePanel } from "../ResponseUI/ResponsePanel";
import { IVariable } from "../SideBar/redux/types";
import { VariableActions } from "../Variables/redux";
import { UIActions } from './redux';
import "./style.css";

const MainUI = () => {

  const dispatch = useDispatch();

  const { open } = useSelector((state: IRootState) => state.uiData);
  const { responseData } = useSelector((state: IRootState) => state.responseData.response);
  const { variables } = useSelector((state: IRootState) => state.variableData);

  const [reqClass, setReqClass] = useState("full-height");
  const [resClass, setResClass] = useState("zero-height");

  const [reqBorderClass, setReqBorderClass] = useState("");
  const [varId, setVarId] = useState("");
  const [resBorderClass, setResBorderClass] = useState("no-border");

  const [layout, setLayout] = useState("");
  const [horiLayout, setHoriLayout] = useState("");


  useEffect(() => {
    if (responseData && resClass === "zero-height") {
      setOpenPanel(1);
    }
  }, [responseData]);

  useEffect(() => {
    if (reqClass === "zero-height") {
      setReqBorderClass("no-border");
    } else {
      setReqBorderClass("");
    }

    if (resClass === "zero-height") {
      setResBorderClass("no-border");
    } else {
      setResBorderClass("");
    }
  }, [reqClass, resClass]);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.apiResponse) {
        dispatch(ResponseActions.SetResponseAction(event.data.response));
        dispatch(ResponseActions.SetResponseHeadersAction(event.data.headers));
        dispatch(ResponseActions.SetResponseCookiesAction(event.data.cookies));
      } else if (event.data && event.data.type === responseTypes.configResponse) {
        let config = JSON.parse(event.data.configData);
        let layoutConfig = config["layout"];
        setLayout(layoutConfig);
        let hariLayoutConfig = config["horizontalLayout"];
        setHoriLayout(hariLayoutConfig);
        dispatch(UIActions.SetLayoutAction(layoutConfig === "Horizontal Split" ? true : false, event.data.theme));
      } else if (event.data && event.data.type === responseTypes.openExistingItemResponse) {
        const reqData = event.data.item[0] as IRequestModel;
        dispatch(Actions.SetRequestAction(reqData));
        if (reqData.body.bodyType === "binary" && reqData.body.binary.fileName) {
          vscode.postMessage({ type: requestTypes.readFileRequest, path: reqData.body.binary.fileName });
        }
      } else if (event.data && event.data.type === responseTypes.readFileResponse) {
        dispatch(Actions.SetRequestBinaryDataAction(event.data.fileData));
      } else if (event.data && event.data.type === responseTypes.getAllVariableResponse) {
        dispatch(VariableActions.SetReqAllVariableAction(event.data.variable as IVariable[]));
      } else if (event.data && event.data.type === responseTypes.getRunItemDataResponse) {
        const reqData = event.data.reqData as IRequestModel;
        dispatch(Actions.SetRequestAction(reqData));
        if (reqData.body.bodyType === "binary" && reqData.body.binary.fileName) {
          vscode.postMessage({ type: requestTypes.readFileRequest, path: reqData.body.binary.fileName });
        }
        dispatch(ResponseActions.SetResponseAction(event.data.resData.response));
        dispatch(ResponseActions.SetResponseHeadersAction(event.data.resData.headers));
        dispatch(ResponseActions.SetResponseCookiesAction(event.data.resData.cookies));
      }
    });

    vscode.postMessage({ type: requestTypes.configRequest });

    let reqId = document.title.split(":")[0];
    let varId = document.title.split(":")[1];
    let isRunItem = document.title.split(":")[2];

    if (reqId !== "undefined" && isRunItem === "undefined") {
      vscode.postMessage({ type: requestTypes.openExistingItemRequest, data: reqId });
      setTimeout(vscode.postMessage({ type: requestTypes.getAllVariableRequest }), 1000);
    } else {
      vscode.postMessage({ type: requestTypes.getAllVariableRequest });
    }

    if (varId !== "undefined") {
      setVarId(varId);
    }

    if (isRunItem !== "undefined") {
      vscode.postMessage({ type: requestTypes.getRunItemDataRequest });
    }
  }, []);

  useEffect(() => {
    if (variables && variables.length > 0) {
      if (varId) {
        let vars = variables.filter(item => item.id === varId);
        if (vars && vars.length > 0) {
          dispatch(VariableActions.SetReqVariableAction(vars[0] as IVariable));
        }
      } else {
        let globalVar = variables.filter(item => item.name.toUpperCase().trim() === "GLOBAL" && item.isActive === true);
        if (globalVar && globalVar.length > 0) {
          dispatch(VariableActions.SetReqVariableAction(globalVar[0] as IVariable));
        }
      }
    }
  }, [variables]);

  function setOpenPanel(index: number) {

    if (index === 0) {
      if (open[0] && open[1]) {
        setReqClass("zero-height");
        setResClass("full-height");
      }

      if (open[0] && !open[1]) {
        setBothZero();
      }

      if (!open[0] && open[1]) {
        setBothHalf();
      }

      if (!open[0] && !open[1]) {
        setReqClass("full-height");
        setResClass("zero-height");
      }
    }

    if (index === 1) {
      if (open[0] && open[1]) {
        setReqClass("full-height");
        setResClass("zero-height");
      }

      if (open[0] && !open[1]) {
        setBothHalf();
      }

      if (!open[0] && open[1]) {
        setBothZero();
      }

      if (!open[0] && !open[1]) {
        setReqClass("zero-height");
        setResClass("full-height");
      }
    }

    dispatch(UIActions.SetOpenAction(open.map((item, i) => i === index ? !item : item)));
  }

  function setBothZero() {
    setReqClass("zero-height");
    setResClass("zero-height");
  }

  function setBothHalf() {
    setReqClass("half-height");
    setResClass("half-height");
  }

  return (
    <>
      {
        layout === "Horizontal Split" ?
          horiLayout === "Split Style" ?
            <Split className="split split-horizontal" gutterSize={2} direction="vertical" cursor="ns-resize" minSize={60}>
              <div>
                <RequestPanel />
                <OptionsPanel />
              </div>
              <div>
                <ReponsePanel isVerticalLayout={false} />
              </div>
            </Split>
            :
            <>
              <section id="req-section" className={"accordion " + reqClass}>
                <input type="checkbox" name="collapse" id="handle1" onChange={() => { setOpenPanel(0); }} checked={open[0]} />
                <h2 className="handle">
                  <label className="accordion-title" htmlFor="handle1">
                    Request
                  </label>
                </h2>
                <div className={reqBorderClass + " content"}>
                  <RequestPanel />
                  <OptionsPanel />
                </div>
              </section>
              <section id="res-section" className={"accordion " + resClass}>
                <input type="checkbox" name="collapse" id="handle3" onChange={() => { setOpenPanel(1); }} checked={open[1]} />
                <h2 className="handle">
                  <label className="accordion-title" htmlFor="handle3">
                    Response
                  </label>
                </h2>
                <div className={resBorderClass + " content"}>
                  <ReponsePanel isVerticalLayout={false} />
                </div>
              </section>
            </>
          :
          <Split className="split split-vertical" gutterSize={1} cursor="ew-resize" minSize={230} >
            <div>
              <RequestPanel />
              <OptionsPanel />
            </div>
            <div>
              <ReponsePanel isVerticalLayout={true} />
            </div>
          </Split>
      }
    </>
  );
};

export default MainUI;