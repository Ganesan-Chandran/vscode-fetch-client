import React, { useEffect } from "react";
import { useState } from "react";
import { v4 as uuidv4 } from 'uuid';
import { requestTypes, responseTypes } from "../../../../utils/configuration";
import { formatDate } from "../../../../utils/helper";
import vscode from "../../Common/vscodeAPI";
import { InitialSettings } from "../../SideBar/redux/reducer";
import { ICollections, IFolder, IHistory } from "../../SideBar/redux/types";
import { getMethodClassName } from "../../SideBar/util";
import "../style.css";

const AddToCollection = () => {

	const [errors, setErrors] = useState({
		"colSelect": "",
		"colName": "",
		"folderName": ""
	});

	const [selectedCollection, selSelectedCollection] = useState("");
	const [colName, setColName] = useState("");
	const [collections, setCollections] = useState([]);

	const [history, setHistory] = useState<IHistory>();
	const [isDone, setDone] = useState(false);

	const [selectedFolder, setSelectedFolder] = useState("");
	const [folderName, setFolderName] = useState("");
	const [folders, setFolders] = useState([]);
	const [currentFolders, setCurrentFolders] = useState([]);


	useEffect(() => {
		window.addEventListener("message", (event) => {
			if (event.data && event.data.type === responseTypes.getAllCollectionNameResponse) {
				let colNames = [{ name: "Select", value: "", disabled: true }];
				colNames = [...colNames, ...event.data.collectionNames];
				colNames.push({ name: "----------------------", value: "-1", disabled: true });
				colNames.push({ name: "Create New", value: "0", disabled: false });
				setCollections(colNames);
				setFolders(event.data.folderNames);
			} else if (event.data && event.data.type === responseTypes.getHistoryItemResponse) {
				setHistory(event.data.history[0] as IHistory);
			} else if (event.data && event.data.type === responseTypes.addToCollectionsResponse) {
				setDone(true);
			}
		});

		vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "addtocol" });
		let id = document.title.split("@:@")[1];
		vscode.postMessage({ type: requestTypes.getHistoryItemRequest, data: id });
	}, []);

	const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
		selSelectedCollection(event.target.value);
		setColName("");

		let folderNames = [{ colId: "", name: "Select", value: "", disabled: true }];
		folderNames = [...folderNames, ...folders.filter(item => item.colId === event.target.value)];
		folderNames.push({ colId: "-1", name: "----------------------", value: "-1", disabled: true });
		folderNames.push({ colId: "0", name: "Create New", value: "0", disabled: false });

		setCurrentFolders(folderNames);
		setSelectedFolder("");
		setFolderName("");

		setErrors({
			...errors, "colSelect": "",
			"colName": "",
			"folderName": ""
		});
	};

	const onSelectFolder = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setErrors({ ...errors, "folderName": "" });
		setSelectedFolder(event.target.value);
		setFolderName("");
	};

	function handleValidation() {
		if (selectedCollection === "") {
			setErrors({ ...errors, "colSelect": "Please select/create the collection" });
			return false;
		}

		if (selectedCollection === "0") {
			if (!colName) {
				setErrors({ ...errors, "colName": "Cannot be empty" });
				return false;
			}
			if (colName.toUpperCase().trim() === "DEFAULT") {
				setErrors({ ...errors, "colName": "Collection name should not be 'Default'" });
				return false;
			}
		}

		if (selectedFolder === "0") {
			if (!folderName) {
				setErrors({ ...errors, "folderName": "Cannot be empty" });
				return false;
			}
		}

		return true;
	}

	function onSubmitClick() {

		if (handleValidation()) {
			let folder: IFolder;

			if (selectedFolder) {
				folder = {
					id: selectedFolder === "0" ? uuidv4() : selectedFolder,
					name: selectedFolder === "0" ? folderName : "",
					createdTime: formatDate(),
					type: "folder",
					data: [history],
					settings: InitialSettings
				};
			}

			let collection: ICollections = {
				id: selectedCollection === "0" ? uuidv4() : selectedCollection,
				createdTime: formatDate(),
				name: selectedCollection === "0" ? colName : "",
				data: folder ? [folder] : [history],
				variableId: "",
				settings: InitialSettings
			};

			vscode.postMessage({ type: requestTypes.addToCollectionsRequest, data: { col: collection, hasFolder: folder ? true : false, isNewFolder : selectedFolder === "0" ? true : false} });
		}
	}

	function onNameChange(e: any) {
		setColName(e.target.value);
		setErrors({ ...errors, "colName": (e.target.value ? (e.target.value.toUpperCase().trim() === "DEFAULT" ? "Collection name should not be 'Default'" : "") : "Cannot be empty") });
	}

	function onFolderNameChange(e: any) {
		setFolderName(e.target.value);
		setErrors({ ...errors, "folderName": (e.target.value ? "" : "Cannot be empty") });
	}

	return (
		history && history.name ?
			<div>
				<div className="addto-header">✅ Add To Collection</div>
				<div className="addto-body">
					<table className="addto-table center" cellPadding={0} cellSpacing={0}>
						<tbody>
							<tr>
								<td className="col-1-size">
									<span className="addto-label">History Name :</span>
								</td>
								<td className="col-2-size">
									<input className="addto-text disabled" type="text" title="Name" value={history.name} disabled={true}></input>
								</td>
							</tr>
							<tr className="details-row">
								<td className="col-1-size">
									<span className="addto-label">Request Details :</span>
								</td>
								<td className="col-2-size details-col">
									<div className={"req-details method-label " + getMethodClassName(history.method.toUpperCase())}>{history.method.toUpperCase()}</div>
									<div className="req-details" title={history.url}>{history.url?.length > 50 ? history.url.substring(0, 50) + "..." : history.url}</div>
									<div className="req-details">{formatDate(history.createdTime)}</div>
								</td>
							</tr>
							<tr>
								<td className="col-1-size">
									<span className="addto-label">Collection :</span>
								</td>
								<td className="col-2-size block-display">
									<select
										className={errors["colSelect"] ? "addto-select required-value" : "addto-select"}
										required={true}
										value={selectedCollection}
										onChange={(e) => onSelect(e)}
									>
										{
											collections.map((param: any, index: number) => {
												return (
													<option
														disabled={param.disabled}
														hidden={index === 0 ? true : false}
														key={index + param.name}
														value={param.value}
													>
														{param.name}
													</option>
												);
											})
										}
									</select>
								</td>
							</tr>
							{selectedCollection === "0" ? <tr>
								<td className="col-1-size">
									<span className="addto-label">Collection Name :</span>
								</td>
								<td className="col-2-size">
									<input className={errors["colName"] ? "addto-text required-value" : "addto-text"} type="text" title="Collection Name" onChange={onNameChange}></input>
								</td>
							</tr> : null}
							{selectedCollection ? <tr>
								<td className="col-1-size">
									<span className="addto-label">Folder :</span>
								</td>
								<td className="col-2-size block-display">
									<select
										className="addto-select"
										required={true}
										value={selectedFolder}
										onChange={(e) => onSelectFolder(e)}
									>
										{
											currentFolders.map((param: any, index: number) => {
												return (
													<option
														disabled={param.disabled}
														hidden={index === 0 ? true : false}
														key={index + param.name}
														value={param.value}
													>
														{param.name}
													</option>
												);
											})
										}
									</select>
								</td>
							</tr> : null}
							{selectedFolder === "0" ? <tr>
								<td className="col-1-size">
									<span className="addto-label">Folder Name :</span>
								</td>
								<td className="col-2-size">
									<input className={errors["folderName"] ? "addto-text required-value" : "addto-text"} type="text" title="Folder Name" onChange={onFolderNameChange}></input>
								</td>
							</tr> : null}
						</tbody>
					</table>
					<div className="button-panel">
						<button
							type="submit"
							className="submit-button"
							onClick={onSubmitClick}
							disabled={isDone}
						>
							Submit
						</button>
					</div>
					<div className="message-panel">
						{isDone && (<span className="success-message">History item has added to Collection successfully</span>)}
					</div>
				</div>
			</div>
			:
			<></>
	);
};

export default AddToCollection;
