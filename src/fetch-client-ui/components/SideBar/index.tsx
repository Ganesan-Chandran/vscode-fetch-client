import React, { useEffect, useRef, useState } from "react";
import { ReactComponent as MenuLogo } from '../../../../icons/menu.svg';
import { useDispatch } from "react-redux";
import { requestTypes, responseTypes } from "../../../utils/configuration";
import vscode from "../Common/vscodeAPI";
import { CollectionBar } from "./Collection";
import { HistoryBar } from "./History";
import { SideBarActions } from "./redux";
import { ICollections, IHistory, IVariable } from "./redux/types";
import "./style.css";
import { VariableSection } from "./Variables";

const SideBar = () => {

  const dispatch = useDispatch();

  const [tabOptions] = useState(["History", "Collection", "Variable"]);
  const [selectedTab, setSelectedTab] = useState("History");
  const [menuShow, setMenuShow] = useState(false);
  const [filterCondititon, setFilterCondition] = useState("");
  const [isHisLoading, setHisLoading] = useState(true);
  const [isColLoading, setColLoading] = useState(true);
  const [isVarLoading, setVarLoading] = useState(true);

  const wrapperRef = useRef(null);

  function onSelectedTab(tab: string) {
    setSelectedTab(tab);
    setFilterCondition("");
  }

  function setShowMenu(evt: any) {
    evt.preventDefault();
    setMenuShow(!menuShow);
  }

  function handleClickOutside(evt: any) {
    if (wrapperRef.current && !wrapperRef.current.contains(evt.target)) {
      setMenuShow(false);
    }
  }

  function onClearActivity(evt: any) {
    evt.preventDefault();
    vscode.postMessage({ type: requestTypes.deleteAllHistoryRequest });
    setMenuShow(false);
  }

  function onImportData(evt: any) {
    evt.preventDefault();
    vscode.postMessage({ type: requestTypes.importRequest });
    setMenuShow(false);
  }

  function onImportVariableData(evt: any) {
    evt.preventDefault();
    vscode.postMessage({ type: requestTypes.importVariableRequest });
    setMenuShow(false);
  }

  function onNewVariable(evt: any) {
    evt.preventDefault();
    vscode.postMessage({ type: requestTypes.newVariableRequest });
    setMenuShow(false);
  }

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.getAllHistoryResponse) {
        dispatch(SideBarActions.SetHistoryAction(event.data.history as IHistory[]));
        setHisLoading(false);
      } else if (event.data && event.data.type === responseTypes.deleteAllHistoryResponse) {
        dispatch(SideBarActions.SetHistoryAction([]));
      } else if (event.data && event.data.type === responseTypes.deleteHistoryResponse) {
        dispatch(SideBarActions.SetDeleteHistoryAction(event.data.id));
      } else if (event.data && event.data.type === responseTypes.renameHistoryResponse) {
        dispatch(SideBarActions.SetRenameHistoryAction(event.data.params.id, event.data.params.name));
      } else if (event.data && event.data.type === responseTypes.newHistoryResponse) {
        dispatch(SideBarActions.SetNewHistoryAction(event.data.history as IHistory));
      } else if (event.data && event.data.type === responseTypes.getAllCollectionsResponse) {
        dispatch(SideBarActions.SetCollectionAction(event.data.collections as ICollections[]));
        setColLoading(false);
      } else if (event.data && event.data.type === responseTypes.appendToCollectionsResponse) {
        dispatch(SideBarActions.SetHistoryToCollectionAction(event.data.collection as ICollections));
      } else if (event.data && event.data.type === responseTypes.renameCollectionItemResponse) {
        if (!event.data.params.name) {
          return;
        }
        dispatch(SideBarActions.SetRenameColItemAction(event.data.params.colId, event.data.params.historyId, event.data.params.name));
      } else if (event.data && event.data.type === responseTypes.deleteCollectionItemResponse) {
        dispatch(SideBarActions.SetDeleteColItemAction(event.data.params.colId, event.data.params.historyId));
      } else if (event.data && event.data.type === responseTypes.renameCollectionResponse) {
        dispatch(SideBarActions.SetRenameCollectionAction(event.data.params.id, event.data.params.name));
      } else if (event.data && event.data.type === responseTypes.deleteCollectionResponse) {
        dispatch(SideBarActions.SetDeleteCollectionAction(event.data.id));
      } else if (event.data && event.data.type === responseTypes.clearResponse) {
        dispatch(SideBarActions.SetClearCollectionAction(event.data.id));
      } else if (event.data && event.data.type === responseTypes.importResponse) {
        dispatch(SideBarActions.SetImportCollectionAction(event.data.data as ICollections));
      } else if (event.data && event.data.type === responseTypes.copyToCollectionsResponse) {
        dispatch(SideBarActions.SetCopyToCollectionAction(event.data.data as ICollections));
      } else if (event.data && event.data.type === responseTypes.getAllVariableResponse) {
        dispatch(SideBarActions.SetVariableAction(event.data.variable as IVariable[]));
        setVarLoading(false);
      } else if (event.data && event.data.type === responseTypes.renameVariableResponse) {
        dispatch(SideBarActions.SetRenameVariableAction(event.data.params.id, event.data.params.name));
      } else if (event.data && event.data.type === responseTypes.deleteVariableResponse) {
        dispatch(SideBarActions.SetDeleteVariablection(event.data.id));
        vscode.postMessage({ type: requestTypes.getAllCollectionsRequest });
      } else if (event.data && event.data.type === responseTypes.appendToVariableResponse) {
        dispatch(SideBarActions.SetNewVariableAction(event.data.collection as IVariable));
      } else if (event.data && event.data.type === responseTypes.attachVariableResponse) {
        dispatch(SideBarActions.SetAttachVariableAction(event.data.params.id, event.data.params.varId));
      } else if (event.data && event.data.type === responseTypes.activeVariableResponse) {
        dispatch(SideBarActions.SetActiveVariableAction(event.data.params.id, event.data.params.status));
      } else if (event.data && event.data.type === responseTypes.importVariableResponse) {
        dispatch(SideBarActions.SetNewVariableAction(event.data.vars));
      } else if (event.data && event.data.type === responseTypes.createNewResponse) {
        dispatch(SideBarActions.SetNewRequestToCollectionAction(event.data.item, event.data.id));
      }
    });

    vscode.postMessage({ type: requestTypes.getAllHistoryRequest });

    setTimeout(() => {
      vscode.postMessage({ type: requestTypes.getAllCollectionsRequest });
    }, 1000);

    setTimeout(() => {
      vscode.postMessage({ type: requestTypes.getAllVariableRequest });
    }, 1000);

    document.body.style.backgroundColor = "transparent";

    document.addEventListener("mousedown", handleClickOutside, false);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, false);
    };
  }, []);

  function getHistoryMenuItems() {
    return <button onClick={(e) => onClearActivity(e)}>Clear History</button>;
  }

  function getCollectionsMenuItems() {
    return <button onClick={(e) => onImportData(e)}>Import</button>;
  }

  function getVariableMenuItems() {
    return <><button onClick={(e) => onNewVariable(e)}>New Variable</button><button onClick={(e) => onImportVariableData(e)}>Import</button></>;
  }

  function onFilterChange(e: any) {
    setFilterCondition(e.target.value);
  }

  function getBody() {
    return (
      <div className="sidebar-body">
        <div className="activity-filter">
          <input type="text"
            className="activity-search"
            value={filterCondititon}
            placeholder={selectedTab === "History" ? "filter history" : selectedTab === "Collection" ? "filter collection" : "filter variable"}
            onChange={onFilterChange} />
          <div className="hamburger-menu-panel dropdown" ref={wrapperRef} >
            <MenuLogo className="hamburger-menu" onClick={(e) => setShowMenu(e)} />
            {menuShow && (<div id="myDropdown" className={"dropdown-content show"}>
              {selectedTab === "History" ? getHistoryMenuItems() : selectedTab === "Collection" ? getCollectionsMenuItems() : getVariableMenuItems()}
            </div>)}
          </div>
        </div>
        <div className="activity-items-panel">
          {
            selectedTab === "History"
              ?
              <HistoryBar filterCondition={filterCondititon?.toLowerCase()} isLoading={isHisLoading} />
              : selectedTab === "Collection"
                ?
                <CollectionBar filterCondition={filterCondititon?.toLowerCase()} isLoading={isColLoading} />
                :
                <VariableSection filterCondition={filterCondititon?.toLowerCase()} isLoading={isVarLoading} />
          }
        </div>
      </div>
    );
  }

  function getTabRender() {
    return (
      tabOptions.map((tab) => {
        return (
          <button key={tab} className={selectedTab === tab ? "sidebar-tab-menu selected" : "sidebar-tab-menu"} onClick={() => onSelectedTab(tab)}>{tab}</button>
        );
      })
    );
  }

  function onNewRequestClick() {
    vscode.postMessage({ type: requestTypes.newRequest });
  }

  return (
    <div className="sidebar-panel">
      <div className="new-request-panel">
        <button
          type="submit"
          className="new-request-button"
          onClick={onNewRequestClick}
        >
          New Request
        </button>
      </div>
      <div className="sidebar-panel-tabs">
        {
          getTabRender()
        }
      </div>
      <div className="sidebar-panel-body">
        {
          getBody()
        }
      </div>
    </div>
  );
};

export default SideBar;