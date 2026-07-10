import "./style.css";
import {
	IHistory,
	IFolder,
} from "../../../../fetch-client-core/types/sidebar.types";
import { isFolder } from "../../../../fetch-client-core/helpers/common.helper";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../../Common/vscodeAPI";
import PanelLayout from "../../Common/Layout/panelLayout";

type TreeItem = IHistory | IFolder;

type DragOverMode = "before" | "after" | "inside";

interface DragOverState {
	targetId: string;
	mode: DragOverMode;
}

function findItem(
	arr: TreeItem[],
	id: string,
): { item: TreeItem; parent: TreeItem[]; idx: number } | null {
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].id === id) {
			return { item: arr[i], parent: arr, idx: i };
		}
		if (isFolder(arr[i]) && (arr[i] as IFolder).data) {
			const found = findItem((arr[i] as IFolder).data!, id);
			if (found) {
				return found;
			}
		}
	}
	return null;
}

function removeItem(arr: TreeItem[], id: string): boolean {
	for (let i = 0; i < arr.length; i++) {
		if (arr[i].id === id) {
			arr.splice(i, 1);
			return true;
		}
		if (isFolder(arr[i]) && (arr[i] as IFolder).data) {
			if (removeItem((arr[i] as IFolder).data!, id)) {
				return true;
			}
		}
	}
	return false;
}

function isAncestor(item: TreeItem, targetId: string): boolean {
	if (!isFolder(item)) {
		return false;
	}
	for (const child of (item as IFolder).data) {
		if (child.id === targetId) {
			return true;
		}
		if (isAncestor(child, targetId)) {
			return true;
		}
	}
	return false;
}

function deepClone<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

function getMethodClassName(method: string): string {
	const map: Record<string, string> = {
		GET: "method-get",
		POST: "method-post",
		PUT: "method-put",
		DELETE: "method-delete",
		PATCH: "method-patch",
		HEAD: "method-head",
		OPTIONS: "method-options",
	};
	return map[method] ?? "method-default";
}

interface TreeRowProps {
	item: TreeItem;
	depth: number;
	collapsed: Set<string>;
	dragOverState: DragOverState | null;
	dragSrcId: string | null;
	onToggleFolder: (id: string) => void;
	onDragStart: (e: React.DragEvent, id: string) => void;
	onDragOver: (e: React.DragEvent, id: string, itemType: string) => void;
	onDragLeave: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent, id: string) => void;
	onDragEnd: (e: React.DragEvent) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({
	item,
	depth,
	collapsed,
	dragOverState,
	dragSrcId,
	onToggleFolder,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
	onDragEnd,
}) => {
	const isDragging = dragSrcId === item.id;
	const overMode =
		dragOverState?.targetId === item.id ? dragOverState.mode : null;

	const rowClass = [
		"reorder-row",
		isDragging ? "reorder-row--dragging" : "",
		overMode === "inside" ? "reorder-row--over-inside" : "",
		overMode === "before" ? "reorder-row--over-before" : "",
		overMode === "after" ? "reorder-row--over-after" : "",
	]
		.filter(Boolean)
		.join(" ");

	const method = !isFolder(item)
		? (item as IHistory).method.toUpperCase()
		: null;

	return (
		<>
			<div
				className={rowClass}
				style={{ paddingLeft: `${8 + depth * 20}px` }}
				draggable
				onDragStart={(e) => onDragStart(e, item.id)}
				onDragOver={(e) =>
					onDragOver(e, item.id, isFolder(item) ? "folder" : "request")
				}
				onDragLeave={onDragLeave}
				onDrop={(e) => onDrop(e, item.id)}
				onDragEnd={onDragEnd}
			>
				<span className="reorder-handle" title="Drag to move">
					⠿
				</span>

				{isFolder(item) && (
					<span
						className={`reorder-chevron ${collapsed.has(item.id) ? "" : "reorder-chevron--open"}`}
						onClick={() => onToggleFolder(item.id)}
					>
						▶
					</span>
				)}

				<span
					className={`reorder-icon ${isFolder(item) ? "reorder-icon--folder" : "reorder-icon--request"}`}
				>
					{isFolder(item) ? "📁" : "📄"}
				</span>

				{method && (
					<span className={`reorder-method ${getMethodClassName(method)}`}>
						{method}
					</span>
				)}

				<span className="reorder-name">{item.name}</span>

				{!isFolder(item) && (item as IHistory).url && (
					<span className="reorder-url">{(item as IHistory).url}</span>
				)}
			</div>

			{isFolder(item) &&
				!collapsed.has(item.id) &&
				(item as IFolder).data &&
				(item as IFolder).data.length > 0 && (
					<div className="reorder-children">
						{(item as IFolder).data.map((child) => (
							<TreeRow
								key={child.id}
								item={child}
								depth={depth + 1}
								collapsed={collapsed}
								dragOverState={dragOverState}
								dragSrcId={dragSrcId}
								onToggleFolder={onToggleFolder}
								onDragStart={onDragStart}
								onDragOver={onDragOver}
								onDragLeave={onDragLeave}
								onDrop={onDrop}
								onDragEnd={onDragEnd}
							/>
						))}
					</div>
				)}
		</>
	);
};

