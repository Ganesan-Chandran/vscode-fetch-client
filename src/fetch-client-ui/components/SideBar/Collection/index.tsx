import React, { useEffect, useRef, useState } from "react";
import { ReactComponent as DotsLogo } from '../../../../../icons/dots.svg';
import { useSelector } from "react-redux";
import { requestTypes } from "../../../../utils/configuration";
import { IRootState } from "../../../reducer/combineReducer";
import vscode from "../../Common/vscodeAPI";
import { ICollections, IHistory } from "../redux/types";
import { getDays, getMethodClassName, getMethodName } from "../util";
import { v4 as uuidv4 } from 'uuid';
import "./style.css";
import { formatDate } from "../../../../utils/helper";
import { IRequestModel } from "../../RequestUI/redux/types";
import { InitialState } from "../../RequestUI/redux/reducer";

export interface ICollectionProps {
  filterCondition: string;
  isLoading: boolean;
}

export const CollectionBar = (props: ICollectionProps) => {

  const { collections, variable } = useSelector((state: IRootState) => state.sideBarData);

  const [selectedItem, setSelectedItem] = useState("");

  const moreHeadMenuWrapperRef = useRef({});
  const [currentHeadIndex, _setCurrentHeadIndex] = useState("");

  const refHeadIndex = useRef(currentHeadIndex);
  const setCurrentHeadIndex = (data: string) => {
    refHeadIndex.current = data;
    _setCurrentHeadIndex(refHeadIndex.current);
  };

  const moreMenuWrapperRef = useRef({});
  const [currentIndex, _setCurrentIndex] = useState("");

  const refIndex = useRef(currentIndex);
  const setCurrentIndex = (data: string) => {
    refIndex.current = data;
    _setCurrentIndex(refIndex.current);
  };

  const [ddPosition, setPosition] = useState("");

  const styles = {
    bottomStyle: {
      bottom: ddPosition
    } as React.CSSProperties,
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside, false);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, false);
    };
  }, []);

  function openMoreMenu(e: any, id: string, isSub: boolean = false) {
    e.preventDefault();
    e.stopPropagation();

    if (isSub) {
      if (currentIndex === id) {
        setCurrentIndex("");
        return;
      }
    } else {
      if (currentHeadIndex === id) {
        setCurrentHeadIndex("");
        return;
      }
    }

    let element = document.getElementById("three-dots-" + id);
    if (element) {
      let rect = element.getBoundingClientRect();
      let viewportHeight = window.innerHeight;
      let total = rect.top + 100;
      if (total > viewportHeight) {
        setPosition("100%");
      } else {
        setPosition("");
      }
    }
    if (isSub) {
      setCurrentIndex(id);
    } else {
      setCurrentHeadIndex(id);
    }

  }

  function onRenameCollection(evt: React.MouseEvent<HTMLElement>, id: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.renameCollectionRequest, data: id });
    setCurrentHeadIndex("");
  }

  function onDeleteCollection(evt: React.MouseEvent<HTMLElement>, id: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.deleteCollectionRequest, data: id });
    setCurrentHeadIndex("");
  }

  function onRename(evt: React.MouseEvent<HTMLElement>, colId: string, historyId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.renameCollectionItemRequest, data: { colId: colId, historyId: historyId } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onDelete(evt: React.MouseEvent<HTMLElement>, colId: string, historyId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.deleteCollectionItemRequest, data: { colId: colId, historyId: historyId } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onDuplicate(evt: React.MouseEvent<HTMLElement>, colId: string, createdTime: string, name: string, variableId: string, history: IHistory) {
    evt.preventDefault();
    evt.stopPropagation();
    let collection: ICollections = {
      id: colId,
      createdTime: createdTime,
      name: name,
      data: [history],
      variableId: variableId
    };
    vscode.postMessage({ type: requestTypes.duplicateCollectionsRequest, data: collection });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onExport(evt: React.MouseEvent<HTMLElement>, cols: ICollections, hisId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.exportRequest, data: { cols: cols, hisId: hisId } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onAttach(evt: React.MouseEvent<HTMLElement>, cols: ICollections) {
    evt.preventDefault();
    evt.stopPropagation();
    if (!cols.variableId) {
      vscode.postMessage({ type: requestTypes.attachVariableRequest, data: { id: cols.id, name: cols.name } });
    } else {
      vscode.postMessage({ type: requestTypes.removeVariableRequest, data: { id: cols.id } });
    }
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onCopyTo(evt: React.MouseEvent<HTMLElement>, cols: ICollections) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.copyToCollectionsRequest, data: { id: cols.id, name: cols.name.toUpperCase().trim() === "DEFAULT" ? "Default Copy" : cols.name } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onClear(evt: React.MouseEvent<HTMLElement>, colId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.clearRequest, data: colId });
    setCurrentHeadIndex("");
  }

  function onClickHistory(evt: React.MouseEvent<HTMLElement>, id: string, name: string, variableId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    setSelectedItem(id);
    vscode.postMessage({ type: requestTypes.openHistoryItemRequest, data: { id: id, name: name, varId: variableId } });
  }

  function filterHistory(history: IHistory[]) {
    return history
      .filter(el =>
        el.name?.toLowerCase().includes(props.filterCondition)
        || el.url?.toLowerCase().includes(props.filterCondition)
        || el.method?.toLowerCase().includes(props.filterCondition)
        || el.createdTime?.toLowerCase().includes(props.filterCondition)
      );
  }

  function filterCollections(cols: ICollections[]) {
    let filCol: ICollections[] = [];
    for (let i = 0; i < cols.length; i++) {
      let filItems = filterHistory(cols[i].data);
      if (filItems.length > 0) {
        filCol.push({
          id: cols[i].id,
          createdTime: cols[i].createdTime,
          name: cols[i].name,
          data: filItems,
          variableId: cols[i].variableId
        });
      }
    }

    return filCol;
  }

  function getCollectionBody() {
    if (props.filterCondition) {
      return (
        filterCollections(collections)
          .map((col, index) => {
            return getCollectionItems(col, index);
          })
      );
    } else {
      return (
        collections.map((col, index) => {
          return getCollectionItems(col, index);
        })
      );
    }
  }

  function getVariableName(varId: string) {
    const varItem = variable.find(item => item.id === varId);
    return <div className="activity-item-row-2">
      <label>Variable : {varItem?.name ? varItem.name : "-"}</label>
    </div>;
  }

  function runAll(evt: React.MouseEvent<HTMLElement>, id: string, name: string, varId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.runAllUIOpenRequest, data: { id: id, name: name, varId: varId } });
    setCurrentHeadIndex("");
  }

  function addNewRequest(evt: React.MouseEvent<HTMLElement>, colId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    let newReq: IRequestModel = InitialState;
    newReq.id = uuidv4();
    newReq.name = "New Request";
    newReq.url= "localhost";
    newReq.createdTime = formatDate();
    vscode.postMessage({ type: requestTypes.createNewRequest, data: { request: newReq, colId: colId } });
    setCurrentHeadIndex("");
  }

  function getCollectionItems(item: ICollections, index: number) {
    return (
      <details open={props.filterCondition ? true : false} key={"collections-" + item.id}>
        <summary className="collection-items">
          {item.name}
          <div className={item.id === currentHeadIndex ? "more-icon display-block" : "more-icon"} ref={el => moreHeadMenuWrapperRef.current[item.id] = el}>
            <DotsLogo id={"three-dots-" + item.id} onClick={(e) => openMoreMenu(e, item.id)} />
            <input type="checkbox" className="dd-input" checked={item.id === currentHeadIndex} readOnly />
            <div id={"drop-down-menu-" + item.id} className="dropdown-more" style={styles.bottomStyle}>
              <button onClick={(e) => addNewRequest(e, item.id)}>New Request</button>
              <div className="divider"></div>
              <button onClick={(e) => runAll(e, item.id, item.name, item.variableId)}>Run All</button>
              {index !== 0 && <div className="divider"></div>}
              {index !== 0 && <><button onClick={(e) => onRenameCollection(e, item.id)}>Rename</button>
                <button onClick={(e) => onDeleteCollection(e, item.id)}>Delete</button></>}
              <button onClick={(e) => onClear(e, item.id)}>Clear Items</button>
              <div className="divider"></div>
              <button onClick={(e) => onCopyTo(e, item)}>Copy To</button>
              <button onClick={(e) => onAttach(e, item)}>{item.variableId ? "Remove Variable" : "Attach Variable"}</button>
              <div className="divider"></div>
              <button onClick={(e) => onExport(e, item, "")}>Export</button>
            </div>
          </div>
        </summary>
        <div className="collction-item">
          {
            item.data && item.data.map((listItem) => {
              return (
                <div key={"collections-item-" + listItem.id} className={selectedItem === listItem.id ? "activity-items selected-item" : "activity-items"} onClick={(e) => onClickHistory(e, listItem.id, listItem.name, item.variableId)}>
                  <div className="activity-item-row-1">
                    <label className={"activity-method " + getMethodClassName(listItem.method.toUpperCase())}>{getMethodName(listItem.method.toUpperCase())}</label>
                    <label className="activity-url">{listItem.name.replace(/^https?:\/\//, '')}</label>
                  </div>
                  {getVariableName(item.variableId)}
                  <div className="activity-item-row-2">
                    <label>{getDays(listItem.createdTime, new Date())}</label>
                    <div className={listItem.id === currentIndex ? "more-icon display-block" : "more-icon"} ref={el => moreMenuWrapperRef.current[listItem.id] = el}>
                      <DotsLogo id={"three-dots-" + listItem.id} onClick={(e) => openMoreMenu(e, listItem.id, true)} />
                      <input type="checkbox" className="dd-input" checked={listItem.id === currentIndex} readOnly />
                      <div id={"drop-down-menu-" + listItem.id} className="dropdown-more" style={styles.bottomStyle}>
                        <button onClick={(e) => onRename(e, item.id, listItem.id)}>Rename</button>
                        <button onClick={(e) => onDelete(e, item.id, listItem.id)}>Delete</button>
                        <button onClick={(e) => onDuplicate(e, item.id, item.createdTime, item.name, item.variableId, listItem)}>Duplicate</button>
                        <div className="divider"></div>
                        <button onClick={(e) => onExport(e, item, listItem.id)}>Export</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </details >
    );
  }

  function handleClickOutside(evt: any) {
    if (moreHeadMenuWrapperRef.current && moreHeadMenuWrapperRef.current[refHeadIndex.current] && !moreHeadMenuWrapperRef.current[refHeadIndex.current].contains(evt.target)) {
      setCurrentHeadIndex("");
    }

    if (moreMenuWrapperRef.current && moreMenuWrapperRef.current[refIndex.current] && !moreMenuWrapperRef.current[refIndex.current].contains(evt.target)) {
      setCurrentIndex("");
    }
  }

  return (
    <>
      {
        props.isLoading ?
          <>
            <div id="divSpinner" className="spinner loading"></div>
            <div className="loading-history-text">{"Loading...."}</div>
          </>
          :
          collections.length > 0 ?
            getCollectionBody()
            :
            <div className="no-history-text">{"No Collections Available"}</div>
      }
    </>
  );
};