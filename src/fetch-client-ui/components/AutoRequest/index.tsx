import "./style.css";
import { formatDate } from "../../../fetch-client-core/helpers/dateTime.helper";
import { IAutoRequest, IAutoRequestHistory, IAutoRequestSchedule } from "../../../fetch-client-core/types/autorequest.types";
import { ICollection, IRequestList } from "../../../fetch-client-core/types/prefetch.types";
import { ReactComponent as BinLogo } from "../../../../icons/bin.svg";
import { requestTypes, responseTypes } from "../../../fetch-client-core/consts/requestTypes.consts";
import { v4 as uuidv4 } from "uuid";
import PanelLayout from "../Common/Layout/panelLayout";
import React, { useEffect, useState } from "react";
import vscode from "../Common/vscodeAPI";

const MAX_REQUESTS = 5;
const MAX_ACTIVE_SCHEDULES = 1;
const MIN_INTERVAL = 5;
const MAX_INTERVAL = 600;
const MIN_DURATION = 5;
const MAX_DURATION = 600;

const newRow = (scheduleId: string, colId = ""): IAutoRequest => {
	return (
		{
			id: uuidv4(),
			scheduleId,
			colId,
			reqId: "",
			reqName: "",
			parentId: "",
			interval: MIN_INTERVAL,
			duration: MIN_DURATION,
			status: true,
			cron: "",
			createdTime: formatDate()
		}
	);
};

