import "./style.css";
import { DropdownPortal } from "../dropdownMenu";
import { getDays, getMethodClassName, getMethodName } from "../util";
import { IHistory } from "../../../../fetch-client-core/types/sidebar.types";
import { IRootState } from "../../../reducer/combineReducer";
import { ReactComponent as DotsLogo } from '../../../../../icons/dots.svg';
import { requestTypes } from "../../../../fetch-client-core/consts/requestTypes.consts";
import { useSelector } from "react-redux";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../../Common/vscodeAPI";

export interface IHistoryProps {
	filterCondition: string;
	isLoading: boolean;
	selectedItem: {
		itemId: string;
	},
	viewMode: "list" | "folder";
}

export type HistoryBucket =
	| "Today"
	| "Yesterday"
	| "This Week"
	| "Last Week"
	| "This Month"
	| "Last Month"
	| "Older";

const BUCKET_ORDER: HistoryBucket[] = [
	"Today", "Yesterday", "This Week", "Last Week", "This Month", "Last Month", "Older"
];

function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

function startOfWeek(d: Date): Date {
	// Monday-start week; adjust to Sunday-start if your locale prefers that
	const x = startOfDay(d);
	const day = x.getDay();
	const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
	x.setDate(x.getDate() + diff);
	return x;
}

export function getHistoryBucket(createdTime: string, now: Date = new Date()): HistoryBucket {
	const created = new Date(createdTime);

	const today = startOfDay(now);
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const thisWeekStart = startOfWeek(now);
	const lastWeekStart = new Date(thisWeekStart);
	lastWeekStart.setDate(lastWeekStart.getDate() - 7);

	const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

	if (created >= today) { return "Today"; }
	if (created >= yesterday) { return "Yesterday"; }
	if (created >= thisWeekStart) { return "This Week"; }
	if (created >= lastWeekStart) { return "Last Week"; }
	if (created >= thisMonthStart) { return "This Month"; }
	if (created >= lastMonthStart) { return "Last Month"; }
	return "Older";
}

export function groupHistoryByBucket(history: IHistory[]): Map<HistoryBucket, IHistory[]> {
	const map = new Map<HistoryBucket, IHistory[]>();
	BUCKET_ORDER.forEach(b => map.set(b, []));

	for (const item of history) {
		const bucket = getHistoryBucket(item.createdTime);
		map.get(bucket)!.push(item);
	}

	// drop empty buckets, preserve order
	for (const b of BUCKET_ORDER) {
		if (map.get(b)!.length === 0) { map.delete(b); }
	}

	return map;
}

export const HistoryBar = (props: IHistoryProps) => {

	const { theme } = useSelector((state: IRootState) => state.uiData);
	const { history } = useSelector((state: IRootState) => state.sideBarData);

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
						<DropdownPortal id={history.id} open={index === currentIndex}>
							<button onClick={(e) => onClickNewTab(e, history.id, history.name)}>Open in New Tab</button>
							<button onClick={(e) => onRunClick(e, history.id, history.name)}>Run Request</button>
							<div className="divider"></div>
							<button onClick={(e) => onSaveToCollection(e, history.id)}>Save to Collection</button>
							<button onClick={(e) => onRename(e, history.id)}>Rename</button>
							<button onClick={(e) => onDelete(e, history.id, history.name)}>Delete</button>
						</DropdownPortal>
					</div>
				</div>
			</div>
		);
	}

	function handleClickOutside(evt: any) {
		const triggerEl = moreMenuWrapperRef.current[refIndex.current];
		const menuEl = document.getElementById("drop-down-menu-" + (history[refIndex.current]?.id ?? ""));
		if (triggerEl && !triggerEl.contains(evt.target) && !(menuEl && menuEl.contains(evt.target))) {
			setCurrentIndex(-1);
		}
	}

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside, false);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside, false);
		};
	}, []);

	function getFolderBody() {
		const sourceHistory = props.filterCondition
			? history.filter(el =>
				el.name?.toLowerCase().includes(props.filterCondition)
				|| el.url?.toLowerCase().includes(props.filterCondition)
				|| el.method?.toLowerCase().includes(props.filterCondition)
				|| el.createdTime?.toLowerCase().includes(props.filterCondition))
			: history;

		const grouped = groupHistoryByBucket(sourceHistory);

		return Array.from(grouped.entries()).map(([bucket, items]) => (
			<details className="history-bucket" open={props.filterCondition ? true : (bucket === "Today" || bucket === "Yesterday")} key={"bucket-" + bucket}>
				<summary className="history-bucket-summary">
					<div className="col-fol-title">{bucket}</div>
				</summary>
				{
					items.map((h) => {
						const globalIndex = history.indexOf(h);
						return getHistoryItems(h, globalIndex);
					})
				}
			</details >
		));
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
					history.length > 0 ?
						(props.viewMode === "folder" ? getFolderBody() : getActivityBody())
						:
						<div className="no-history-text">{"No History Available"}</div>
			}
		</>
	);
};
