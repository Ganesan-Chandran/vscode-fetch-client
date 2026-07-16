import "./style.css";
import { DropdownPortal } from "../dropdownMenu";
import {
	formatDate,
	getDays,
} from "../../../../fetch-client-core/helpers/dateTime.helper";
import { getColFolDotMenu, getPlusIconSVG } from "../../Common/icons";
import { getMethodClassName, getMethodName } from "../util";
import {
	ICollections,
	IHistory,
	IFolder,
} from "../../../../fetch-client-core/types/sidebar.types";
import { InitialSettings } from "../../../../fetch-client-core/consts/initialValues.consts";
import { InitialState } from "../../RequestUI/redux/reducer";
import { IRequestModel } from "../../../../fetch-client-core/types/request.types";
import { IRootState } from "../../../reducer/combineReducer";
import { isFolder } from "../../../../fetch-client-core/helpers/common.helper";
import { ReactComponent as DotsLogo } from "../../../../../icons/dots.svg";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import { SettingsType } from "../../../../fetch-client-core/consts/common.consts";
import { useSelector } from "react-redux";
import { v4 as uuidv4 } from "uuid";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../../Common/vscodeAPI";

export interface ICollectionProps {
	filterCondition: string;
	isLoading: boolean;
	selectedItem: {
		colId: string;
		foldId: string;
		itemId: string;
	};
	sort: number;
}

type SortOrder = "asc" | "dsc";

