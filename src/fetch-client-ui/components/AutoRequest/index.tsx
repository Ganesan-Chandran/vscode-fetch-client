import "./style.css";
import { formatDate } from "../../../fetch-client-core/helpers/dateTime.helper";
import { IAutoRequest } from "../../../fetch-client-core/types/autorequest.types";
import { ICollection, IColRequest, IRequestList } from "../../../fetch-client-core/types/prefetch.types";
import { ReactComponent as BinLogo } from '../../../../icons/bin.svg';
import { requestTypes, responseTypes } from "../../../fetch-client-core/consts/requestTypes.consts";
import { v4 as uuidv4 } from 'uuid';
import PanelLayout from "../Common/Layout/panelLayout";
import React, { useEffect, useRef, useState } from "react";
import vscode from "../Common/vscodeAPI";

const AutoRequest = () => {

	const [loading, setLoading] = useState(true);
	const [collections, setCollections] = useState<ICollection[]>([]);

	const [colRequestList, _setColRequestList] = useState<IColRequest[]>([{ id: "", reqs: [] }]);
	const refColRequestList = useRef(colRequestList);
	const setColRequestList = (data: IColRequest[]) => {
		refColRequestList.current = data;
		_setColRequestList(refColRequestList.current);
	};

	const [selectedRequestList, _setSelectedRequestList] = useState<IAutoRequest[]>([{ id: uuidv4(), colId: "", reqId: "", parentId: "", interval: 15, duration: 15, status: false, cron: "", createdTime: formatDate() }]);
	const refSelectedRequestList = useRef(selectedRequestList);
	const setSelectedRequestList = (data: IAutoRequest[]) => {
		refSelectedRequestList.current = data;
		_setSelectedRequestList(refSelectedRequestList.current);
	};

	const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);


	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data && event.data.type === responseTypes.getAllCollectionNamesResponse) {
				let col: ICollection[] = event.data.collectionNames?.map((item: { value: any; name: any; }) => {
					return {
						id: item.value,
						name: item.name
					};
				});
				col.unshift({ id: "", name: "--select--" });
				setCollections(col);
				setLoading(false);
			} else if (event.data && event.data.type === responseTypes.getCollectionsByIdWithPathResponse) {
				let reqList: IRequestList[] = [{ id: "", name: "--select--" }];
				for (const [key, value] of Object.entries(event.data.paths)) {
					reqList.push({
						id: key,
						name: value as string
					});
				}
				let col: IColRequest = {
					id: event.data.colId,
					reqs: reqList
				};

				let localData = [...refColRequestList.current];
				localData.push(col);
				setColRequestList(localData);
			} else if (event.data && event.data.type === responseTypes.getAllAutoRequestResponse) {
				let reqs: IAutoRequest[] = event.data.autoRequests;
				if (reqs.length !== 0) {
					for (let i = 0; i < reqs.length; i++) {
						vscode.postMessage({ type: requestTypes.getCollectionsByIdWithPathRequest, data: reqs[i].colId });
					}

					if (reqs.length !== 5) {
						reqs.push({
							id: uuidv4(),
							colId: "",
							reqId: "",
							parentId: "",
							interval: 15,
							duration: 15,
							status: false,
							cron: "",
							createdTime: formatDate()
						});
					}
					setSelectedRequestList(event.data.autoRequests);
				}
			}
		};
		window.addEventListener("message", handleMessage);
		vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "autorequest" });
		vscode.postMessage({ type: requestTypes.getAllAutoRequest });

		return () => window.removeEventListener("message", handleMessage);
	}, []);

	function onDeleteReqClick(index: number) {
		let localData = [...selectedRequestList];
		localData.splice(index, 1);
		if (selectedRequestList.filter(i => i.colId).length === 5) {
			localData.push({
				id: uuidv4(),
				colId: "",
				reqId: "",
				parentId: "",
				interval: 15,
				duration: 15,
				status: false,
				cron: "",
				createdTime: formatDate()
			});
		}
		setSelectedRequestList(localData);
	}

	const onSelectRequest = (id: string, index: number, type: string) => {
		let serachIndex = -1;
		if (type === "col") {
			serachIndex = colRequestList.findIndex(i => i.id === id);
			if (serachIndex === -1) {
				vscode.postMessage({ type: requestTypes.getCollectionsByIdWithPathRequest, data: id });
			}
		}

		let localData = [...selectedRequestList];

		if (type === "col") {
			localData[index].colId = id;
			localData[index].status = true;
		} else {

			let colId = localData[index].colId;
			let name = colRequestList.find(i => i.id === colId)?.reqs?.filter(j => j.id === id)[0].name;
			let parentId = name.split(";")[1];
			localData[index].reqId = id;
			localData[index].parentId = parentId;
		}

		if (index === localData.length - 1 && localData.length < 5) {
			localData.push({
				id: uuidv4(),
				colId: "",
				reqId: "",
				parentId: "",
				interval: 15,
				duration: 15,
				status: false,
				cron: "",
				createdTime: formatDate()
			});
		}

		setSelectedRequestList(localData);
	};

	const getRequestList = (index: number) => {
		let colId = selectedRequestList[index]?.colId;

		if (colId) {
			let re = colRequestList.find(i => i.id === colId)?.reqs;
			return re;
		}

		return [];
	};

	const onIntervalUpdate = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
		const re = /^[0-9\b]+$/;
		let localData = [...selectedRequestList];
		if (event.target.value === "") {
			localData[index].interval = 0;
		}
		else if (re.test(event.target.value)) {
			localData[index].interval = Number(event.target.value);
		}
		setSelectedRequestList(localData);
	};

	const onDurationUpdate = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
		const re = /^[0-9\b]+$/;
		let localData = [...selectedRequestList];
		if (event.target.value === "") {
			localData[index].duration = 0;
		}
		else if (re.test(event.target.value)) {
			localData[index].duration = Number(event.target.value);
		}
		setSelectedRequestList(localData);
	};

	const getCss = (value: number) => {
		if (value < 15 || value > 600) {
			return "autorequest-text-box invalid-value-border";
		}

		return "autorequest-text-box";
	};

	const getButtonDisabledStatus = () => {

		if (selectedRequestList.length === 1 && !selectedRequestList[0].colId) {
			return true;
		}

		if (selectedRequestList.findIndex(i => i.colId && (!i.reqId || i.interval < 15 || i.duration < 15 || i.interval > 600 || i.duration > 600 || i.interval > i.duration)) !== -1) {
			return true;
		}

		return false;
	};

	const onEnableAutoRequest = () => {
		vscode.postMessage({ type: requestTypes.saveAutoRequestRequest, data: selectedRequestList });
		setStatusMsg({ text: "Auto request settings saved successfully." });
	};

	const formatDuration = (totalMinutes: number): string => {
		if (totalMinutes > 60) {
			const hours = Math.floor(totalMinutes / 60);
			const minutes = String(totalMinutes % 60).padStart(2, '0');
			return `${hours}:${minutes} hours`;
		}
		return `${totalMinutes} minutes`;
	};

	function renderStatus() {
		if (!statusMsg) { return null; }
		return (
			<div className={`reorder-status ${statusMsg.isError ? "reorder-status--error" : "reorder-status--ok"}`}>
				{statusMsg.text}
			</div>
		);
	}

	function renderHeader() {
		return (
			<div className="autorequest-row autorequest-row--header">
				<div className="autorequest-cell">Collection</div>
				<div className="autorequest-cell">Request</div>
				<div className="autorequest-cell">
					Interval (minutes)
					<label
						className="runall-settings-info-label"
						title={"Time between the request exection. \nmin value is 15 and max value is 600"}>
						ⓘ
					</label>
				</div>
				<div className="autorequest-cell">
					Duration (minutes)
					<label
						className="runall-settings-info-label"
						title={"Total duration of the auto request execution.\nmin value is 15 and max value is 600"}
					>
						ⓘ
					</label>
				</div>
				<div className="autorequest-cell">Remove</div>
			</div>
		);
	}

	function renderRequests() {
		return (
			selectedRequestList.map((item, index) => {
				return (
					<div className="autorequest-row" key={item.id}>
						<div className="autorequest-cell">
							<select className="preReq-col-select"
								id={"preReq_col_" + index.toString()}
								required={true}
								value={item.colId}
								onChange={(e) => onSelectRequest(e.target.value, index, "col")}
							>
								{collections?.length > 0 && collections.map((item, index) => (
									<option value={item.id} key={index + item.name} disabled={index === 0 ? true : false} hidden={index === 0 ? true : false}>
										{item.name}
									</option>
								))}
							</select>
						</div>
						<div className="autorequest-cell">
							<select className="preReq-col-select"
								id={"preReq_req_" + index.toString()}
								required={true}
								value={item.reqId}
								onChange={(e) => onSelectRequest(e.target.value, index, "req")}
							>
								{getRequestList(index)?.map(({ id, name }) => (
									<option value={id} key={id}>
										{name.split(";")[0]}
									</option>
								))}
							</select>
						</div>
						<div className="autorequest-cell">
							<input
								id={"preReq_int_" + index.toString()}
								className={getCss(item.interval)}
								value={item.interval}
								onChange={(event) => onIntervalUpdate(event, index)}
								disabled={selectedRequestList[index].colId ? false : true}
								placeholder={"interval"}
								type="text"
							/>
						</div>
						<div className="autorequest-cell">
							<input
								id={"preReq_dur_" + index.toString()}
								className={getCss(item.duration)}
								value={item.duration}
								onChange={(event) => onDurationUpdate(event, index)}
								disabled={selectedRequestList[index].colId ? false : true}
								placeholder={"interval"}
								type="text"
							/>
							<label
								className="runall-settings-info-label"
								title={
									item.colId && item.reqId
										? `The request will be executed every ${formatDuration(item.interval)}. \nuntil the next ${formatDuration(item.duration)}`
										: ""
								}
							>
								ⓘ
							</label>
						</div>
						<div className="autorequest-cell">
							{(selectedRequestList[index].colId || selectedRequestList[index].reqId) && <BinLogo className="delete-button" onClick={() => onDeleteReqClick(index)} />}
						</div>
					</div>
				);
			})
		);
	}

	return (
		<PanelLayout
			title="🔁 Auto Request"
			loading={loading}
			footer={
				<div className="reorder-btn-panel">
					<button
						className="submit-button reorder-btn"
						disabled={getButtonDisabledStatus()}
						onClick={onEnableAutoRequest}
					>
						Enable
					</button>
				</div>
			}
		>
			<div className="autorequest-max-note">
				Max 5 requests · Requests containing PreFetch steps will skip PreFetch execution
			</div>
			<div className="reorder-tree-panel autorequest-scroll-panel">
				{renderHeader()}
				{renderRequests()}
			</div>
			{renderStatus()}
		</PanelLayout>
	);
};

export default AutoRequest;