const AutoRequest = () => {
	// UI
	const [loading, setLoading] = useState(true);
	const [tab, setTab] = useState<"create" | "summary">("create");
	const [message, setMessage] = useState("");

	// Collection
	const [isGlobal, setIsGlobal] = useState(true);
	const [colId, setColId] = useState("");
	const [colName, setColName] = useState("");
	const [collections, setCollections] = useState<ICollection[]>([]);
	const [requestLists, setRequestLists] = useState<Record<string, IRequestList[]>>({});

	// Schedule
	const [scheduleId, setScheduleId] = useState(uuidv4());
	const [rows, setRows] = useState<IAutoRequest[]>([newRow(scheduleId)]);
	const [schedules, setSchedules] = useState<IAutoRequestSchedule[]>([]);
	const [history, setHistory] = useState<IAutoRequestHistory[]>([]);
	const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

	const refresh = () => {
		vscode.postMessage({ type: requestTypes.getAutoRequestByColIdRequest });
		vscode.postMessage({ type: requestTypes.getAutoRequestHistoryRequest });
	};

	const handleCollectionsResponse = (data: any) => {
		setCollections([
			{ id: "", name: "--select--" },
			...(data.collectionNames ?? []).map((item: { value: string; name: string }) => ({
				id: item.value,
				name: item.name,
			})),
		]);
	};

	const handleCollectionRequestsResponse = (data: any) => {
		setRequestLists((current) => ({
			...current,
			[data.colId]: [
				{ id: "", name: "--select--" },
				...Object.entries(data.paths ?? {}).map(([id, name]) => ({
					id,
					name: String(name),
				})),
			],
		}));
	};

	const initialTabChecked = React.useRef(false);

	const handleAutoRequestResponse = (data: any) => {
		const scoped = Boolean(data.colId);

		setIsGlobal(!scoped);
		setColId(data.colId ?? "");
		setColName(data.name ?? "");

		if (scoped) {
			setRows((current) =>
				current.map((row) =>
					row.colId ? row : { ...row, colId: data.colId }
				)
			);

			vscode.postMessage({
				type: requestTypes.getCollectionsByIdWithPathRequest,
				data: data.colId,
			});
		}

		setSchedules(data.autoRequests ?? []);
		if (!initialTabChecked.current) {
			initialTabChecked.current = true;
			const hasActiveSchedule = (data.autoRequests ?? []).some(
				(item: IAutoRequestSchedule) => item.scheduleStatus === "running"
			);
			setTab(hasActiveSchedule ? "summary" : "create");
		}
		setLoading(false);
	};

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			const data = event.data;
			if (!data) { return; }
			if (data.type === responseTypes.getAllCollectionNamesResponse) {
				handleCollectionsResponse(data);
			} else if (data.type === responseTypes.getCollectionsByIdWithPathResponse) {
				handleCollectionRequestsResponse(data);
			} else if (data.type === responseTypes.getAutoRequestByColIdResponse) {
				handleAutoRequestResponse(data);
			} else if (data.type === responseTypes.getAutoRequestHistoryResponse) {
				setHistory(data.history ?? []);
			} else if (data.type === responseTypes.saveAutoRequestResponse) {
				if (data.success) {
					setMessage("Schedule enabled.");
					const id = uuidv4();
					setScheduleId(id);
					setRows([newRow(id, isGlobal ? "" : colId)]);
					setTab("summary");
					refresh();
				} else {
					setMessage(data.message ?? "Unable to enable the schedule.");
				}
			}
		};
		window.addEventListener("message", onMessage);
		refresh(); vscode.postMessage({ type: requestTypes.getAllCollectionNameRequest, data: "autorequest" });
		return () => window.removeEventListener("message", onMessage);
	}, []);

	const updateRow = (index: number, update: Partial<IAutoRequest>) => {
		setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row));
	};

	const selectCollection = (index: number, value: string) => {
		updateRow(index, { colId: value, reqId: "", reqName: "", parentId: "" });
		if (value && !requestLists[value]) { vscode.postMessage({ type: requestTypes.getCollectionsByIdWithPathRequest, data: value }); }
	};

	const selectRequest = (index: number, value: string) => {
		const row = rows[index];
		const name = requestLists[row.colId]?.find((request) => request.id === value)?.name ?? "";
		updateRow(index, { reqId: value, reqName: name.split(";")[0] ?? "", parentId: name.split(";")[1] ?? "" });
		if (value && index === rows.length - 1 && rows.length < MAX_REQUESTS) {
			setRows((current) => [...current, newRow(scheduleId)]);
		}
	};

	const deleteRow = (index: number) => {
		setRows((current) => current.length === 1 ? current : current.filter((_, rowIndex) => rowIndex !== index));
	};

	const numeric = (index: number, field: "interval" | "duration", value: string) => {
		if (/^\d*$/.test(value)) {
			updateRow(index, { [field]: Number(value) });
		}
	};

	// const populatedRows = rows.filter((row) => row.colId || row.reqId);
	const populatedRows = rows.filter((row) => row.reqId.trim() !== "");

	const valid = populatedRows.length > 0 && populatedRows.every((row) => row.colId && row.reqId && row.interval >= MIN_INTERVAL && row.interval <= MAX_INTERVAL && row.duration >= MIN_DURATION && row.duration <= MAX_DURATION && row.interval <= row.duration);

	const activeScheduleIds = new Set(schedules.filter((item) => item.scheduleStatus === "running").map((item) => item.scheduleId ?? item.id));

	const scheduleGroups = Object.values(schedules.reduce<Record<string, IAutoRequestSchedule[]>>((groups, item) => { const id = item.scheduleId ?? item.id; (groups[id] ??= []).push(item); return groups; }, {}));

	const statusClass = (status: string) => status === "success" || status === "completed" ? "history-status history-status--ok" : status === "pending" || status === "running" ? "history-status history-status--pending" : "history-status history-status--error";

	const isScheduleLimitReached = activeScheduleIds.size >= MAX_ACTIVE_SCHEDULES;

	const sortedHistory = [...history].sort((a, b) => {
		const aRunning = a.status === "running";
		const bRunning = b.status === "running";

		if (aRunning !== bRunning) {
			return aRunning ? -1 : 1;
		}

		const aTime = a.executedTime ? new Date(a.executedTime).getTime() : 0;
		const bTime = b.executedTime ? new Date(b.executedTime).getTime() : 0;

		return bTime - aTime;
	});

	const filteredHistory = selectedScheduleId
		? sortedHistory.filter(
			item => (item.scheduleId ?? item.autoReqId) === selectedScheduleId
		)
		: sortedHistory;

	const sortedScheduleGroups = [...scheduleGroups].sort((a, b) => {
		return (
			new Date(b[0].createdTime ?? 0).getTime() -
			new Date(a[0].createdTime ?? 0).getTime()
		);
	});

	const collectionName = (id: string) => {
		return collections.find((collection) => collection.id === id)?.name ?? "-";
	};

	return (
		<PanelLayout
			title={isGlobal ? "🔁 Scheduled Runs" : `🔁 Scheduled Runs - ${colName}`}
			loading={loading}
			footer={tab === "create" ?
				<>
					{
						message && <div className="reorder-status reorder-status--ok">
							{message}
						</div>
					}
					<div className="reorder-btn-panel">
						<button className="submit-button reorder-btn"
							disabled={!valid || isScheduleLimitReached}
							onClick={() => {
								setMessage("");
								vscode.postMessage({ type: requestTypes.saveAutoRequestRequest, data: populatedRows });
							}}>Enable
						</button>
					</div>
				</> :
				undefined
			}
		>
			<div className="autorequest-tabs">
				<button
					className={tab === "create" ? "autorequest-tab active" : "autorequest-tab"}
					onClick={() => setTab("create")}
				>
					Create schedule</button>
				<button className={tab === "summary" ? "autorequest-tab active" : "autorequest-tab"} onClick={() => { setTab("summary"); refresh(); }}>Execution summary</button>
			</div>
			{tab === "create" ?
				<div className="autorequest-create-wrapper">

					<div>
						<>
							{
								isScheduleLimitReached && <div className="autorequest-max-note">
									"A schedule is already running. It must finish, complete, or be stopped before you can create another."
								</div>
							}
							{
								!isScheduleLimitReached && <div className="autorequest-max-note">
									Up to {MAX_REQUESTS} requests in this schedule
								</div>
							}
							<div className={isScheduleLimitReached
								? "reorder-tree-panel autorequest-scroll-panel disabled"
								: "reorder-tree-panel autorequest-scroll-panel"} >
								<div className={`autorequest-row autorequest-row--header ${!isGlobal ? "autorequest-row--scoped" : ""}`}>
									{isGlobal && <div className="autorequest-cell">Collection</div>}
									<div className="autorequest-cell">Request</div>
									<div className="autorequest-cell">Interval (minutes)
										<label
											className="runall-settings-info-label"
											title={
												`Time between the request exection. \nmin value is ${MIN_INTERVAL} and max value is ${MAX_INTERVAL}`
											}
										>
											ⓘ
										</label>
									</div>
									<div className="autorequest-cell">Duration (minutes)
										<label
											className="runall-settings-info-label"
											title={
												`Total duration of the request execution.\nmin value is ${MIN_DURATION} and max value is ${MAX_DURATION}`
											}
										>
											ⓘ
										</label></div>
									<div className="autorequest-cell">Remove</div>
								</div>
								{
									rows.map((row, index) =>
										<div className={`autorequest-row ${!isGlobal ? "autorequest-row--scoped" : ""}`} key={row.id}>
											{isGlobal && <div className="autorequest-cell">
												<select
													className="preReq-col-select"
													value={row.colId}
													onChange={(event) => selectCollection(index, event.target.value)}
												>
													{
														collections.map((collection) =>
															<option
																value={collection.id}
																key={collection.id}
																disabled={!collection.id}
																hidden={!collection.id}>{collection.name}
															</option>
														)
													}
												</select>
											</div>
											}
											<div className="autorequest-cell">
												<select
													className="preReq-col-select"
													value={row.reqId}
													disabled={!row.colId}
													onChange={(event) => selectRequest(index, event.target.value)}>
													{(
														requestLists[row.colId] ?? [{ id: "", name: "--select--" }]).map((request) =>
															<option
																value={request.id}
																key={request.id}
																disabled={!request.id}
																hidden={!request.id}>
																{request.name.split(";")[0]}
															</option>
														)
													}
												</select>
											</div>
											<div className="autorequest-cell">
												<input
													className="autorequest-text-box"
													value={row.interval}
													disabled={!row.colId}
													onChange={(event) => numeric(index, "interval", event.target.value)} />
											</div>
											<div className="autorequest-cell">
												<input
													className="autorequest-text-box"
													value={row.duration}
													disabled={!row.colId}
													onChange={(event) => numeric(index, "duration", event.target.value)} />
											</div>
											<div className="autorequest-cell">
												{(row.colId || row.reqId) && <BinLogo className="delete-button" onClick={() => deleteRow(index)} />}
											</div>
										</div>
									)
								}
							</div>
						</>
					</div>
					{/* {isScheduleLimitReached && (
						<div className="autorequest-overlay">
							<div className="autorequest-overlay-message">
								A schedule is already running.
								<br />
								Stop or wait for it to complete before creating another schedule.
							</div>
						</div>
					)} */}

				</div>
				:
				<div className="autorequest-summary">
					<div className="summary-heading">
						<span>Schedules ({activeScheduleIds.size}/{MAX_ACTIVE_SCHEDULES} active)</span>
						<button className="submit-button" onClick={refresh}>Refresh</button>
					</div>
					<div className="autorequest-table schedule-table">
						<div className="autorequest-table-row header">
							<span>Schedule</span>
							<span>Requests</span>
							<span>Collection</span>
							<span>Status</span>
							<span>Next run</span>
							<span>Created</span>
						</div>
						{
							sortedScheduleGroups.length ? sortedScheduleGroups.map(
								(group) => {
									const statuses = group.map((item) => item.scheduleStatus);
									const status = statuses.includes("running") ? "running" : statuses.includes("failed") ? "failed" : statuses.includes("completed") ? "completed" : "stopped";
									return <div className={`autorequest-table-row ${selectedScheduleId === (group[0].scheduleId ?? group[0].id)
										? "selected-row"
										: ""
										}`} key={group[0].scheduleId ?? group[0].id}
										onClick={() => {
											const id = group[0].scheduleId ?? group[0].id;
											setSelectedScheduleId(current =>
												current === id ? null : id
											);
										}}
										style={{ cursor: "pointer" }}>
										<span>{(group[0].scheduleId ?? group[0].id).slice(0, 8)}</span><span>{group.length}</span>
										<span>{collectionName(group[0].colId)}</span>
										<span className={statusClass(status)}>{status}</span>
										<span>{group.find((item) => item.scheduleStatus === "running")?.nextRunTime ?? "-"}</span>
										<span>{group[0].createdTime}</span>
									</div>;
								}) :
								<div className="no-history-text">No schedules created yet</div>
						}
					</div>
					<div className="history-section-title">Requests</div><div className="autorequest-table request-table">
						<div className="autorequest-table-row header">
							<span>Schedule</span>
							<span>Request</span>
							<span>Status</span>
							<span>Status code</span>
							<span>Duration</span>
							<span>Executed time</span>
						</div>{
							filteredHistory.length ? filteredHistory.map(
								(item) =>
									<div className="autorequest-table-row" key={item.id}>
										<span>{(item.scheduleId ?? item.autoReqId).slice(0, 8)}</span>
										<span>{item.requestName}</span>
										<span className={statusClass(item.status)}>{item.status}</span>
										<span>{item.statusCode ?? "-"}</span>
										<span>{item.duration === undefined || item.duration === null ? "-" : `${item.duration} ms`}</span>
										<span>{item.executedTime ?? "-"}</span>
									</div>
							) : (
								<div className="no-history-text">
									{selectedScheduleId
										? "No requests found for the selected schedule"
										: "No request executions yet"}
								</div>
							)
						}
					</div>
				</div>}
		</PanelLayout>
	);
};

export default AutoRequest;
