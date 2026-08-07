import "./style.css";
import { DropdownPortal } from "../dropdownMenu";
import { IRootState } from "../../../reducer/combineReducer";
import { ReactComponent as DotsLogo } from "../../../../../icons/dots.svg";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import { useSelector } from "react-redux";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../../Common/vscodeAPI";

export interface IMockServerSectionProps {
	filterCondition: string;
	isLoading: boolean;
}

const MockServerSection = (props: IMockServerSectionProps) => {
	const { mockServers } = useSelector((state: IRootState) => state.sideBarData);

	const [selectedItem, setSelectedItem] = useState("");
	const [runningIds, setRunningIds] = useState<Set<string>>(new Set());
	const [currentIndex, _setCurrentIndex] = useState(-1);

	const refIndex = useRef(currentIndex);
	const moreMenuWrapperRef = useRef<any[]>([]);

	function setCurrentIndex(idx: number) {
		refIndex.current = idx;
		_setCurrentIndex(idx);
	}

	useEffect(() => {
		const handler = (event: MessageEvent) => {
			const msg = event.data;
			if (!msg?.type) {
				return;
			}

			// Only handle status updates locally; Redux list updates are
			// managed by the parent SideBar handleMessage to avoid timing issues.
			if (msg.type === responseTypes.mockServerStatusResponse) {
				const { id, status } = msg.data;
				setRunningIds((prev) => {
					const next = new Set(prev);
					if (status === "running") {
						next.add(id);
					} else {
						next.delete(id);
					}
					return next;
				});
			}
		};

		window.addEventListener("message", handler);
		return () => window.removeEventListener("message", handler);
	}, []);

	useEffect(() => {
		function handleClickOutside(evt: any) {
			const triggerEl = moreMenuWrapperRef.current[refIndex.current];
			const filtered = props.filterCondition
				? mockServers.filter((s) =>
						s.name.toLowerCase().includes(props.filterCondition.toLowerCase()),
					)
				: mockServers;
			const itemId = filtered[refIndex.current]?.id ?? "";
			const menuEl = document.getElementById("drop-down-menu-ms-" + itemId);
			if (
				triggerEl &&
				!triggerEl.contains(evt.target) &&
				!(menuEl && menuEl.contains(evt.target))
			) {
				setCurrentIndex(-1);
			}
		}

		function handleBlur() {
			setCurrentIndex(-1);
		}

		document.addEventListener("click", handleClickOutside, false);
		window.addEventListener("blur", handleBlur);
		return () => {
			document.removeEventListener("click", handleClickOutside, false);
			window.removeEventListener("blur", handleBlur);
		};
	}, [mockServers, props.filterCondition]);

	const filtered = props.filterCondition
		? mockServers.filter((s) =>
				s.name.toLowerCase().includes(props.filterCondition.toLowerCase()),
			)
		: mockServers;

	function openContextMenu(index: number) {
		setCurrentIndex(currentIndex === index ? -1 : index);
	}

	function openMoreMenu(evt: React.MouseEvent, index: number) {
		evt.preventDefault();
		evt.stopPropagation();
		openContextMenu(index);
	}

	function onItemRightClick(evt: React.MouseEvent, index: number) {
		evt.preventDefault();
		evt.stopPropagation();
		openContextMenu(index);
	}

	function onOpenServer(id: string) {
		setSelectedItem(id);
		setCurrentIndex(-1);
		vscode.postMessage({
			type: requestTypes.newMockServerRequest,
			data: { id },
		});
	}

	function onRename(evt: React.MouseEvent, id: string, name: string) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.renameMockServerRequest,
			data: id,
			name,
		});
		setCurrentIndex(-1);
	}

	function onDelete(evt: React.MouseEvent, id: string, name: string) {
		evt.preventDefault();
		evt.stopPropagation();
		vscode.postMessage({
			type: requestTypes.deleteMockServerRequest,
			data: id,
			name,
		});
		setCurrentIndex(-1);
	}

	function onNewServer() {
		vscode.postMessage({ type: requestTypes.newMockServerRequest });
	}

	if (props.isLoading) {
		return (
			<div style={{ padding: "12px", textAlign: "center", fontSize: 12 }}>
				<div className="spinner loading" style={{ margin: "0 auto 8px" }} />
				Loading...
			</div>
		);
	}

	return (
		<div className="mock-server-section">
			{filtered.length === 0 ? (
				<div className="mock-server-empty">
					No mock servers yet.
					<br />
					<span className="mock-server-new-link" onClick={onNewServer}>
						Create one ›
					</span>
				</div>
			) : (
				filtered.map((server, index) => {
					const running = runningIds.has(server.id);
					return (
						<div
							key={server.id}
							className={`mock-server-item${selectedItem === server.id ? " selected" : ""}`}
							onClick={() => onOpenServer(server.id)}
							onContextMenu={(e) => onItemRightClick(e, index)}
							title={`${server.name} - port ${server.port}`}
						>
							<span
								className="mock-server-status-dot"
								style={{
									background: running
										? "var(--test-passed-color)"
										: "var(--description-text-color)",
								}}
								title={running ? "Running" : "Stopped"}
							/>
							<span className="mock-server-name">{server.name}</span>
							<span className="mock-server-port">:{server.port}</span>
							{server.routes.length > 0 && (
								<span className="mock-server-route-count">
									{server.routes.length}
								</span>
							)}
							<div
								className={
									index === currentIndex
										? "more-icon display-block"
										: "more-icon"
								}
								ref={(el) => (moreMenuWrapperRef.current[index] = el)}
							>
								<DotsLogo
									id={"three-dots-ms-" + server.id}
									onClick={(e) => openMoreMenu(e, index)}
								/>
								<input
									type="checkbox"
									className="dd-input"
									checked={index === currentIndex}
									readOnly={true}
								/>
								<DropdownPortal
									id={"ms-" + server.id}
									open={index === currentIndex}
								>
									<button onClick={() => onOpenServer(server.id)}>Open</button>
									<button onClick={(e) => onRename(e, server.id, server.name)}>
										Rename
									</button>
									<div className="divider"></div>
									<button
										className="danger-button"
										onClick={(e) => onDelete(e, server.id, server.name)}
									>
										Delete
									</button>
								</DropdownPortal>
							</div>
						</div>
					);
				})
			)}
		</div>
	);
};

export default MockServerSection;