const ReOrder: React.FC = () => {
	const [items, _setItems] = useState<TreeItem[]>([]);
	const refItems = useRef(items);
	const setItems = (data: TreeItem[]) => {
		refItems.current = data;
		_setItems([...data]);
	};

	const [loading, _setLoading] = useState(false);
	const refLoading = useRef(loading);
	const setLoading = (val: boolean) => {
		refLoading.current = val;
		_setLoading(val);
	};

	const [collectionName, setCollectionName] = useState("");
	const [colId, setColId] = useState("");
	const [folderId, setFolderId] = useState("");
	const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
	const [dragSrcId, setDragSrcId] = useState<string | null>(null);
	const [dragOverState, setDragOverState] = useState<DragOverState | null>(
		null,
	);
	const [statusMsg, setStatusMsg] = useState<{
		text: string;
		isError?: boolean;
	} | null>(null);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		const colId = document.title.split("@:@")[1];
		let folderId = document.title.split("@:@")[2];

		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === responseTypes.getCollectionDetailsByIdResponse) {
				setItems(event.data.items.data as TreeItem[]);
				setCollectionName(event.data.items.name);
				setLoading(false);
			}
		};
		window.addEventListener("message", handleMessage);
		folderId = folderId === "undefined" ? null : folderId;
		setColId(colId);
		setFolderId(folderId);
		vscode.postMessage({
			type: requestTypes.getCollectionDetailsByIdRequest,
			data: { colId, folderId },
		});
		setLoading(true);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	function toggleFolder(id: string) {
		setCollapsed((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}

	function onDragStart(e: React.DragEvent, id: string) {
		setDragSrcId(id);
		e.dataTransfer.effectAllowed = "move";
	}

	function onDragOver(e: React.DragEvent, targetId: string, itemType: string) {
		e.preventDefault();
		e.stopPropagation();
		if (!dragSrcId || dragSrcId === targetId) {
			return;
		}

		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const y = e.clientY - rect.top;
		const third = rect.height / 3;

		let mode: DragOverMode;
		if (itemType === "folder" && y > third && y < rect.height - third) {
			mode = "inside";
		} else {
			mode = y < rect.height / 2 ? "before" : "after";
		}

		setDragOverState({ targetId, mode });
		e.dataTransfer.dropEffect = "move";
	}

	function onDragLeave(e: React.DragEvent) {
		e.stopPropagation();
		setDragOverState(null);
	}

	function onDrop(e: React.DragEvent, targetId: string) {
		e.preventDefault();
		e.stopPropagation();
		if (!dragSrcId || !dragOverState || dragSrcId === targetId) {
			setDragSrcId(null);
			setDragOverState(null);
			return;
		}

		const tree = deepClone(refItems.current);

		const srcFound = findItem(tree, dragSrcId);
		if (!srcFound) {
			return;
		}
		const srcItem = srcFound.item;
		const srcName = srcItem.name;

		const targetFound = findItem(tree, targetId);
		if (!targetFound) {
			return;
		}
		const targetName = targetFound.item.name;

		if (dragOverState.mode === "inside" && !isFolder(targetFound.item)) {
			return;
		}

		if (isAncestor(srcItem, targetId)) {
			setStatusMsg({
				text: `Cannot move "${srcName}" into its own child folder.`,
				isError: true,
			});
			setDragSrcId(null);
			setDragOverState(null);
			return;
		}

		removeItem(tree, dragSrcId);

		if (dragOverState.mode === "inside") {
			const folder = findItem(tree, targetId)!;
			(folder.item as IFolder).data = (folder.item as IFolder).data ?? [];
			(folder.item as IFolder).data!.push(srcItem);
			setCollapsed((prev) => {
				const n = new Set(prev);
				n.delete(targetId);
				return n;
			});
			setStatusMsg({ text: `Moved "${srcName}" into folder "${targetName}".` });
		} else {
			const tf = findItem(tree, targetId)!;
			const insertAt = dragOverState.mode === "before" ? tf.idx : tf.idx + 1;
			tf.parent.splice(insertAt, 0, srcItem);
			setStatusMsg({
				text: `Reordered "${srcName}" ${dragOverState.mode} "${targetName}".`,
			});
		}

		setSaved(false);
		setItems(tree);
		setDragSrcId(null);
		setDragOverState(null);
	}

	function onDragEnd(e: React.DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		setDragSrcId(null);
		setDragOverState(null);
	}

	function onSubmitClick() {
		vscode.postMessage({
			type: requestTypes.reorderCollectionRequest,
			data: { colId, folderId, items: refItems.current },
		});
		setSaved(true);
		setStatusMsg({ text: "Order saved successfully." });
	}

	function renderHeader() {
		return (
			<div className="reorder-col-name">
				<span className="reorder-col-label">
					{folderId ? "Folder: " : "Collection: "}
				</span>
				<span className="reorder-col-value">{collectionName}</span>
			</div>
		);
	}

	function renderTree() {
		return (
			<div className="reorder-tree-panel">
				{items.map((item) => (
					<TreeRow
						key={item.id}
						item={item}
						depth={0}
						collapsed={collapsed}
						dragOverState={dragOverState}
						dragSrcId={dragSrcId}
						onToggleFolder={toggleFolder}
						onDragStart={onDragStart}
						onDragOver={onDragOver}
						onDragLeave={onDragLeave}
						onDrop={onDrop}
						onDragEnd={onDragEnd}
					/>
				))}
			</div>
		);
	}

	function renderStatus() {
		if (!statusMsg) {
			return null;
		}
		return (
			<div
				className={`reorder-status ${statusMsg.isError ? "reorder-status--error" : "reorder-status--ok"}`}
			>
				{statusMsg.text}
			</div>
		);
	}

	function renderButton() {
		return (
			<div className="reorder-btn-panel">
				<button
					type="button"
					className={`submit-button reorder-btn ${saved ? "reorder-btn--saved" : ""}`}
					onClick={onSubmitClick}
				>
					{saved ? "✓ Saved" : "Save Order"}
				</button>
			</div>
		);
	}

	return (
		<PanelLayout
			title="🔁 Arrange Items"
			loading={loading}
			header={renderHeader()}
			footer={renderButton()}
		>
			<div className="reorder-hint">
				Drag <span>⠿</span> to reorder · Drop onto a folder's middle to move
				inside it
			</div>
			{renderTree()}
			{renderStatus()}
		</PanelLayout>
	);
};

export default ReOrder;
