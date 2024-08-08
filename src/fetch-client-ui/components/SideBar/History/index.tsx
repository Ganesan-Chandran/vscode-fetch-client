import React, { useEffect, useRef, useState } from "react";
import { ReactComponent as DotsLogo } from '../../../../../icons/dots.svg';
import { useSelector } from "react-redux";
import { requestTypes } from "../../../../utils/configuration";
import { IRootState } from "../../../reducer/combineReducer";
import vscode from "../../Common/vscodeAPI";
import { IHistory } from "../redux/types";
import { getDays, getMethodClassName, getMethodName } from "../util";
import "./style.css";

export interface IHistoryProps {
  filterCondition: string;
  isLoading: boolean;
  selectedItem: {
    itemId: string;
  }
}

export const HistoryBar = (props: IHistoryProps) => {

  const { theme } = useSelector((state: IRootState) => state.uiData);
  const { history } = useSelector((state: IRootState) => state.sideBarData);

  const [ddPosition, setPosition] = useState("");

  const [selectedItem, setSelectedItem] = useState("");

  const [currentIndex, _setCurrentIndex] = useState(-1);

  useEffect(() => {
    setSelectedItem(props.selectedItem.itemId);
  }, [props.selectedItem]);

  const refIndex = useRef(currentIndex);
  const setCurrentIndex = (data: number) => {
    refIndex.current = data;
    _setCurrentIndex(refIndex.current);
  };

  const moreMenuWrapperRef = useRef([]);

  const styles = {
    bottomStyle: {
      bottom: ddPosition
    } as React.CSSProperties,
  };

  useEffect(() => {
    moreMenuWrapperRef.current = moreMenuWrapperRef.current.slice(0, history.length);
  }, [history]);

  function openMoreMenu(evt: any, index: number) {
    evt.preventDefault();
    evt.stopPropagation();
    openContextMenu(index);
  }

  function openContextMenu(index: number) {
    if (currentIndex === index) {
      setCurrentIndex(-1);
      return;
    }

    let element = document.getElementById("three-dots-" + index);
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
    setCurrentIndex(index);
  }

  function onSaveToCollection(evt: React.MouseEvent<HTMLElement>, id: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.addToCollectionsRequest, data: id });
    setCurrentIndex(-1);
  }

  function onRename(evt: React.MouseEvent<HTMLElement>, id: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.renameHistoryRequest, data: id });
    setCurrentIndex(-1);
  }

  function onDelete(evt: React.MouseEvent<HTMLElement>, id: string, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    vscode.postMessage({ type: requestTypes.deleteHistoryRequest, data: id, name: name });
    setCurrentIndex(-1);
  }

  function onClickHistory(evt: React.MouseEvent<HTMLElement>, id: string, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    openItem(id, name, evt.ctrlKey ? true : false);
  }

  function onClickNewTab(evt: React.MouseEvent<HTMLElement>, id: string, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    openItem(id, name, true);
    setCurrentIndex(-1);
  }

  function openItem(id: string, name: string, isNewTab: boolean) {
    setSelectedItem(id);
    vscode.postMessage({ type: requestTypes.openHistoryItemRequest, data: { id: id, name: name, isNewTab: isNewTab } });
  }

  function onItemRightClick(e: any, index: number) {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(index);
  }

  function onRunClick(evt: React.MouseEvent<HTMLElement>, itemId: string, name: string) {
    evt.preventDefault();
    evt.stopPropagation();
    setSelectedItem(itemId);
    vscode.postMessage({ type: requestTypes.openAndRunItemRequest, data: { id: itemId, name: name, isNewTab: false } });
    setCurrentIndex(-1);
  }

  function getActivityBody() {
    if (props.filterCondition) {
      return (
        history
          .filter(el => el.name?.toLowerCase().includes(props.filterCondition)
            || el.url?.toLowerCase().includes(props.filterCondition)
            || el.method?.toLowerCase().includes(props.filterCondition)
            || el.createdTime?.toLowerCase().includes(props.filterCondition))
          .map((history, index) => {
            return getHistoryItems(history, index);
          })
      );
    } else {
      return (
        history.map((history, index) => {
          return getHistoryItems(history, index);
        })
      );
    }
  }

  function getThemeColor() {
    if (theme === 1) {
      return "light-theme-boder";
    }

    return "dark-theme-boder";
  }

  function getHistoryItems(history: IHistory, index: number) {
    return (
      <div key={"activity_" + history.id} className={selectedItem === history.id ? `${getThemeColor()} activity-items selected-item` : `${getThemeColor()} activity-items`} onContextMenu={(e) => onItemRightClick(e, index)} onClick={(e) => onClickHistory(e, history.id, history.name)}>
        <div className="activity-item-row-1">
          <label className={"activity-method " + getMethodClassName(history.method.toUpperCase())}>{getMethodName(history.method.toUpperCase())}</label>
          <label className="activity-url">{history.name.replace(/^https?:\/\//, '')}</label>
        </div>
        <div className="activity-item-row-2">
          <label>{getDays(history.createdTime, new Date())}</label>
          <div className={index === currentIndex ? "more-icon display-block" : "more-icon"} ref={el => moreMenuWrapperRef.current[index] = el}>
            <DotsLogo id={"three-dots-" + history.id} onClick={(e) => openMoreMenu(e, index)} />
            <input type="checkbox" className="dd-input" checked={index === currentIndex} readOnly={true} />
            <div id={"drop-down-menu-" + history.id} className="dropdown-more" style={styles.bottomStyle}>
              <button onClick={(e) => onClickNewTab(e, history.id, history.name)}>Open in New Tab</button>
              <button onClick={(e) => onRunClick(e, history.id, history.name)}>Run Request</button>
              <div className="divider"></div>
              <button onClick={(e) => onSaveToCollection(e, history.id)}>Save to Collection</button>
              <button onClick={(e) => onRename(e, history.id)}>Rename</button>
              <button onClick={(e) => onDelete(e, history.id, history.name)}>Delete</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function handleClickOutside(evt: any) {
    if (moreMenuWrapperRef.current && moreMenuWrapperRef.current[refIndex.current] && !moreMenuWrapperRef.current[refIndex.current].contains(evt.target)) {
      setCurrentIndex(-1);
    }
  }

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside, false);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, false);
    };
  }, []);


  return (
    <>
      {
        props.isLoading ?
          <>
            <div id="divSpinner" className="spinner loading"></div>
            <div className="loading-history-text">{"Loading...."}</div>
          </>
          :
          history.length > 0 ?
            getActivityBody()
            :
            <div className="no-history-text">{"No History Available"}</div>
      }
    </>
  );
};