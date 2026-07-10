import "../style.css";
import {
	requestTypes,
	responseTypes,
} from "../../../../fetch-client-core/consts/requestTypes.consts";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import PanelLayout from "../../Common/Layout/panelLayout";
import React, { useEffect } from "react";
import vscode from "../../Common/vscodeAPI";

const CopyTo = () => {
	const [sourceColName, setSourceColName] = useState("");
	const [sourceColId, setSourceColId] = useState("");
	const [destColId, setDestColId] = useState("");
	const [destColName, setDestColName] = useState("");
	const [collectionNames, setCollectionNames] = useState([]);

	const [errors, setErrors] = useState({});
	const [isDone, setDone] = useState(false);

	useEffect(() => {
		const id = document.title.split("@:@")[1];
		setSourceColId(id);
		const name = document.title.split("@:@")[3];
		setSourceColName(name);

		const handleMessage = (event: MessageEvent) => {
			if (
				event.data &&
				event.data.type === responseTypes.getAllCollectionNamesResponse
			) {
				let findIndex: number = -1;
				let names = event.data.collectionNames;
				let colNames = [{ name: "Select", value: "", disabled: true }];
				let found = names.some(function (item: any, index: number) {
					findIndex = index;
					return item.value === id;
				});
				if (found) {
					names.splice(findIndex, 1);
				}
				colNames = [...colNames, ...names];
				colNames.push({
					name: "----------------------",
					value: "-1",
					disabled: true,
				});
				colNames.push({ name: "Create New", value: "0", disabled: false });
				setCollectionNames(colNames);
			} else if (
				event.data &&
				event.data.type === responseTypes.copyToCollectionsResponse
			) {
				setDone(true);
			}
		};
		window.addEventListener("message", handleMessage);
		vscode.postMessage({
			type: requestTypes.getAllCollectionNameRequest,
			data: "copytocol",
		});

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	const onSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
		setErrors({ ...errors, colName: "" });
		setDestColId(event.target.value);
	};

	function handleValidation() {
		if (destColId === "") {
			setErrors({ ...errors, colName: "Please select/create the collection" });
			return false;
		}
		if (destColId === "0") {
			if (!destColName) {
				setErrors({ ...errors, colName: "Cannot be empty" });
				return false;
			}
			if (destColName.toUpperCase().trim() === "DEFAULT") {
				setErrors({
					...errors,
					colName: "Collection name should not be 'Default'",
				});
				return false;
			}
			return true;
		}
		return true;
	}

	function onSubmitClick() {
		if (handleValidation()) {
			vscode.postMessage({
				type: requestTypes.copyToCollectionsRequest,
				data: {
					sourceId: sourceColId,
					distId: destColId === "0" ? uuidv4() : destColId,
					name: destColId === "0" ? destColName : "",
				},
			});
		}
	}

	function onNameChange(e: any) {
		setDestColName(e.target.value);
		setErrors({
			...errors,
			colName: e.target.value
				? e.target.value.toUpperCase().trim() === "DEFAULT"
					? "Collection name should not be 'Default'"
					: ""
				: "Cannot be empty",
		});
	}

	function renderHint() {
		return (
			<div className="reorder-hint">
				Copy the selected collection to another collection or create a new one.
			</div>
		);
	}

	function renderForm() {
		return (
			<table
				className="addto-table copyto-scroll-panel"
				cellPadding={0}
				cellSpacing={0}
			>
				<tbody>
					<tr>
						<td className="col-1-size">
							<span className="addto-label">Selected Collection :</span>
						</td>
						<td className="col-2-size">
							<input
								className="addto-text disabled"
								type="text"
								value={sourceColName}
								disabled
							/>
						</td>
					</tr>

					<tr>
						<td className="col-1-size">
							<span className="addto-label">Copy To :</span>
						</td>
						<td className="col-2-size block-display">
							<select
								className="addto-select"
								value={destColId}
								onChange={onSelect}
							>
								{collectionNames.map((item: any, index) => (
									<option
										key={index + item.name}
										value={item.value}
										disabled={item.disabled}
										hidden={index === 0}
									>
										{item.name}
									</option>
								))}
							</select>
						</td>
					</tr>

					{renderNewCollectionSection()}
				</tbody>
			</table>
		);
	}

	function renderNewCollectionSection() {
		if (destColId !== "0") {
			return null;
		}

		return (
			<>
				<tr>
					<td className="col-1-size">
						<span className="addto-label">New Collection Name :</span>
					</td>

					<td className="col-2-size">
						<input
							className={
								errors["colName"] ? "addto-text required-value" : "addto-text"
							}
							type="text"
							value={destColName}
							onChange={onNameChange}
						/>
					</td>
				</tr>

				{errors["colName"] && (
					<tr>
						<td />
						<td className="col-2-size">
							<div className="error-text">{errors["colName"]}</div>
						</td>
					</tr>
				)}
			</>
		);
	}

	function renderFooter() {
		return (
			<>
				{isDone && (
					<div className="reorder-status reorder-status--ok">
						Collection copied successfully.
					</div>
				)}

				<div className="reorder-btn-panel">
					<button
						type="button"
						className="submit-button reorder-btn"
						onClick={onSubmitClick}
						disabled={isDone}
					>
						{isDone ? "✓ Copied" : "Copy Collection"}
					</button>
				</div>
			</>
		);
	}

	return sourceColName ? (
		<PanelLayout
			title="📑 Copy Collection"
			loading={!sourceColName}
			footer={renderFooter()}
		>
			{renderHint()}
			<div className="reorder-tree-panel">{renderForm()}</div>
		</PanelLayout>
	) : (
		<></>
	);
};

export default CopyTo;
