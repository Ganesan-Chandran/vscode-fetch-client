import "./style.css";
import { IVariable } from "../../../../fetch-client-core/types/sidebar.types";
import { Modal } from "../../Common/Modal";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import PanelLayout from "../../Common/Layout/panelLayout";
import React, { useEffect, useState } from "react";
import vscode from "../../Common/vscodeAPI";

const BulkExport = () => {
	const formatTypeList = [
		{ id: "fetchclient", value: "Fetch Client" },
		{ id: "postman", value: "Postman" },
	];

	const [collectionNames, setCollectionNames] = useState([]);
	const [selectedIds, setSelectedIds] = useState([]);
	const [filePath, setFilePath] = useState("");
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [isDone, setDone] = useState(false);
	const [type, setType] = useState("col");
	const [key, setKey] = useState("");
	const [formatType, setFormatType] = useState("fetchclient");

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (
				event.data &&
				event.data.type === responseTypes.getAllCollectionNamesResponse
			) {
				setCollectionNames(event.data.collectionNames);
				setLoading(false);
			} else if (
				event.data &&
				event.data.type === responseTypes.getAllVariableResponse
			) {
				let vars = event.data.variable as IVariable[];
				var varNames = vars.reduce((ids, item, index) => {
					if (index !== 0) {
						ids.push({ name: item.name, value: item.id, disabled: false });
					}
					return ids;
				}, []);
				setCollectionNames(varNames);
				setLoading(false);
			} else if (
				event.data &&
				event.data.type === responseTypes.selectPathResponse
			) {
				setFilePath(event.data.path);
			} else if (
				event.data &&
				event.data.type === responseTypes.bulkColExportResponse
			) {
				setShowModal(false);
				setDone(true);
			}
		};
		window.addEventListener("message", handleMessage);

		let type = document.title.split("@:@")[1];
		setType(type);

		if (type === "col") {
			vscode.postMessage({
				type: requestTypes.getAllCollectionNameRequest,
				data: "bulkexport",
			});
		} else {
			vscode.postMessage({ type: requestTypes.getAllVariableRequest });
		}

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	const handleCheckboxChange = (event) => {
		const checkedId = event.target.value;
		if (event.target.checked) {
			if (checkedId === "0") {
				let all: any[] = ["0"];
				collectionNames.forEach((item) => {
					all.push(item.value);
				});
				setSelectedIds(all);
			} else {
				setSelectedIds([...selectedIds, checkedId]);
			}
		} else {
			if (checkedId === "0") {
				setSelectedIds([]);
			} else {
				setSelectedIds(
					selectedIds.filter((id) => id !== checkedId && id !== "0"),
				);
			}
		}
	};

	function onSubmitClick() {
		setShowModal(true);
		vscode.postMessage({
			type: requestTypes.bulkColExportRequest,
			data: {
				cols: selectedIds.filter((id) => id !== "0"),
				path: filePath,
				type: type,
				exportKey: key,
				formatType: formatType,
			},
		});
	}

	const onSelectFile = (evt: any) => {
		overrideEventDefaults(evt);
		vscode.postMessage({ type: requestTypes.selectPathRequest });
	};

	const overrideEventDefaults = (
		event:
			| Event
			| React.DragEvent<HTMLElement>
			| React.ChangeEvent<HTMLInputElement>,
	): void => {
		event.preventDefault();
		event.stopPropagation();
	};

	function setKeyValue(e: any) {
		setKey(e.target.value);
	}

	function setSelectedFormat(e: string) {
		setFormatType(e);
	}

	function renderList() {
		if (!(collectionNames?.length > 0)) {
			return null;
		}

		return (
			<tr className="first-row">
				<td className="col-1-size">
					<span className="addto-label">
						{type === "col" ? "Collections :" : "Variables :"}
					</span>
				</td>
				<td className="col-2-size">
					<div className="bulk-export-list-container">
						<label key="0" className="bulk-list">
							<input
								type="checkbox"
								value="0"
								checked={selectedIds.includes("0")}
								onChange={(event) => {
									handleCheckboxChange(event);
								}}
							/>
							-- Select All --
						</label>
						{collectionNames.map((col) => (
							<label key={col.value} className="bulk-list">
								<input
									type="checkbox"
									value={col.value}
									checked={selectedIds.includes(col.value)}
									onChange={(event) => {
										handleCheckboxChange(event);
									}}
								/>
								{col.name}
							</label>
						))}
					</div>
				</td>
			</tr>
		);
	}

	function renderKey() {
		if (!(collectionNames?.length > 0) || type === "col") {
			return null;
		}
		return (
			<tr className="details-row">
				<td className="col-1-size">
					<span className="addto-label">Encryption Key</span>
				</td>
				<td className="col-2-size details-col">
					<div>
						<input
							type="text"
							className="bulk-key-text"
							value={key}
							onChange={setKeyValue}
						/>
						<div className="bulk-key-note">
							Note: Enter an encryption key to encrypt the variables, or leave
							it blank to store without encryption. Note: Share key with anyone
							who needs to import these variables.
						</div>
					</div>
				</td>
			</tr>
		);
	}

	function renderPath() {
		if (!(collectionNames?.length > 0)) {
			return null;
		}
		return (
			<tr>
				<td className="col-1-size">
					<span className="addto-label">Path</span>
				</td>

				<td className="col-2-size file-upload-container">
					<button
						className="file-upload-text bulk-path-btn"
						onClick={onSelectFile}
					>
						Browse
					</button>
					<div className="bulk-filename-text">{filePath}</div>
				</td>
			</tr>
		);
	}

	function renderExportType() {
		if (!(collectionNames?.length > 0) || type === "var") {
			return null;
		}
		return (
			<tr className="details-row">
				<td className="col-1-size">
					<span className="addto-label">Format</span>
				</td>
				<td className="col-2-size details-col">
					<select
						className="preReq-col-select export-type-select"
						required={true}
						value={formatType}
						onChange={(e) => setSelectedFormat(e.target.value)}
					>
						{formatTypeList.map((item) => (
							<option key={item.id} value={item.id}>
								{item.value}
							</option>
						))}
					</select>
				</td>
			</tr>
		);
	}

	function renderFooter() {
		if (!(collectionNames?.length > 0)) {
			return null;
		}

		return (
			<>
				{isDone && (
					<div className="reorder-status reorder-status--ok">
						{type === "col" ? "Collections " : "Variables"} are exported
						successfully
					</div>
				)}
				<div className="reorder-btn-panel">
					<button
						type="submit"
						className="submit-button"
						onClick={onSubmitClick}
						disabled={!filePath || selectedIds.length === 0 || isDone}
					>
						Export
					</button>
				</div>
			</>
		);
	}

	function renderHint() {
		return (
			<div className="reorder-hint">
				Select {type === "col" ? "collection(s) " : "variable(s)"} to export.
			</div>
		);
	}

	function renderForm() {
		return (
			<div className="reorder-tree-panel addto-scroll-panel">
				<table className="addto-table" cellPadding={0} cellSpacing={0}>
					<tbody>
						{renderList()}
						{renderKey()}
						{renderPath()}
						{renderExportType()}
					</tbody>
				</table>
			</div>
		);
	}

	return (
		<>
			<Modal show={showModal}>
				<p>
					Exporting the {type === "col" ? "collections..." : "variables..."}
				</p>
			</Modal>
			<PanelLayout
				title={
					type === "col"
						? "📦 Bulk Export Collections"
						: "📦 Bulk Export Variables"
				}
				loading={loading}
				footer={renderFooter()}
			>
				{renderHint()}
				{renderForm()}
			</PanelLayout>
		</>
	);
};

export default BulkExport;
