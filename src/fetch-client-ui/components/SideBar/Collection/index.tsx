import React, { useEffect, useRef, useState } from "react";
import { ReactComponent as DotsLogo } from '../../../../../icons/dots.svg';
import { useSelector } from "react-redux";
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import { IRootState } from "../../../reducer/combineReducer";
import vscode from "../../Common/vscodeAPI";
import { ICollections, IFolder, IHistory } from "../redux/types";
import { getDays, getMethodClassName, getMethodName, isFolder } from "../util";
import { v4 as uuidv4 } from 'uuid';
import { formatDate } from "../../../../utils/helper";
import { IRequestModel } from "../../RequestUI/redux/types";
import { InitialState } from "../../RequestUI/redux/reducer";
import "./style.css";
import { SettingsType } from "../../Collection/consts";
import { InitialSettings } from "../redux/reducer";

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

  const [isCopied, setCopy] = useState(false);

  const styles = {
    bottomStyle: {
      bottom: ddPosition
    } as React.CSSProperties,
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside, false);

    window.addEventListener("message", (event) => {
      if (event.data && event.data.type === responseTypes.copyItemResponse) {
        setCopy(true);
      } else if (event.data && event.data.type === responseTypes.pasteItemResponse) {
        setCopy(false);
      }
    });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside, false);
    };
  }, []);

  function openMoreMenu(e: any, id: string, isSub: boolean = false) {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(id, isSub);
  }

  function openContextMenu(id: string, isSub: boolean) {
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

  function onDeleteCollection(evt: React.MouseEvent<HTMLElement>, id: string, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.deleteCollectionRequest, data: id, name: name });
    setCurrentHeadIndex("");
  }

  function onRename(evt: React.MouseEvent<HTMLElement>, colId: string, historyId: string, folderId: string, isFolder: boolean) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.renameCollectionItemRequest, data: { colId: colId, historyId: historyId, folderId: folderId, isFolder: isFolder } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onCopy(evt: React.MouseEvent<HTMLElement>, history: IHistory) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.copyItemRequest, data: { history: history } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onPaste(evt: React.MouseEvent<HTMLElement>, colId: string, folderData: IFolder, isFolder: boolean) {
    evt.preventDefault();
    evt.stopPropagation();

    let folder: IFolder;

    if (isFolder) {
      folder = {
        id: folderData.id,
        name: folderData.name,
        createdTime: folderData.createdTime,
        type: "folder",
        data: [],
        settings: folderData.settings ? folderData.settings : InitialSettings
      };
    }

    let collection: ICollections = {
      id: colId,
      createdTime: formatDate(),
      name: "Copy",
      data: isFolder ? [folder] : [],
      variableId: "",
      settings: InitialSettings
    };

    vscode.postMessage({ type: requestTypes.pasteItemRequest, data: { col: collection, isFolder: isFolder } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onDelete(evt: React.MouseEvent<HTMLElement>, colId: string, folderId: string, historyId: string, isFolder: boolean, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.deleteCollectionItemRequest, data: { colId: colId, folderId: folderId, historyId: historyId, isFolder: isFolder, name: name } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onDuplicate(evt: React.MouseEvent<HTMLElement>, coldId: string, folderId: string, historyId: string, isFolder: boolean) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.duplicateCollectionsRequest, data: { coldId: coldId, folderId: folderId, historyId: historyId, isFolder: isFolder } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onExport(evt: React.MouseEvent<HTMLElement>, colId: string, hisId: string, folderId: string, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.exportRequest, data: { colId: colId, hisId: hisId, folderId: folderId, name: name } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onSettings(evt: React.MouseEvent<HTMLElement>, colId: string, folderId: string, type: string, name: string, varId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.openColSettingsRequest, data: { colId: colId, folderId: folderId, type: type, name: name, varId: varId } });
    setCurrentIndex("");
    setCurrentHeadIndex("");
  }

  function onAttach(evt: React.MouseEvent<HTMLElement>, cols: ICollections) {
    evt.preventDefault();
    evt.stopPropagation();
    if (!cols.variableId) {
      vscode.postMessage({ type: requestTypes.attachVariableRequest, data: { id: cols.id, name: cols.name } });
    } else {
      vscode.postMessage({ type: requestTypes.removeVariableRequest, data: { id: cols.id, name: cols.name } });
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

  function onClear(evt: React.MouseEvent<HTMLElement>, colId: string, folderId: string, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.clearRequest, data: { colId: colId, folderId: folderId, name: name } });
    setCurrentHeadIndex("");
  }

  function onClickHistory(evt: React.MouseEvent<HTMLElement>, colId: string, folderId: string, itemId: string, name: string, variableId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    setSelectedItem(itemId);
    vscode.postMessage({ type: requestTypes.openHistoryItemRequest, data: { colId: colId, folderId: folderId, id: itemId, name: name, varId: variableId } });
  }

  function hasData(history: IHistory): boolean {
    return history && (history.name?.toLowerCase().includes(props.filterCondition)
      || history.url?.toLowerCase().includes(props.filterCondition)
      || history.method?.toLowerCase().includes(props.filterCondition)
      || history.createdTime?.toLowerCase().includes(props.filterCondition));
  }


  function findData(source: any, dest: any) {
    let folders = source.data.filter((item: any) => item.data !== undefined);
    let histories = source.data.filter((item: any) => item.data === undefined);

    let filteredData = histories?.filter((history: any) =>
      history.name?.toLowerCase().includes(props.filterCondition)
      || history.url?.toLowerCase().includes(props.filterCondition)
      || history.method?.toLowerCase().includes(props.filterCondition)
      || history.createdTime?.toLowerCase().includes(props.filterCondition)
    );

    if (filteredData?.length > 0) {
      dest.data = filteredData;
    } else {
      dest.data = [];
    }

    if (folders.length === 0) {
      return dest;
    }

    for (let i = 0; i < folders.length; i++) {
      let result = findData(folders[i], JSON.parse(JSON.stringify(folders[i])));
      if (result.data.length > 0) {
        dest.data = dest.data.concat(result);
      }
    }

    return dest;
  }

  function filterCollections(cols: ICollections[]) {
    let filCol: ICollections[] = [];

    for (let i = 0; i < cols.length; i++) {
      let result = findData(cols[i], JSON.parse(JSON.stringify(cols[i])));
      if (result.data.length > 0) {
        filCol.push(result);
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

  function getVariableName(varId: string, isFolder: boolean = false) {
    const varItem = variable.find(item => item.id === varId);
    return <div className={isFolder ? "activity-item-row-2 folder-activity-item-row-1" : "activity-item-row-2"}>
      <label>Variable : {varItem?.name ? varItem.name : "-"}</label>
    </div>;
  }

  function onRunAll(evt: React.MouseEvent<HTMLElement>, colId: string, folderId: string, name: string, varId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.runAllUIOpenRequest, data: { colId: colId, folderId: folderId, name: name, varId: varId } });
    setCurrentHeadIndex("");
  }

  function addNewRequest(evt: React.MouseEvent<HTMLElement>, colId: string, folderId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    let newReq: IRequestModel = InitialState;
    newReq.id = uuidv4();
    newReq.name = "New Request";
    newReq.url = "localhost";
    newReq.createdTime = formatDate();
    vscode.postMessage({ type: requestTypes.createNewRequest, data: { request: newReq, colId: colId, folderId: folderId } });
    setCurrentHeadIndex("");
  }

  function addNewFolder(evt: React.MouseEvent<HTMLElement>, colId: string, folderId: string) {
    evt.preventDefault();
    evt.stopPropagation();
    let newFolder: IFolder = {
      id: uuidv4(),
      name: "New Folder",
      type: "folder",
      createdTime: formatDate(),
      data: [],
      settings: InitialSettings
    };

    newFolder.settings.auth.authType = "inherit";

    vscode.postMessage({ type: requestTypes.createNewFolderRequest, data: { folder: newFolder, colId: colId, folderId: folderId } });
    setCurrentHeadIndex("");
  }

  function onColRightClick(e: any, id: string, isSub: boolean = false) {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(id, isSub);
  }

  function onItemRightClick(e: any, id: string, isSub: boolean = false) {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(id, isSub);
  }

  function getPaddingLeft(level: number) {
    const paddingStyle = {
      "--b-pl": ((level + 1) * 5) + "px",
      "--pl": ((level * 5) + 40) + "px",
      "--fpl": (((level + 2) * 5) + 2) + "px",
    };

    return paddingStyle as React.CSSProperties;
  }

  function getFolderItems(cols: ICollections, item: IFolder, variableId: string, level: number) {
    return (
      <details className="folder-details-items" style={getPaddingLeft(level)} open={props.filterCondition ? true : false} key={"folder-" + item.id}>
        <summary className="folder-items" onContextMenu={(e) => onColRightClick(e, item.id)}>
          {item.name}
          <div className={item.id === currentHeadIndex ? "more-icon display-block" : "more-icon"} ref={el => moreHeadMenuWrapperRef.current[item.id] = el}>
            <DotsLogo id={"three-dots-" + item.id} onClick={(e) => openMoreMenu(e, item.id)} />
            <input type="checkbox" className="dd-input" checked={item.id === currentHeadIndex} readOnly />
            <div id={"drop-down-menu-" + item.id} className="dropdown-more" style={styles.bottomStyle}>
              <button onClick={(e) => addNewRequest(e, cols.id, item.id)}>New Request</button>
              <button onClick={(e) => addNewFolder(e, cols.id, item.id)}>New Folder</button>
              <div className="divider"></div>
              <button onClick={(e) => onRunAll(e, cols.id, item.id, cols.name + " \\ " + item.name, cols.variableId)}>Run All</button>
              <div className="divider"></div>
              <button onClick={(e) => onRename(e, cols.id, "", item.id, true)}>Rename</button>
              <button onClick={(e) => onDelete(e, cols.id, item.id, "", true, item.name)}>Delete</button>
              <button onClick={(e) => onClear(e, cols.id, item.id, item.name)}>Clear Items</button>
              {isCopied && <button onClick={(e) => onPaste(e, cols.id, item, true)}>Paste</button>}
              <button onClick={(e) => onDuplicate(e, cols.id, item.id, "", true)}>Duplicate</button>
              <div className="divider"></div>
              <button onClick={(e) => onExport(e, cols.id, "", item.id, item.name)}>Export</button>
              <button onClick={(e) => onSettings(e, cols.id, item.id, SettingsType.Folder, item.name, cols.variableId)}>Settings</button>
            </div>
          </div>
        </summary>
        {
          <>
            {
              item.data && item.data.length > 0 && item.data.map((listItem) => {
                if (isFolder(listItem)) {
                  return getFolderItems(cols, (listItem as IFolder), cols.variableId, level + 1);
                }
              })
            }
            {
              item.data && item.data.length > 0 && item.data.map((listItem) => {
                if (!isFolder(listItem)) {
                  return (<div key={"collections-item-" + listItem.id} style={getPaddingLeft(level)} className={selectedItem === listItem.id ? "activity-items folder-activity-items selected-item" : "activity-items folder-activity-items"} onContextMenu={(e) => onItemRightClick(e, listItem.id, true)} onClick={(e) => onClickHistory(e, cols.id, item.id, listItem.id, listItem.name, variableId)}>
                    <div className="activity-item-row-1">
                      <label className={"activity-method " + getMethodClassName((listItem as IHistory).method.toUpperCase())}>{getMethodName((listItem as IHistory).method.toUpperCase())}</label>
                      <label className="activity-url">{listItem.name.replace(/^https?:\/\//, '')}</label>
                    </div>
                    {getVariableName(variableId)}
                    <div className="activity-item-row-2">
                      <label>{getDays(listItem.createdTime, new Date())}</label>
                      <div className={listItem.id === currentIndex ? "more-icon display-block" : "more-icon"} ref={el => moreMenuWrapperRef.current[listItem.id] = el}>
                        <DotsLogo id={"three-dots-" + listItem.id} onClick={(e) => openMoreMenu(e, listItem.id, true)} />
                        <input type="checkbox" className="dd-input" checked={listItem.id === currentIndex} readOnly />
                        <div id={"drop-down-menu-" + listItem.id} className="dropdown-more" style={styles.bottomStyle}>
                          <button onClick={(e) => onRename(e, cols.id, listItem.id, item.id, false)}>Rename</button>
                          <button onClick={(e) => onCopy(e, listItem as IHistory)}>Copy</button>
                          <button onClick={(e) => onDelete(e, cols.id, item.id, listItem.id, false, listItem.name)}>Delete</button>
                          <button onClick={(e) => onDuplicate(e, cols.id, item.id, listItem.id, false)}>Duplicate</button>
                          <div className="divider"></div>
                          <button onClick={(e) => onExport(e, cols.id, listItem.id, item.id, listItem.name)}>Export</button>
                        </div>
                      </div>
                    </div>
                  </div>);
                }
              })
            }
          </>
        }
      </details >
    );
  }

  function getCollectionItems(item: ICollections, index: number) {
    return (
      <details open={props.filterCondition ? true : false} key={"collections-" + item.id}>
        <summary className="collection-items" onContextMenu={(e) => onColRightClick(e, item.id)} >
          {item.name}
          <div className={item.id === currentHeadIndex ? "more-icon display-block" : "more-icon"} ref={el => moreHeadMenuWrapperRef.current[item.id] = el}>
            <DotsLogo id={"three-dots-" + item.id} onClick={(e) => openMoreMenu(e, item.id)} />
            <input type="checkbox" className="dd-input" checked={item.id === currentHeadIndex} readOnly />
            <div id={"drop-down-menu-" + item.id} className="dropdown-more" style={styles.bottomStyle}>
              <button onClick={(e) => addNewRequest(e, item.id, "")}>New Request</button>
              <button onClick={(e) => addNewFolder(e, item.id, "")}>New Folder</button>
              <div className="divider"></div>
              <button onClick={(e) => onRunAll(e, item.id, "", item.name, item.variableId)}>Run All</button>
              {index !== 0 && <div className="divider"></div>}
              {index !== 0 && <><button onClick={(e) => onRenameCollection(e, item.id)}>Rename</button>
                <button onClick={(e) => onDeleteCollection(e, item.id, item.name)}>Delete</button></>}
              <button onClick={(e) => onClear(e, item.id, "", item.name)}>Clear Items</button>
              <div className="divider"></div>
              <button onClick={(e) => onCopyTo(e, item)}>Copy To</button>
              {isCopied && <button onClick={(e) => onPaste(e, item.id, null, false)}>Paste</button>}
              <button onClick={(e) => onDuplicate(e, item.id, "", "", false)}>Duplicate</button>
              <button onClick={(e) => onAttach(e, item)}>{item.variableId ? "Remove Variable" : "Attach Variable"}</button>
              <div className="divider"></div>
              <button onClick={(e) => onExport(e, item.id, "", "", item.name)}>Export</button>
              <button onClick={(e) => onSettings(e, item.id, "", SettingsType.Collection, item.name, item.variableId)}>Settings</button>
            </div>
          </div>
        </summary>
        <div className="collction-item">
          {
            <>
              {
                item.data && item.data.length > 0 && item.data.map((listItem) => {
                  if (isFolder(listItem)) {
                    return getFolderItems(item, (listItem as IFolder), item.variableId, 0);
                  }
                })
              }
              {
                item.data && item.data.length > 0 && item.data.map((listItem) => {
                  if (!isFolder(listItem)) {
                    return (
                      <div key={"collections-item-" + listItem.id} className={selectedItem === listItem.id ? "activity-items selected-item" : "activity-items"} onContextMenu={(e) => onItemRightClick(e, listItem.id, true)} onClick={(e) => onClickHistory(e, item.id, "", listItem.id, listItem.name, item.variableId)}>
                        <div className="activity-item-row-1">
                          <label className={"activity-method " + getMethodClassName((listItem as IHistory).method.toUpperCase())}>{getMethodName((listItem as IHistory).method.toUpperCase())}</label>
                          <label className="activity-url">{listItem.name.replace(/^https?:\/\//, '')}</label>
                        </div>
                        {getVariableName(item.variableId)}
                        <div className="activity-item-row-2">
                          <label>{getDays(listItem.createdTime, new Date())}</label>
                          <div className={listItem.id === currentIndex ? "more-icon display-block" : "more-icon"} ref={el => moreMenuWrapperRef.current[listItem.id] = el}>
                            <DotsLogo id={"three-dots-" + listItem.id} onClick={(e) => openMoreMenu(e, listItem.id, true)} />
                            <input type="checkbox" className="dd-input" checked={listItem.id === currentIndex} readOnly />
                            <div id={"drop-down-menu-" + listItem.id} className="dropdown-more" style={styles.bottomStyle}>
                              <button onClick={(e) => onRename(e, item.id, listItem.id, "", false)}>Rename</button>
                              <button onClick={(e) => onCopy(e, listItem as IHistory)}>Copy</button>
                              <button onClick={(e) => onDelete(e, item.id, "", listItem.id, false, listItem.name)}>Delete</button>
                              <button onClick={(e) => onDuplicate(e, item.id, "", listItem.id, false)}>Duplicate</button>
                              <div className="divider"></div>
                              <button onClick={(e) => onExport(e, item.id, listItem.id, "", listItem.name)}>Export</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                })
              }
            </>
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