export const CollectionBar = (props: ICollectionProps) => {
	const { collections, variable } = useSelector(
		(state: IRootState) => state.sideBarData,
	);
	const { theme } = useSelector((state: IRootState) => state.uiData);

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

	const [isCopied, setCopy] = useState(false);

	useEffect(() => {
		const handleBlur = () => {
			setCurrentHeadIndex("");
			setCurrentIndex("");
		};
		document.addEventListener("mousedown", handleClickOutside, false);
		window.addEventListener("blur", handleBlur);

		const handleMessage = (event: MessageEvent) => {
			if (event.data && event.data.type === responseTypes.copyItemResponse) {
				setCopy(true);
			} else if (
				event.data &&
				event.data.type === responseTypes.pasteItemResponse
			) {
				setCopy(false);
			}
		};
		window.addEventListener("message", handleMessage);

		document.addEventListener("keydown", function (e) {
			e.stopPropagation();
			if (e.key === "Escape" && (refIndex.current || refHeadIndex.current)) {
				setCurrentIndex("");
				setCurrentHeadIndex("");
			}
		});

		return () => {
			document.removeEventListener("mousedown", handleClickOutside, false);
			window.removeEventListener("blur", handleBlur);
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	const [colState, _setColState] = useState<ICollections[]>(collections);
	const refCol = useRef(colState);
	const setColState = (data: ICollections[]) => {
		refCol.current = data;
		_setColState(refCol.current);
	};

	useEffect(() => {
		if (props.sort === 0) {
			setColState(collections);
		} else if (props.sort === 1) {
			if (colState?.length > 0) {
				setColState(
					[...collections].sort(
						(a, b) => b.name !== "Default" && a.name.localeCompare(b.name),
					),
				);
			}
		} else {
			if (colState?.length > 0) {
				setColState(
					[...collections].sort(
						(a, b) => b.name !== "Default" && b.name.localeCompare(a.name),
					),
				);
			}
		}
	}, [props.sort, collections, collections.length]);

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

		if (isSub) {
			setCurrentIndex(id);
		} else {
			setCurrentHeadIndex(id);
		}
	}

	function onRenameCollection(evt: React.MouseEvent<HTMLElement>, id: string) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.renameCollectionRequest,
			data: id,
		});
		setCurrentHeadIndex("");
	}

	function onDeleteCollection(
		evt: React.MouseEvent<HTMLElement>,
		id: string,
		name: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.deleteCollectionRequest,
			data: id,
			name: name,
		});
		setCurrentHeadIndex("");
	}

	function onRename(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		historyId: string,
		folderId: string,
		isFolder: boolean,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.renameCollectionItemRequest,
			data: {
				colId: colId,
				historyId: historyId,
				folderId: folderId,
				isFolder: isFolder,
			},
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onCopy(evt: React.MouseEvent<HTMLElement>, history: IHistory) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.copyItemRequest,
			data: { history: history },
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onPaste(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderData: IFolder,
		isFolder: boolean,
	) {
		evt.preventDefault();
		evt.stopPropagation();

		let folder: IFolder;

		if (isFolder) {
			folder = {
				id: folderData.id,
				name: folderData.name,
				createdTime: folderData.createdTime,
				modifiedTime: folderData.modifiedTime,
				type: "folder",
				data: [],
				settings: folderData.settings ? folderData.settings : InitialSettings,
			};
		}

		let collection: ICollections = {
			id: colId,
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			name: "Copy",
			data: isFolder ? [folder] : [],
			variableId: "",
			settings: InitialSettings,
		};

		vscode.postMessage({
			type: requestTypes.pasteItemRequest,
			data: { col: collection, isFolder: isFolder },
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onDelete(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		historyId: string,
		isFolder: boolean,
		name: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.deleteCollectionItemRequest,
			data: {
				colId: colId,
				folderId: folderId,
				historyId: historyId,
				isFolder: isFolder,
				name: name,
			},
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onDuplicate(
		evt: React.MouseEvent<HTMLElement>,
		coldId: string,
		folderId: string,
		historyId: string,
		isFolder: boolean,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.duplicateCollectionsRequest,
			data: {
				coldId: coldId,
				folderId: folderId,
				historyId: historyId,
				isFolder: isFolder,
			},
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onExport(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		hisId: string,
		folderId: string,
		name: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.exportRequest,
			data: { colId: colId, hisId: hisId, folderId: folderId, name: name },
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onSettings(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		type: string,
		name: string,
		varId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.openColSettingsRequest,
			data: {
				colId: colId,
				folderId: folderId,
				type: type,
				name: name,
				varId: varId,
			},
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onAttach(evt: React.MouseEvent<HTMLElement>, cols: ICollections) {
		evt.preventDefault();
		evt.stopPropagation();
		if (!cols.variableId) {
			vscode.postMessage({
				type: requestTypes.attachVariableRequest,
				data: { id: cols.id, name: cols.name },
			});
		} else {
			vscode.postMessage({
				type: requestTypes.removeVariableRequest,
				data: { id: cols.id, name: cols.name },
			});
		}
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onCopyTo(evt: React.MouseEvent<HTMLElement>, cols: ICollections) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.copyToCollectionsRequest,
			data: {
				id: cols.id,
				name:
					cols.name.toUpperCase().trim() === "DEFAULT"
						? "Default Copy"
						: cols.name,
			},
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function onClear(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		name: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.clearRequest,
			data: { colId: colId, folderId: folderId, name: name },
		});
		setCurrentHeadIndex("");
	}

	function onClickHistory(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		itemId: string,
		name: string,
		variableId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		openItem(
			colId,
			folderId,
			itemId,
			name,
			variableId,
			evt.ctrlKey ? true : false,
		);
	}

	function onClickNewTab(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		itemId: string,
		name: string,
		variableId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		openItem(colId, folderId, itemId, name, variableId, true);
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function openItem(
		colId: string,
		folderId: string,
		itemId: string,
		name: string,
		variableId: string,
		isNewTab: boolean,
	) {
		setSelectedItem(itemId);
		vscode.postMessage({
			type: requestTypes.openHistoryItemRequest,
			data: {
				colId: colId,
				folderId: folderId,
				id: itemId,
				name: name,
				varId: variableId,
				isNewTab: isNewTab,
			},
		});
	}

	function onRunClick(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		itemId: string,
		name: string,
		variableId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		setSelectedItem(itemId);
		vscode.postMessage({
			type: requestTypes.openAndRunItemRequest,
			data: {
				colId: colId,
				folderId: folderId,
				id: itemId,
				name: name,
				varId: variableId,
				isNewTab: false,
			},
		});
		setCurrentIndex("");
		setCurrentHeadIndex("");
	}

	function findData(source: any, dest: any) {
		let folders = source.data.filter((item: any) => item.data !== undefined);
		let histories = source.data.filter((item: any) => item.data === undefined);

		let filteredData = histories?.filter(
			(history: any) =>
				history.name?.toLowerCase().includes(props.filterCondition) ||
				history.url?.toLowerCase().includes(props.filterCondition) ||
				history.method?.toLowerCase().includes(props.filterCondition) ||
				history.createdTime?.toLowerCase().includes(props.filterCondition),
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
			return filterCollections(colState).map((col, index) => {
				return getCollectionItems(col, index);
			});
		} else {
			return colState.map((col, index) => {
				return getCollectionItems(col, index);
			});
		}
	}

	function getVariableName(varId: string, isFolder: boolean = false) {
		const varItem = variable.find((item) => item.id === varId);
		return (
			<div
				className={
					isFolder
						? "activity-item-row-2 folder-activity-item-row-1"
						: "activity-item-row-2"
				}
			>
				<label>Variable : {varItem?.name ? varItem.name : "-"}</label>
			</div>
		);
	}

	function onRunAll(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		name: string,
		varId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.runAllUIOpenRequest,
			data: { colId: colId, folderId: folderId, name: name, varId: varId },
		});
		setCurrentHeadIndex("");
	}

	function onPerfTest(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
		name: string,
		varId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.runPerfTestUIOpenRequest,
			data: { colId: colId, folderId: folderId, name: name, varId: varId },
		});
		setCurrentHeadIndex("");
	}

	function onReOrderItems(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId?: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.reOrderItemUIOpenRequest,
			data: { colId: colId, folderId: folderId },
		});
		setCurrentHeadIndex("");
	}

	function addNewRequest(
		evt: React.MouseEvent<HTMLElement> | React.MouseEvent<SVGSVGElement>,
		colId: string,
		folderId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		let newReq: IRequestModel = InitialState;
		newReq.id = uuidv4();
		newReq.name = "New Request";
		newReq.url = "localhost";
		newReq.createdTime = formatDate();
		vscode.postMessage({
			type: requestTypes.createNewRequest,
			data: { request: newReq, colId: colId, folderId: folderId },
		});
		setCurrentHeadIndex("");
	}

	function addNewFolder(
		evt: React.MouseEvent<HTMLElement>,
		colId: string,
		folderId: string,
	) {
		evt.preventDefault();
		evt.stopPropagation();
		let newFolder: IFolder = {
			id: uuidv4(),
			name: "New Folder",
			type: "folder",
			createdTime: formatDate(),
			modifiedTime: formatDate(),
			data: [],
			settings: InitialSettings,
		};

		newFolder.settings.auth.authType = "inherit";

		vscode.postMessage({
			type: requestTypes.createNewFolderRequest,
			data: { folder: newFolder, colId: colId, folderId: folderId },
		});
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

	const sortItems = (
		items: (IHistory | IFolder)[],
		order: SortOrder,
	): (IHistory | IFolder)[] => {
		const folders = items.filter(isFolder);
		const requests = items.filter((item) => !isFolder(item));

		const compare = (a: IHistory | IFolder, b: IHistory | IFolder) => {
			const result = a.name.localeCompare(b.name, undefined, {
				numeric: true,
				sensitivity: "base",
			});
			return order === "asc" ? result : -result;
		};

		folders.sort(compare);
		requests.sort(compare);

		// recursively sort nested folder contents too
		const sortedFolders: IFolder[] = folders.map((folder: IFolder) => ({
			...folder,
			data: folder.data ? sortItems(folder.data, order) : folder.data,
		}));

		return [...sortedFolders, ...requests];
	};

	function onFolderSort(e: any, collectionId: string, folderId?: string) {
		e.preventDefault();
		e.stopPropagation();
		setColState(
			colState.map((col) => {
				if (col.id !== collectionId) {
					return col;
				}

				if (!folderId) {
					const prevOrder = col.settings?.sortOrder ?? "dsc";
					const newOrder: SortOrder = prevOrder === "asc" ? "dsc" : "asc";

					return {
						...col,
						data: col.data ? sortItems(col.data, newOrder) : col.data,
						settings: { ...col.settings, sortOrder: newOrder },
					};
				}

				const updateFolder = (
					items: (IHistory | IFolder)[],
				): (IHistory | IFolder)[] =>
					items.map((item) => {
						if (!isFolder(item)) {
							return item;
						}

						const folderItem = item as IFolder;

						if (folderItem.id === folderId) {
							const prevOrder = folderItem.settings?.sortOrder ?? "asc";
							const newOrder: SortOrder = prevOrder === "asc" ? "dsc" : "asc";

							return {
								...folderItem,
								data: folderItem.data
									? sortItems(folderItem.data, newOrder)
									: folderItem.data,
								settings: { ...folderItem.settings, sortOrder: newOrder },
							};
						}

						return {
							...folderItem,
							data: folderItem.data
								? updateFolder(folderItem.data)
								: folderItem.data,
						};
					});

				return {
					...col,
					data: col.data ? updateFolder(col.data) : col.data,
				};
			}),
		);
	}

	function getPaddingLeft(level: number) {
		const paddingStyle = {
			"--b-pl": (level + 1) * 5 + "px",
			"--pl": level * 5 + 40 + "px",
			"--fpl": (level + 2) * 5 + 2 + "px",
		};

		return paddingStyle as React.CSSProperties;
	}

	useEffect(() => {
		setSelectedItem(props.selectedItem.itemId);
		if (props.selectedItem.foldId) {
			let ele = document.getElementById("folder-" + props.selectedItem.foldId);
			if (ele) {
				ele.setAttribute("open", "true");
			}
		}

		if (props.selectedItem.colId) {
			let ele = document.getElementById(
				"collections-" + props.selectedItem.colId,
			);
			if (ele) {
				ele.setAttribute("open", "true");
			}
		}

		if (props.selectedItem.itemId) {
			let itemElement = document.getElementById(
				"col-activity-item-" + props.selectedItem.itemId,
			);
			let srollPanel = document.querySelector(".activity-items-panel");
			if (itemElement && srollPanel) {
				srollPanel.scroll(0, itemElement.offsetTop - 130);
			}
		}
	}, [props.selectedItem]);

	function getThemeColor() {
		if (theme === 1) {
			return "light-theme-boder";
		}

		return "dark-theme-boder";
	}

	function getFolderItems(
		cols: ICollections,
		item: IFolder,
		variableId: string,
		level: number,
	) {
		return (
			<details
				id={"folder-" + item.id}
				className="folder-details-items"
				style={getPaddingLeft(level)}
				open={props.filterCondition ? true : false}
				key={"folder-" + item.id}
			>
				<summary
					className="folder-items"
					onContextMenu={(e) => onColRightClick(e, item.id)}
				>
					<div className="col-fol-title">{item.name}</div>
					<div
						className={
							item.id === currentHeadIndex
								? "col-fol-icon-panel more-icon display-block"
								: "col-fol-icon-panel more-icon"
						}
						ref={(el) => (moreHeadMenuWrapperRef.current[item.id] = el)}
					>
						{getPlusIconSVG(
							"New Request",
							"add-req-button",
							(e) => {
								e.stopPropagation();
								e.preventDefault();
							},
							(e) => addNewRequest(e, cols.id, item.id),
						)}
						{getColFolDotMenu(
							"three-dots-" + item.id,
							"Folder Menu",
							"col-fol-icon",
							(e) => {
								e.stopPropagation();
								e.preventDefault();
							},
							(e) => openMoreMenu(e, item.id),
						)}
						<input
							type="checkbox"
							className="dd-input"
							checked={item.id === currentHeadIndex}
							readOnly
						/>
						<DropdownPortal id={item.id} open={item.id === currentHeadIndex}>
							<div
								className="parent-menu"
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onContextMenu={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
							>
								{" "}
								New
								<div className="dropdown-more sub-menu new-sub-menu">
									<button onClick={(e) => addNewRequest(e, cols.id, item.id)}>
										Request
									</button>
									<button onClick={(e) => addNewFolder(e, cols.id, item.id)}>
										Folder
									</button>
								</div>
							</div>
							<div className="divider"></div>
							<div
								className="parent-menu"
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onContextMenu={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
							>
								Tools <span className="col-menu-submenu-arrow">›</span>
								<div className="dropdown-more sub-menu tools-sub-menu">
									<button
										onClick={(e) =>
											onRunAll(
												e,
												cols.id,
												item.id,
												cols.name + " \\ " + item.name,
												cols.variableId,
											)
										}
									>
										Run All
									</button>
									<button
										onClick={(e) =>
											onPerfTest(
												e,
												cols.id,
												item.id,
												cols.name + " \\ " + item.name,
												cols.variableId,
											)
										}
									>
										Performance Test
									</button>
									<button
										onClick={(e) =>
											onPerfTest(
												e,
												cols.id,
												item.id,
												cols.name + " \\ " + item.name,
												cols.variableId,
											)
										}
									>
										Data-Driven Test
									</button>
								</div>
							</div>
							<button onClick={(e) => onReOrderItems(e, cols.id, item.id)}>
								Arrange Items
							</button>
							<div className="divider"></div>
							<button onClick={(e) => onRename(e, cols.id, "", item.id, true)}>
								Rename
							</button>
							<button
								onClick={(e) =>
									onDelete(e, cols.id, item.id, "", true, item.name)
								}
							>
								Delete
							</button>
							<button onClick={(e) => onClear(e, cols.id, item.id, item.name)}>
								Clear Items
							</button>
							{isCopied && (
								<button onClick={(e) => onPaste(e, cols.id, item, true)}>
									Paste
								</button>
							)}
							<button
								onClick={(e) => onDuplicate(e, cols.id, item.id, "", true)}
							>
								Duplicate
							</button>
							<div className="divider"></div>
							<button onClick={(e) => onFolderSort(e, cols.id, item.id)}>
								Sort {item.settings?.sortOrder === "asc" ? "(Z-A)" : "(A-Z)"}
							</button>
							<div className="divider"></div>
							<button
								onClick={(e) => onExport(e, cols.id, "", item.id, item.name)}
							>
								Export
							</button>
							<button
								onClick={(e) =>
									onSettings(
										e,
										cols.id,
										item.id,
										SettingsType.Folder,
										item.name,
										cols.variableId,
									)
								}
							>
								Settings
							</button>
						</DropdownPortal>
					</div>
				</summary>
				{
					<>
						{item.data &&
							item.data.length > 0 &&
							item.data.map((listItem) => {
								if (isFolder(listItem)) {
									return getFolderItems(
										cols,
										listItem as IFolder,
										cols.variableId,
										level + 1,
									);
								}
								return <></>;
							})}
						{item.data &&
							item.data.length > 0 &&
							item.data.map((listItem) => {
								if (!isFolder(listItem)) {
									return (
										<div
											id={"col-activity-item-" + listItem.id}
											key={"collections-item-" + listItem.id}
											style={getPaddingLeft(level)}
											className={
												selectedItem === listItem.id
													? `${getThemeColor()} activity-items folder-activity-items selected-item`
													: `${getThemeColor()} activity-items folder-activity-items`
											}
											onContextMenu={(e) =>
												onItemRightClick(e, listItem.id, true)
											}
											onClick={(e) =>
												onClickHistory(
													e,
													cols.id,
													item.id,
													listItem.id,
													listItem.name,
													variableId,
												)
											}
										>
											<div className="activity-item-row-1">
												<label
													className={
														"activity-method " +
														getMethodClassName(
															(listItem as IHistory).method.toUpperCase(),
														)
													}
												>
													{getMethodName(
														(listItem as IHistory).method.toUpperCase(),
													)}
												</label>
												<label className="activity-url">
													{listItem.name.replace(/^https?:\/\//, "")}
												</label>
											</div>
											{getVariableName(variableId)}
											<div className="activity-item-row-2">
												<label>
													{getDays(listItem.createdTime, new Date())}
												</label>
												<div
													className={
														listItem.id === currentIndex
															? "more-icon display-block"
															: "more-icon"
													}
													ref={(el) =>
														(moreMenuWrapperRef.current[listItem.id] = el)
													}
												>
													<DotsLogo
														id={"three-dots-" + listItem.id}
														onContextMenu={(e) => {
															e.stopPropagation();
															e.preventDefault();
														}}
														onClick={(e) => openMoreMenu(e, listItem.id, true)}
													/>
													<input
														type="checkbox"
														className="dd-input"
														checked={listItem.id === currentIndex}
														readOnly
													/>
													<DropdownPortal
														id={listItem.id}
														open={listItem.id === currentIndex}
													>
														<button
															onClick={(e) =>
																onClickNewTab(
																	e,
																	cols.id,
																	item.id,
																	listItem.id,
																	listItem.name,
																	cols.variableId,
																)
															}
														>
															Open in New Tab
														</button>
														<button
															onClick={(e) =>
																onRunClick(
																	e,
																	cols.id,
																	item.id,
																	listItem.id,
																	listItem.name,
																	cols.variableId,
																)
															}
														>
															Run Request
														</button>
														<div className="divider"></div>
														<button
															onClick={(e) =>
																onRename(
																	e,
																	cols.id,
																	listItem.id,
																	item.id,
																	false,
																)
															}
														>
															Rename
														</button>
														<button
															onClick={(e) => onCopy(e, listItem as IHistory)}
														>
															Copy
														</button>
														<button
															onClick={(e) =>
																onDelete(
																	e,
																	cols.id,
																	item.id,
																	listItem.id,
																	false,
																	listItem.name,
																)
															}
														>
															Delete
														</button>
														<button
															onClick={(e) =>
																onDuplicate(
																	e,
																	cols.id,
																	item.id,
																	listItem.id,
																	false,
																)
															}
														>
															Duplicate
														</button>
														<div className="divider"></div>
														<button
															onClick={(e) =>
																onExport(
																	e,
																	cols.id,
																	listItem.id,
																	item.id,
																	listItem.name,
																)
															}
														>
															Export
														</button>
													</DropdownPortal>
												</div>
											</div>
										</div>
									);
								}
								return <></>;
							})}
					</>
				}
			</details>
		);
	}

	function getCollectionItems(item: ICollections, index: number) {
		return (
			<details
				id={"collections-" + item.id}
				open={props.filterCondition ? true : false}
				key={"collections-" + item.id}
			>
				<summary
					className="collection-items"
					onContextMenu={(e) => onColRightClick(e, item.id)}
				>
					<div className="col-fol-title">{item.name}</div>
					<div
						className={
							item.id === currentHeadIndex
								? "col-fol-icon-panel more-icon display-block"
								: "col-fol-icon-panel more-icon"
						}
						ref={(el) => (moreHeadMenuWrapperRef.current[item.id] = el)}
					>
						{getPlusIconSVG(
							"New Request",
							"add-req-button",
							(e) => {
								e.stopPropagation();
								e.preventDefault();
							},
							(e) => addNewRequest(e, item.id, ""),
						)}
						{getColFolDotMenu(
							"three-dots-" + item.id,
							"collection Menu",
							"col-fol-icon",
							(e) => {
								e.stopPropagation();
								e.preventDefault();
							},
							(e) => openMoreMenu(e, item.id),
						)}
						<input
							type="checkbox"
							className="dd-input"
							checked={item.id === currentHeadIndex}
							readOnly
						/>
						<DropdownPortal id={item.id} open={item.id === currentHeadIndex}>
							<div
								className="parent-menu"
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onContextMenu={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
							>
								{" "}
								New <span className="col-menu-submenu-arrow">›</span>
								<div className="dropdown-more sub-menu new-sub-menu">
									<button onClick={(e) => addNewRequest(e, item.id, "")}>
										Request
									</button>
									<button onClick={(e) => addNewFolder(e, item.id, "")}>
										Folder
									</button>
								</div>
							</div>
							<div className="divider"></div>
							<div
								className="parent-menu"
								onClick={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
								onContextMenu={(e) => {
									e.stopPropagation();
									e.preventDefault();
								}}
							>
								Tools <span className="col-menu-submenu-arrow">›</span>
								<div className="dropdown-more sub-menu tools-sub-menu">
									<button
										onClick={(e) =>
											onRunAll(e, item.id, "", item.name, item.variableId)
										}
									>
										Run All
									</button>
									<button
										onClick={(e) =>
											onPerfTest(e, item.id, "", item.name, item.variableId)
										}
									>
										Performance Test
									</button>
									<button
										onClick={(e) =>
											onPerfTest(e, item.id, "", item.name, item.variableId)
										}
									>
										Data-Driven Test
									</button>
								</div>
							</div>
							<button onClick={(e) => onReOrderItems(e, item.id)}>
								Arrange Items
							</button>
							{index !== 0 && <div className="divider"></div>}
							{index !== 0 && (
								<>
									<button onClick={(e) => onRenameCollection(e, item.id)}>
										Rename
									</button>
									<button
										onClick={(e) => onDeleteCollection(e, item.id, item.name)}
									>
										Delete
									</button>
								</>
							)}
							<button onClick={(e) => onClear(e, item.id, "", item.name)}>
								Clear Items
							</button>
							<div className="divider"></div>
							<button onClick={(e) => onCopyTo(e, item)}>Copy To</button>
							{isCopied && (
								<button onClick={(e) => onPaste(e, item.id, null, false)}>
									Paste
								</button>
							)}
							<button onClick={(e) => onDuplicate(e, item.id, "", "", false)}>
								Duplicate
							</button>
							<button onClick={(e) => onAttach(e, item)}>
								{item.variableId ? "Remove Variable" : "Attach Variable"}
							</button>
							<div className="divider"></div>
							<button onClick={(e) => onFolderSort(e, item.id)}>
								Sort {item.settings?.sortOrder === "asc" ? "(Z-A)" : "(A-Z)"}
							</button>
							<div className="divider"></div>
							<button onClick={(e) => onExport(e, item.id, "", "", item.name)}>
								Export
							</button>
							<button
								onClick={(e) =>
									onSettings(
										e,
										item.id,
										"",
										SettingsType.Collection,
										item.name,
										item.variableId,
									)
								}
							>
								Settings
							</button>
						</DropdownPortal>
					</div>
				</summary>
				<div className="collction-item">
					{
						<>
							{item.data &&
								item.data.length > 0 &&
								item.data.map((listItem) => {
									if (isFolder(listItem)) {
										return getFolderItems(
											item,
											listItem as IFolder,
											item.variableId,
											0,
										);
									}
									return <></>;
								})}
							{item.data &&
								item.data.length > 0 &&
								item.data.map((listItem) => {
									if (!isFolder(listItem)) {
										return (
											<div
												id={"col-activity-item-" + listItem.id}
												key={"collections-item-" + listItem.id}
												className={
													selectedItem === listItem.id
														? `${getThemeColor()} activity-items selected-item`
														: `${getThemeColor()} activity-items`
												}
												onContextMenu={(e) =>
													onItemRightClick(e, listItem.id, true)
												}
												onClick={(e) =>
													onClickHistory(
														e,
														item.id,
														"",
														listItem.id,
														listItem.name,
														item.variableId,
													)
												}
											>
												<div className="activity-item-row-1">
													<label
														className={
															"activity-method " +
															getMethodClassName(
																(listItem as IHistory).method.toUpperCase(),
															)
														}
													>
														{getMethodName(
															(listItem as IHistory).method.toUpperCase(),
														)}
													</label>
													<label className="activity-url">
														{listItem.name.replace(/^https?:\/\//, "")}
													</label>
												</div>
												{getVariableName(item.variableId)}
												<div className="activity-item-row-2">
													<label>
														{getDays(listItem.createdTime, new Date())}
													</label>
													<div
														className={
															listItem.id === currentIndex
																? "more-icon display-block"
																: "more-icon"
														}
														ref={(el) =>
															(moreMenuWrapperRef.current[listItem.id] = el)
														}
													>
														<DotsLogo
															id={"three-dots-" + listItem.id}
															onContextMenu={(e) => {
																e.stopPropagation();
																e.preventDefault();
															}}
															onClick={(e) =>
																openMoreMenu(e, listItem.id, true)
															}
														/>
														<input
															type="checkbox"
															className="dd-input"
															checked={listItem.id === currentIndex}
															readOnly
														/>
														<DropdownPortal
															id={listItem.id}
															open={listItem.id === currentIndex}
														>
															<button
																onClick={(e) =>
																	onClickNewTab(
																		e,
																		item.id,
																		"",
																		listItem.id,
																		listItem.name,
																		item.variableId,
																	)
																}
															>
																Open in New Tab
															</button>
															<button
																onClick={(e) =>
																	onRunClick(
																		e,
																		item.id,
																		"",
																		listItem.id,
																		listItem.name,
																		item.variableId,
																	)
																}
															>
																Run Request
															</button>
															<div className="divider"></div>
															<button
																onClick={(e) =>
																	onRename(e, item.id, listItem.id, "", false)
																}
															>
																Rename
															</button>
															<button
																onClick={(e) => onCopy(e, listItem as IHistory)}
															>
																Copy
															</button>
															<button
																onClick={(e) =>
																	onDelete(
																		e,
																		item.id,
																		"",
																		listItem.id,
																		false,
																		listItem.name,
																	)
																}
															>
																Delete
															</button>
															<button
																onClick={(e) =>
																	onDuplicate(
																		e,
																		item.id,
																		"",
																		listItem.id,
																		false,
																	)
																}
															>
																Duplicate
															</button>
															<div className="divider"></div>
															<button
																onClick={(e) =>
																	onExport(
																		e,
																		item.id,
																		listItem.id,
																		"",
																		listItem.name,
																	)
																}
															>
																Export
															</button>
														</DropdownPortal>
													</div>
												</div>
											</div>
										);
									}
									return <></>;
								})}
						</>
					}
				</div>
			</details>
		);
	}

	function handleClickOutside(evt: any) {
		const headMenuEl = document.getElementById(
			"drop-down-menu-" + refHeadIndex.current,
		);
		const headTriggerEl = moreHeadMenuWrapperRef.current[refHeadIndex.current];
		if (
			headTriggerEl &&
			!headTriggerEl.contains(evt.target) &&
			!(headMenuEl && headMenuEl.contains(evt.target))
		) {
			setCurrentHeadIndex("");
		}

		const itemMenuEl = document.getElementById(
			"drop-down-menu-" + refIndex.current,
		);
		const itemTriggerEl = moreMenuWrapperRef.current[refIndex.current];
		if (
			itemTriggerEl &&
			!itemTriggerEl.contains(evt.target) &&
			!(itemMenuEl && itemMenuEl.contains(evt.target))
		) {
			setCurrentIndex("");
		}
	}

	return (
		<>
			{props.isLoading ? (
				<>
					<div id="divSpinner" className="spinner loading"></div>
					<div className="loading-history-text">{"Loading...."}</div>
				</>
			) : colState.length > 0 ? (
				getCollectionBody()
			) : (
				<div className="no-history-text">{"No Collections Available"}</div>
			)}
		</>
	);
};

export default CollectionBar;
