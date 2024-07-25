import { Actions } from "../RequestUI/redux";
import { CookiesActions } from "../Cookies/redux";
import { formatDate } from "../../../utils/helper";
import { ICookie } from "../Cookies/redux/types";
import { ICollection, IRequestModel } from "../RequestUI/redux/types";
import { IRootState } from '../../reducer/combineReducer';
import { ISettings, IVariable } from "../SideBar/redux/types";
import { OptionsPanel } from "../RequestUI/OptionsPanel";
import { ReponsePanel } from "../ResponseUI/ResponsePanel";
import { RequestPanel } from "../RequestUI/RequestPanel";
import { pubSubTypes, requestTypes, responseTypes } from "../../../utils/configuration";
import { ResponseActions } from "../ResponseUI/redux";
import { UIActions } from './redux';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { VariableActions } from "../Variables/redux";
import React, { useRef } from "react";
import Split from 'react-split';
import vscode from "../Common/vscodeAPI";
import "./style.css";

const MainUI = () => {

  const dispatch = useDispatch();

  const { open } = useSelector((state: IRootState) => state.uiData);
  const { loading, response } = useSelector((state: IRootState) => state.responseData);
  const requestData = useSelector((state: IRootState) => state.requestData);
  const { variables } = useSelector((state: IRootState) => state.variableData);
  const { parentSettings, collectionList } = useSelector((state: IRootState) => state.reqColData);

  const refReq = useRef(requestData);
  const setReq = (data: IRequestModel) => {
    refReq.current = data;
  };

  const [reqClass, setReqClass] = useState("full-height");
  const [resClass, setResClass] = useState("zero-height");

  const [reqBorderClass, setReqBorderClass] = useState("");
  const [varId, setVarId] = useState("");
  const [resBorderClass, setResBorderClass] = useState("no-border");

  const [layout, setLayout] = useState("");
  const [horiLayout, setHoriLayout] = useState("");

  const [saveVisible, setVisible] = useState(false);
  const [loadingApp, setLoadingApp] = useState(true);

  useEffect(() => {
    if (loading && resClass === "zero-height") {
      setOpenPanel(1);
    }
  }, [loading]);

  useEffect(() => {
    if ((response.status !== 0 || response.isError) && resClass === "zero-height") {
      setOpenPanel(1);
    }
  }, [response]);

  useEffect(() => {
    setReq(requestData);
  }, [requestData]);

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
    if (saveVisible) {
      setTimeout(() => {
        setVisible(false);
      }, 2000);
    }
  }, [saveVisible]);

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.apiResponse) {
        dispatch(ResponseActions.SetResponseCookiesAction(event.data.cookies));
        dispatch(ResponseActions.SetResponseAction(event.data.response));
        dispatch(ResponseActions.SetResponseHeadersAction(event.data.headers));
      } else if (event.data && event.data.type === responseTypes.configResponse) {
        let config = JSON.parse(event.data.configData);
        let layoutConfig = config["layout"];
        setLayout(layoutConfig);
        let hariLayoutConfig = config["horizontalLayout"];
        setHoriLayout(hariLayoutConfig);
        let responseLimit = (config["responseLimit"] as number) * 1048576;
        dispatch(UIActions.SetLayoutAction(layoutConfig === "Horizontal Split" ? true : false, event.data.theme));
        dispatch(UIActions.SetResponseLimitAction(responseLimit));
      } else if (event.data && event.data.type === responseTypes.openExistingItemResponse) {
        const reqData = event.data.item[0] as IRequestModel;
        dispatch(Actions.SetRequestAction(reqData));
        if (reqData.body.bodyType === "binary" && reqData.body.binary.fileName) {
          vscode.postMessage({ type: requestTypes.readFileRequest, path: reqData.body.binary.fileName });
        }
        if (reqData.auth.authType === "inherit") {
          vscode.postMessage({ type: requestTypes.getParentSettingsRequest, data: { colId: colId, folderId: folderId } });
        }
        setLoadingApp(false);
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
        if (reqData.auth.authType === "inherit") {
          vscode.postMessage({ type: requestTypes.getParentSettingsRequest, data: { colId: colId, folderId: folderId } });
        }
        dispatch(ResponseActions.SetResponseAction(event.data.resData.response));
        dispatch(ResponseActions.SetResponseHeadersAction(event.data.resData.headers));
        dispatch(ResponseActions.SetResponseCookiesAction(event.data.resData.cookies));
        setLoadingApp(false);
      } else if (event.data && event.data.type === responseTypes.saveResponse) {
        setVisible(true);
      } else if (event.data && event.data.type === responseTypes.getAllCookiesResponse) {
        dispatch(CookiesActions.SetAllCookiesAction(event.data.cookies as ICookie[]));
      } else if (event.data && event.data.type === responseTypes.getParentSettingsResponse) {
        dispatch(Actions.SetReqParentSettingsAction(event.data.settings as ISettings));
      } else if (event.data && event.data.type === pubSubTypes.updateVariables) {
        vscode.postMessage({ type: requestTypes.getAllVariableRequest });
      } else if (event.data && event.data.type === pubSubTypes.removeCurrentVariable) {
        setVarId("");
      } else if (event.data && event.data.type === pubSubTypes.addCurrentVariable) {
        setVarId(event.data.data.varId);
      } else if (event.data && event.data.type === pubSubTypes.themeChanged) {
        vscode.postMessage({ type: requestTypes.themeRequest });
      } else if (event.data && event.data.type === responseTypes.themeResponse) {
        dispatch(UIActions.SetThemeAction(event.data.theme));
      } else if (event.data && event.data.type === responseTypes.getAllCollectionNameResponse) {
        let col: ICollection[] = event.data.collectionNames?.map((item: { value: any; name: any; }) => {
          return {
            id: item.value,
            name: item.name
          };
        });
        col.unshift({ id: "", name: "select" });
        dispatch(Actions.SetCollectionListAction(col));
      }
    });

    vscode.postMessage({ type: requestTypes.configRequest });

    let reqId = document.title.split(":")[0];
    let colId = document.title.split(":")[1];
    let varId = document.title.split(":")[2];
    let isRunItem = document.title.split(":")[3];
    let folderId = document.title.split(":")[4];

    if (reqId !== "undefined" && isRunItem === "undefined") {
      vscode.postMessage({ type: requestTypes.openExistingItemRequest, data: reqId });
      setTimeout(vscode.postMessage({ type: requestTypes.getAllVariableRequest }), 1000);
    } else {
      vscode.postMessage({ type: requestTypes.getAllVariableRequest });
    }

    if (collectionList.length === 0) {
      setTimeout(vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "addtocol" }), 1000);
    }

    dispatch(Actions.SetReqColDetailsAction(colId !== "undefined" ? colId : "", folderId !== "undefined" ? folderId : ""));

    if (varId !== "undefined") {
      setVarId(varId);
    }

    if (isRunItem !== "undefined") {
      dispatch(UIActions.SetRunItemAction(true));
      vscode.postMessage({ type: requestTypes.getRunItemDataRequest });
    }

    document.addEventListener("keydown", function (e) {
      if (e.ctrlKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        if (!refReq.current.url) {
          return;
        }

        let reqData = { ...refReq.current };
        let isNew = false;
        if (!reqData.name) {
          reqData.id = uuidv4();
          reqData.name = reqData.url.trim();
          reqData.createdTime = formatDate();
          dispatch(Actions.SetRequestAction(reqData));
          isNew = true;
        }
        vscode.postMessage({ type: requestTypes.saveRequest, data: { reqData: reqData, isNew: isNew, colId: colId === "undefined" ? undefined : colId } });
      }
    });

    vscode.postMessage({ type: requestTypes.getAllCookiesRequest });

  }, []);

  useEffect(() => {
    if (variables && variables.length > 0) {
      if (varId) {
        updateVaribleData(varId);
      } else {
        setRequiredGlobalVariable();
      }
    }
  }, [variables, varId]);

  function updateVaribleData(varId: string) {
    let index = variables.findIndex(item => item.id === varId);
    if (index !== -1) {
      setRequiredVariable(index);
    } else {
      setRequiredGlobalVariable();
    }
  }

  function setRequiredVariable(index: number) {
    dispatch(VariableActions.SetReqVariableAction(variables[index] as IVariable));
  }

  function setRequiredGlobalVariable() {
    let index = variables.findIndex(item => item.name.toUpperCase().trim() === "GLOBAL" && item.isActive === true);
    if (index !== -1) {
      setRequiredVariable(index);
      setVarId(variables[index].id);
    }
  }

  useEffect(() => {
    if (parentSettings && parentSettings.auth.authType === "apikey") {
      modifyQueryParam(parentSettings.auth.addTo, parentSettings.auth.userName, parentSettings.auth.password);
    }
  }, [parentSettings]);

  const modifyQueryParam = (section: string, userName: string, password: string) => {
    if (section === "queryparams") {
      let localParams = [...requestData.params];
      let available = localParams.findIndex(item => item.isFixed === true && item.key === userName && item.value === password);

      if (available === -1 && userName) {
        localParams.unshift({
          isChecked: true,
          key: userName,
          value: password,
          isFixed: true
        });

        dispatch(Actions.SetRequestParamsAction(localParams));
      }

    } else {
      let localHeaders = [...requestData.headers];
      let available = localHeaders.findIndex(item => item.isFixed === true && item.key === userName && item.value === password);

      if (available === -1 && userName) {
        localHeaders.unshift({
          isChecked: true,
          key: userName,
          value: password,
          isFixed: true
        });
      }

      dispatch(Actions.SetRequestHeadersAction(localHeaders));
    }
  };

  function setOpenPanel(index: number) {
    let localData = [...open];

    if (index === 0) {
      if (open[0] && open[1]) {
        setResFull();
        localData[index] = !localData[index];
      }

      if (open[0] && !open[1]) {
        setResFull();
        localData = localData.map((item) => !item);
      }

      if (!open[0] && open[1]) {
        setBothHalf();
        localData[index] = !localData[index];
      }

      if (!open[0] && !open[1]) {
        setReqFull();
        localData[index] = !localData[index];
      }
    }

    if (index === 1) {
      if (open[0] && open[1]) {
        setReqFull();
        localData[index] = !localData[index];
      }

      if (open[0] && !open[1]) {
        setBothHalf();
        localData[index] = !localData[index];
      }

      if (!open[0] && open[1]) {
        setReqFull();
        localData = localData.map((item) => !item);
      }

      if (!open[0] && !open[1]) {
        setResFull();
        localData[index] = !localData[index];
      }
    }
    dispatch(UIActions.SetOpenAction(localData));
  }

  function setBothHalf() {
    setReqClass("half-height");
    setResClass("half-height");
    let fulScreenButton = document.getElementById("fullscreen-expand-btn");
    if (fulScreenButton) {
      fulScreenButton.classList.remove("fullscreen-btn-invisible");
    }
  }

  function setReqFull() {
    setReqClass("full-height");
    setResClass("zero-height");
    let fulScreenButton = document.getElementById("fullscreen-expand-btn");
    if (fulScreenButton) {
      fulScreenButton.classList.add("fullscreen-btn-invisible");
    }
  }

  function setResFull() {
    setReqClass("zero-height");
    setResClass("full-height");
    let fulScreenButton = document.getElementById("fullscreen-expand-btn");
    if (fulScreenButton) {
      fulScreenButton.classList.remove("fullscreen-btn-invisible");
    }
  }

  return (
    <>
      {
        loadingApp ?
          <>
            <div id="divSpinner" className="spinner loading"></div>
            <div className="loading-history-text">{"Loading...."}</div>
          </>
          :
          <>
            {
              layout === "Horizontal Split" ?
                horiLayout === "Split Style" ?
                  <Split className="split split-horizontal" gutterSize={2} direction="vertical" cursor="ns-resize" minSize={60}>
                    <div>
                      <RequestPanel />
                      <div className={saveVisible ? "save-text save-visible save-text-horizontal" : "save-text save-invisible"}>Saved Successfully</div>
                      <OptionsPanel />
                    </div>
                    <div>
                      <ReponsePanel isVerticalLayout={false} isCurl={false} />
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
                        <div className={saveVisible ? "save-text save-visible save-text-horizontal" : "save-text save-invisible"}>Saved Successfully</div>
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
                        <ReponsePanel isVerticalLayout={false} isCurl={false} />
                      </div>
                    </section>
                  </>
                :
                <Split className="split split-vertical" gutterSize={1} cursor="ew-resize" minSize={230} >
                  <div>
                    <RequestPanel />
                    <div className={saveVisible ? "save-text save-visible" : "save-text save-invisible"}>Saved Successfully</div>
                    <OptionsPanel />
                  </div>
                  <div>
                    <ReponsePanel isVerticalLayout={true} isCurl={false} />
                  </div>
                </Split>
            }
          </>
      }
    </>
  );
};

export default MainUI;