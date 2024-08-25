import React, { useEffect, useState } from "react";
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import { Modal } from "../../Common/Modal";
import vscode from "../../Common/vscodeAPI";
import { IVariable } from "../../SideBar/redux/types";
import "./style.css";

const BulkExport = () => {

	const [collectionNames, setCollectionNames] = useState([]);
	const [selectedIds, setSelectedIds] = useState([]);
	const [filePath, setFilePath] = useState("");
	const [loading, setLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);
	const [isDone, setDone] = useState(false);
	const [type, setType] = useState("col");

	useEffect(() => {
		window.addEventListener("message", (event) => {
			if (event.data && event.data.type === responseTypes.getAllCollectionNamesResponse) {
				setCollectionNames(event.data.collectionNames);
				setLoading(false);
			} else if (event.data && event.data.type === responseTypes.getAllVariableResponse) {
				let vars = event.data.variable as IVariable[];
				var varNames = vars.reduce((ids, item, index) => {
					if (index !== 0) {
						ids.push({ name: item.name, value: item.id, disabled: false });
					}
					return ids;
				}, []);
				setCollectionNames(varNames);
				setLoading(false);
			} else if (event.data && event.data.type === responseTypes.selectPathResponse) {
				setFilePath(event.data.path);
			} else if (event.data && event.data.type === responseTypes.bulkColExportResponse) {
				setShowModal(false);
				setDone(true);
			}
		});

		let type = document.title.split("@:@")[1];
		setType(type);

		if (type === "col") {
			vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "bulkexport" });
		} else {
			vscode.postMessage({ type: requestTypes.getAllVariableRequest });
		}
	}, []);

	const handleCheckboxChange = (event) => {
		const checkedId = event.target.value;
		if (event.target.checked) {
			if (checkedId === "0") {
				let all: any[] = ["0"];
				collectionNames.forEach(item => { all.push(item.value); });
				setSelectedIds(all);
			} else {
				setSelectedIds([...selectedIds, checkedId]);
			}
		} else {
			if (checkedId === "0") {
				setSelectedIds([]);
			}
			else {
				setSelectedIds(selectedIds.filter(id => id !== checkedId && id !== "0"));
			}
		}
	};

	function onSubmitClick() {
		setShowModal(true);
		vscode.postMessage({ type: requestTypes.bulkColExportRequest, data: { cols: selectedIds.filter(id => id !== "0"), path: filePath, type: type } });
	}

	const onSelectFile = (evt: any) => {
		overrideEventDefaults(evt);
		vscode.postMessage({ type: requestTypes.selectPathRequest });
	};

	const overrideEventDefaults =
		(event: Event | React.DragEvent<HTMLElement> | React.ChangeEvent<HTMLInputElement>): void => {
			event.preventDefault();
			event.stopPropagation();
		};

	return (
		<div>
			<Modal show={showModal}>
				<p>Exporting the {type === "col" ? "collections..." : "variables..."}</p>
			</Modal>
			{
				loading === true ?
					<>
						<div id="divSpinner" className="spinner loading"></div>
						<div className="loading-history-text">{"Loading...."}</div>
					</>
					:
					<>
						<div className="addto-header">Bulk Export</div>
						<div className="addto-body bulk-panel">
							{
								collectionNames?.length > 0 ?
									<>
										<div className="responsive-three-column-grid">
											<div className="bulk-text-title">{type === "col" ? "Collections :" : "Variables :"}</div>
											<div>

												<div className="bulk-export-list-container">
													<label key="0" className="bulk-list">
														<input type="checkbox"
															value="0"
															checked={selectedIds.includes("0")}
															onChange={(event) => { handleCheckboxChange(event); }}
														/>
														-- Select All --
													</label>
													{
														collectionNames.map((col) => (
															<label key={col.value} className="bulk-list">
																<input type="checkbox"
																	value={col.value}
																	checked={selectedIds.includes(col.value)}
																	onChange={(event) => { handleCheckboxChange(event); }}
																/>
																{col.name}
															</label>
														))
													}
												</div>
											</div>
											<div></div>
										</div>

										<div className="responsive-three-column-grid">
											<div className="bulk-text-title">Path :</div>
											<div className="bulk-path-select-panel">
												<button className="file-upload-text bulk-path-btn" onClick={onSelectFile}>Browse</button>
												<div className="bulk-filename-text">{filePath}</div>
											</div>
											<div></div>
										</div>
										<div className="responsive-three-column-grid">
											<div></div>
											<div className="button-panel bulk-button-panel">
												<button
													type="submit"
													className="submit-button"
													onClick={onSubmitClick}
													disabled={!filePath || selectedIds.length === 0 || isDone}
												>
													Export
												</button>
												<div className="bulk-message-panel">
													{isDone && (<span className="success-message">{type === "col" ? "Collections " : "Variables"} are exported successfully</span>)}
												</div>
											</div>
											<div></div>
										</div>
									</>
									:
									<>
									</>
							}
						</div>
					</>
			}
		</div>
	);
};

export default BulkExport;
