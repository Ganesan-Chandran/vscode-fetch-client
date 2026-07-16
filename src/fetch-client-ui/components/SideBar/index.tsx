import "./style.css";
import { AppDispatch } from "../../store/appStore";
import { getColFolDotMenu } from "../Common/icons";
import { HistoryBar } from "./History";
import {
	IHistory,
	ICollections,
	IVariable,
} from "../../../fetch-client-core/types/sidebar.types";
import {
	pubSubTypes,
	requestTypes,
	responseTypes,
} from "../../../fetch-client-core/consts/requestTypes.consts";
import { SideBarActions } from "./redux";
import { UIActions } from "../MainUI/redux";
import { useDispatch } from "react-redux";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../Common/vscodeAPI";

const SideBar = () => {
	const CollectionBar = React.lazy(() => import("./Collection"));
	const VariableSection = React.lazy(() => import("./Variables"));

	const dispatch = useDispatch<AppDispatch>();

	const [tabOptions] = useState(["History", "Collection", "Variable"]);
	const [selectedTab, setSelectedTab] = useState("History");
	const [historyView, setHistoryView] = useState<"List" | "Folder">("List");
	const [menuShow, setMenuShow] = useState(false);
	const [filterCondititon, setFilterCondition] = useState("");
	const [isHisLoading, setHisLoading] = useState(0);
	const [isColLoading, setColLoading] = useState(true);
	const [isVarLoading, setVarLoading] = useState(true);
	const [isViewLogOpen, setViewLogOpen] = useState(false);
	const [selectedItem, _setSelectedItem] = useState({
		colId: "",
		foldId: "",
		itemId: "",
		varId: ""
	});
	const [colSort, setColSort] = useState(0);
	const [varSort, setVarSort] = useState(0);

	const refSelectedItem = useRef(selectedItem);
	const setSelectedItem = (data: {
		colId: string;
		foldId: string;
		itemId: string;
		varId: string;
	}) => {
		refSelectedItem.current = data;
		_setSelectedItem(refSelectedItem.current);
	};

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

	function onBulkExportData(evt: any, type: string) {
		evt.preventDefault();
		vscode.postMessage({
			type: requestTypes.bulkExportRequest,
			data: { type: type },
		});
		setMenuShow(false);
	}

	function onImportCurl(evt: any) {
		evt.preventDefault();
		vscode.postMessage({ type: requestTypes.importCurlRequest });
		setMenuShow(false);
	}

	function onImportVariableData(evt: any) {
		evt.preventDefault();
		vscode.postMessage({ type: requestTypes.importVariableRequest });
		setMenuShow(false);
	}

	function onVariableSort(evt: any) {
		evt.preventDefault();
		setVarSort(varSort === 0 || varSort === 2 ? 1 : 2);
		setMenuShow(false);
	}

	function onColSort(evt: any) {
		evt.preventDefault();
		setColSort(colSort === 0 || colSort === 2 ? 1 : 2);
		setMenuShow(false);
	}

	function onNewVariable(evt: any) {
		evt.preventDefault();
		vscode.postMessage({ type: requestTypes.newVariableRequest });
		setMenuShow(false);
	}

	function onNewCollection(evt: any) {
		evt.preventDefault();
		vscode.postMessage({ type: requestTypes.newCollectionRequest });
		setMenuShow(false);
	}

	function onAutoRequest(evt: any) {
		evt.preventDefault();
		vscode.postMessage({ type: requestTypes.openAutoRequest });
		setMenuShow(false);
	}

	const [isHostReady, setHostReady] = useState(false);
	let readyCheckTimer: ReturnType<typeof setTimeout> | undefined;

	function pingHost() {
		vscode.postMessage({ type: requestTypes.readyCheckRequest });
		readyCheckTimer = setTimeout(() => {
			if (!isHostReady) {
				pingHost();
			}
		}, 1500);
	}

	useEffect(() => {
		if (isHostReady) {
			setHisLoading(1);
			setColLoading(false);
			setVarLoading(false);
		}
	}, [isHostReady]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data.type === responseTypes.readyCheckResponse) {
				setHostReady(true);
				clearTimeout(readyCheckTimer);
			} else if (
				event.data &&
				event.data.type === responseTypes.getAllHistoryResponse
			) {
				dispatch(
					SideBarActions.SetHistoryAction(event.data.history as IHistory[]),
				);
				setHisLoading(2);
			} else if (
				event.data &&
				event.data.type === responseTypes.deleteAllHistoryResponse
			) {
				dispatch(SideBarActions.SetHistoryAction([]));
			} else if (
				event.data &&
				event.data.type === responseTypes.deleteHistoryResponse
			) {
				dispatch(SideBarActions.SetDeleteHistoryAction(event.data.id));
			} else if (
				event.data &&
				event.data.type === responseTypes.renameHistoryResponse
			) {
				dispatch(
					SideBarActions.SetRenameHistoryAction(
						event.data.params.id,
						event.data.params.name,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.newHistoryResponse
			) {
				dispatch(
					SideBarActions.SetNewHistoryAction(event.data.history as IHistory),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.getAllCollectionsResponse
			) {
				dispatch(
					SideBarActions.SetCollectionAction(
						event.data.collections as ICollections[],
					),
				);
				// setColLoading(false);
			} else if (
				event.data &&
				event.data.type === responseTypes.appendToCollectionsResponse
			) {
				dispatch(
					SideBarActions.SetHistoryToCollectionAction(
						event.data.collection as ICollections,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.renameCollectionItemResponse
			) {
				if (!event.data.params.name) {
					return;
				}
				dispatch(
					SideBarActions.SetRenameColItemAction(
						event.data.params.colId,
						event.data.params.folderId,
						event.data.params.historyId,
						event.data.params.isFolder,
						event.data.params.name,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.deleteCollectionItemResponse
			) {
				dispatch(
					SideBarActions.SetDeleteColItemAction(
						event.data.params.colId,
						event.data.params.folderId,
						event.data.params.historyId,
						event.data.params.isFolder,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.renameCollectionResponse
			) {
				dispatch(
					SideBarActions.SetRenameCollectionAction(
						event.data.params.id,
						event.data.params.name,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.deleteCollectionResponse
			) {
				dispatch(SideBarActions.SetDeleteCollectionAction(event.data.id));
			} else if (
				event.data &&
				event.data.type === responseTypes.clearResponse
			) {
				dispatch(
					SideBarActions.SetClearCollectionAction(
						event.data.id,
						event.data.folderId,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.importResponse
			) {
				dispatch(
					SideBarActions.SetImportCollectionAction(
						event.data.data as ICollections,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.copyToCollectionsResponse
			) {
				dispatch(
					SideBarActions.SetCopyToCollectionAction(
						event.data.data as ICollections,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.getAllVariableResponse
			) {
				dispatch(
					SideBarActions.SetVariableAction(event.data.variable as IVariable[]),
				);
				// setVarLoading(false);
			} else if (
				event.data &&
				event.data.type === responseTypes.renameVariableResponse
			) {
				dispatch(
					SideBarActions.SetRenameVariableAction(
						event.data.params.id,
						event.data.params.name,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.deleteVariableResponse
			) {
				dispatch(SideBarActions.SetDeleteVariablection(event.data.id));
				vscode.postMessage({
					type: requestTypes.removeVariableFromColRequest,
					data: { varId: event.data.id },
				});
			} else if (
				event.data &&
				event.data.type === responseTypes.appendToVariableResponse
			) {
				dispatch(
					SideBarActions.SetNewVariableAction(
						event.data.collection as IVariable,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.attachVariableResponse
			) {
				dispatch(
					SideBarActions.SetAttachVariableAction(
						event.data.params.id,
						event.data.params.varId,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.activeVariableResponse
			) {
				dispatch(
					SideBarActions.SetActiveVariableAction(
						event.data.params.id,
						event.data.params.status,
					),
				);
			} else if (
				event.data &&
				event.data.type === responseTypes.importVariableResponse
			) {
				dispatch(SideBarActions.SetNewVariableAction(event.data.vars));
			} else if (
				event.data &&
				event.data.type === responseTypes.createNewResponse
			) {
				dispatch(
					SideBarActions.SetNewRequestToCollectionAction(
						event.data.item,
						event.data.id,
						event.data.folderId,
					),
				);
				vscode.postMessage({
					type: requestTypes.openHistoryItemRequest,
					data: {
						colId: event.data.id,
						folderId: event.data.folderId,
						id: event.data.item.id,
						name: event.data.item.name,
						varId: event.data.variableId,
					},
				});
			} else if (
				event.data &&
				event.data.type === responseTypes.createNewFolderResponse
			) {
				dispatch(
					SideBarActions.SetFolderToCollectionAction(
						event.data.folder,
						event.data.colId,
						event.data.folderId,
					),
				);
			} else if (
				event.data &&
				event.data.type === requestTypes.selectItemRequest
			) {
				setSelectedItem({
					colId: event.data.colId,
					foldId: event.data.folId,
					itemId: event.data.id,
					varId: event.data.varId
				});
			} else if (
				event.data &&
				event.data.type === requestTypes.closeItemRequest
			) {
				if (event.data.id && refSelectedItem.current.itemId === event.data.id) {
					setSelectedItem({
						colId: "",
						foldId: "",
						itemId: "",
						varId: ""
					});
				}
			} else if (
				event.data &&
				event.data.type === responseTypes.themeResponse
			) {
				dispatch(UIActions.SetThemeAction(event.data.theme));
			} else if (event.data && event.data.type === pubSubTypes.themeChanged) {
				vscode.postMessage({ type: requestTypes.themeRequest });
			} else if (
				event.data &&
				event.data.type === responseTypes.updateCollectionHistoryItem
			) {
				if (event.data.colId) {
					dispatch(
						SideBarActions.SetUpdateCollectionItemAction(
							event.data.item,
							event.data.colId,
						),
					);
				} else {
					dispatch(SideBarActions.SetUpdateHistoryItemAction(event.data.item));
				}
			} else if (
				event.data &&
				event.data.type === responseTypes.configResponse
			) {
				const config = JSON.parse(event.data.configData as string) as Record<
					string,
					unknown
				>;
				const historyView = config["historyView"] as string;
				setHistoryView(historyView === "List" ? "List" : "Folder");
			}
		};
		window.addEventListener("message", handleMessage);
		vscode.postMessage({ type: requestTypes.themeRequest });
		vscode.postMessage({ type: requestTypes.configRequest });
		vscode.postMessage({ type: requestTypes.getAllHistoryRequest });
		vscode.postMessage({ type: requestTypes.getAllCollectionsRequest });
		vscode.postMessage({ type: requestTypes.getAllVariableRequest });

		document.body.style.backgroundColor = "transparent";

		document.addEventListener("mousedown", handleClickOutside, false);
		pingHost();

		return () => {
			document.removeEventListener("mousedown", handleClickOutside, false);
			window.removeEventListener("message", handleMessage);
		};
	}, []);

	function getHistoryMenuItems() {
		return <button onClick={(e) => onClearActivity(e)}>Clear History</button>;
	}

	function getCollectionsMenuItems() {
		return (
			<>
				<button onClick={(e) => onNewCollection(e)}>New Collection</button>
				<div className="dropdown-item-with-submenu">
					<button
						className="submenu-trigger"
						onClick={(e) => {
							e.stopPropagation();
							e.preventDefault();
						}}
						onContextMenu={(e) => {
							e.stopPropagation();
							e.preventDefault();
						}}
					>
						Tools <span className="submenu-arrow">›</span>
					</button>
					<div className="dropdown-more tools-submenu">
						<button onClick={(e) => onAutoRequest(e)}>Auto Request</button>
					</div>
				</div>
				<hr />
				<button onClick={(e) => onImportCurl(e)}>Import/Run Curl</button>
				<button onClick={(e) => onImportData(e)}>Import</button>
				<button onClick={(e) => onBulkExportData(e, "col")}>Bulk Export</button>
				<hr />
				<button onClick={(e) => onColSort(e)}>
					Sort {colSort === 0 || colSort === 2 ? "(A-Z)" : "(Z-A)"}
				</button>
			</>
		);
	}

	function getVariableMenuItems() {
		return (
			<>
				<button onClick={(e) => onNewVariable(e)}>New Variable</button>
				<button onClick={(e) => onImportVariableData(e)}>Import</button>
				<button onClick={(e) => onBulkExportData(e, "var")}>Bulk Export</button>
				<hr />
				<button onClick={(e) => onVariableSort(e)}>
					Sort {varSort === 0 || varSort === 2 ? "(A-Z)" : "(Z-A)"}
				</button>
			</>
		);
	}

	function onFilterChange(e: any) {
		setFilterCondition(e.target.value);
	}

	function onViewLogClick(_e: any) {
		setViewLogOpen(!isViewLogOpen);
		vscode.postMessage({ type: requestTypes.viewLogRequest });
	}

	function getBody() {
		return (
			<div className="sidebar-body">
				<div className="activity-filter">
					<input
						type="text"
						className="activity-search"
						value={filterCondititon}
						placeholder={
							selectedTab === "History"
								? "filter history"
								: selectedTab === "Collection"
									? "filter collection"
									: "filter variable"
						}
						onChange={onFilterChange}
					/>
					<div className="hamburger-menu-panel dropdown" ref={wrapperRef}>
						{getColFolDotMenu(
							"hamburger-menu",
							"Menu",
							"hamburger-menu",
							(e) => {
								e.stopPropagation();
								e.preventDefault();
							},
							(e) => setShowMenu(e),
						)}
						{menuShow && (
							<div
								id="myDropdown"
								className={"dropdown-content show has-submenu"}
							>
								{selectedTab === "History"
									? getHistoryMenuItems()
									: selectedTab === "Collection"
										? getCollectionsMenuItems()
										: getVariableMenuItems()}
							</div>
						)}
					</div>
				</div>

				<div className="activity-items-panel">
					<div
						style={{ display: selectedTab === "History" ? "block" : "none" }}
					>
						<HistoryBar
							filterCondition={filterCondititon?.toLowerCase()}
							loadingStatus={isHisLoading}
							selectedItem={selectedItem}
							viewMode={historyView}
						/>
					</div>
					<div
						style={{ display: selectedTab === "Collection" ? "block" : "none" }}
					>
						<React.Suspense fallback={<div>loading...</div>}>
							<CollectionBar
								filterCondition={filterCondititon?.toLowerCase()}
								isLoading={isColLoading}
								selectedItem={selectedItem}
								sort={colSort}
							/>
						</React.Suspense>
					</div>
					<div
						style={{ display: selectedTab === "Variable" ? "block" : "none" }}
					>
						<React.Suspense fallback={<div>loading...</div>}>
							<VariableSection
								filterCondition={filterCondititon?.toLowerCase()}
								isLoading={isVarLoading}
								selectedItem={selectedItem}
								sort={varSort}
							/>
						</React.Suspense>
					</div>
				</div>
				<footer className="bottom-menu-panel">
					<a className="view-log" onClick={onViewLogClick}>
						{isViewLogOpen ? (
							<span className="log-span">📝 Close Log</span>
						) : (
							<span className="log-span">📝 View Log</span>
						)}
					</a>
				</footer>
			</div>
		);
	}

	function getTabRender() {
		return tabOptions.map((tab) => {
			return (
				<button
					key={tab}
					className={
						selectedTab === tab
							? "sidebar-tab-menu selected"
							: "sidebar-tab-menu"
					}
					onClick={() => onSelectedTab(tab)}
				>
					{tab}
				</button>
			);
		});
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
			<div className="sidebar-panel-tabs">{getTabRender()}</div>
			<div className="sidebar-panel-body">{getBody()}</div>
		</div>
	);
};

export default SideBar;
