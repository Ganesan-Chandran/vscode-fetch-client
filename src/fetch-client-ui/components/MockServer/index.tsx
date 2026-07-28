import "./style.css";
import { formatDate } from "../../../fetch-client-core/helpers/dateTime.helper";
import {
	IMockRoute,
	IMockServer,
	MockServerStatus,
} from "../../../fetch-client-core/types/mockServer.types";
import { ICollections } from "../../../fetch-client-core/types/sidebar.types";
import {
	requestTypes,
	responseTypes,
} from "../../../fetch-client-core/consts/requestTypes.consts";
import {
	AppendLogAction,
	MockServerReducer,
	SetLocalChangeAction,
	SetLogsAction,
	SetRoutesAction,
	SetSelectedRouteAction,
	SetServerAction,
	SetStatusAction,
	MockServerActionTypes,
} from "./redux";
import { MIN_PORT, MAX_PORT } from "./constants";
import GenerateModal from "./GenerateModal";
import PanelLayout from "../Common/Layout/panelLayout";
import React, { useEffect, useReducer, useState } from "react";
import RequestLog from "./RequestLog";
import RouteDetail from "./RouteDetail";
import RouteList from "./RouteList";
import vscode from "../Common/vscodeAPI";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function defaultRoute(): IMockRoute {
	return {
		id: uuidv4(),
		name: "New Route",
		method: "GET",
		path: "/",
		statusCode: 200,
		bodyType: "json",
		body: JSON.stringify({ message: "Hello from mock server!" }, null, 2),
		headers: [{ key: "Content-Type", value: "application/json" }],
		delayMs: 0,
		isEnabled: true,
		bodyMatcher: {
			enabled: false,
			matchType: "none",
			value: ""
		}
	};
}

function defaultServer(): IMockServer {
	return {
		id: uuidv4(),
		name: "My Mock Server",
		port: 3100,
		description: "",
		createdTime: formatDate(),
		modifiedTime: formatDate(),
		routes: [],
	};
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const MockServer: React.FC = () => {
	const [state, dispatch] = useReducer<
		React.Reducer<ReturnType<typeof MockServerReducer>, MockServerActionTypes>
	>(MockServerReducer, {
		server: null,
		status: "stopped",
		statusError: "",
		selectedRouteId: null,
		logs: [],
		isLocalChange: false,
	});

	const [showGenerate, setShowGenerate] = useState(false);
	const [collections, setCollections] = useState<ICollections[]>([]);
	const [portError, setPortError] = useState("");
	const [activeTab, setActiveTab] = useState<"routes" | "logs">("routes");

	const isRunning = state.status === "running";
	const server = state.server;
	const selectedRoute =
		server?.routes.find((r) => r.id === state.selectedRouteId) ?? null;

	// ── Boot ────────────────────────────────────────────────────────
	useEffect(() => {
		const id = document.title.split("@:@")[1];

		if (id) {
			vscode.postMessage({
				type: requestTypes.getMockServerByIdRequest,
				data: { id },
			});
		} else {
			dispatch(SetServerAction(defaultServer()));
		}

		const handleMessage = (event: MessageEvent) => {
			const msg = event.data;
			if (!msg?.type) { return; }

			switch (msg.type) {
				case responseTypes.getMockServerByIdResponse:
					if (msg.data && !msg.data.generatedRoutes) {
						dispatch(SetServerAction(msg.data.server));
						dispatch(SetStatusAction(msg.data.runtime.status));
						dispatch(SetLogsAction(msg.data.runtime.logs));
					}
					break;

				case responseTypes.saveMockServerResponse:
				case responseTypes.updateMockServerResponse:
					dispatch(SetServerAction(msg.data as IMockServer));
					dispatch(SetLocalChangeAction(false));
					break;

				case responseTypes.mockServerStatusResponse:
					dispatch(
						SetStatusAction(
							msg.data.status as MockServerStatus,
							msg.data.error,
						),
					);
					break;

				case responseTypes.mockServerLogResponse:
					if (msg.data.append) {
						dispatch(AppendLogAction(msg.data.logs[0]));
					} else {
						dispatch(SetLogsAction(msg.data.logs));
					}
					break;

				case responseTypes.getAllCollectionsResponse:
					setCollections(msg.collections as ICollections[]);
					setShowGenerate(true);
					break;

				default:
					break;
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	// ── Validate port ────────────────────────────────────────────────
	function validatePort(val: number): string {
		if (isNaN(val) || val < MIN_PORT || val > MAX_PORT) {
			return `Port must be between ${MIN_PORT} and ${MAX_PORT}.`;
		}
		return "";
	}

	// ── Server field updates ─────────────────────────────────────────
	function updateServer(partial: Partial<IMockServer>) {
		if (!server) { return; }
		dispatch(SetServerAction({ ...server, ...partial }));
		dispatch(SetLocalChangeAction(true));
	}

	// ── Route operations ─────────────────────────────────────────────
	function addRoute() {
		if (!server || isRunning) { return; }
		const r = defaultRoute();
		const updated = [...server.routes, r];
		dispatch(SetRoutesAction(updated));
		dispatch(SetSelectedRouteAction(r.id));
		dispatch(SetLocalChangeAction(true));
	}

	function deleteRoute(id: string) {
		if (!server || isRunning) { return; }
		const updated = server.routes.filter((r) => r.id !== id);
		dispatch(SetRoutesAction(updated));
		if (state.selectedRouteId === id) {
			dispatch(
				SetSelectedRouteAction(updated.length > 0 ? updated[0].id : null),
			);
		}
		dispatch(SetLocalChangeAction(true));
	}

	function updateRoute(route: IMockRoute) {
		if (!server) { return; }
		const updated = server.routes.map((r) => (r.id === route.id ? route : r));
		dispatch(SetRoutesAction(updated));
		dispatch(SetLocalChangeAction(true));
	}

	function handleGeneratedRoutes(newRoutes: IMockRoute[]) {
		if (!server) { return; }
		const merged = deduplicateMerge(server.routes, newRoutes);
		dispatch(SetRoutesAction(merged));
		dispatch(SetLocalChangeAction(true));
		setShowGenerate(false);
		if (merged.length > 0) {
			dispatch(SetSelectedRouteAction(merged[0].id));
		}
	}

	function deduplicateMerge(
		existing: IMockRoute[],
		incoming: IMockRoute[],
	): IMockRoute[] {
		const seen = new Set(existing.map((r) => `${r.method}:${r.path}`));
		const newOnes = incoming.filter((r) => !seen.has(`${r.method}:${r.path}`));
		return [...existing, ...newOnes];
	}

	// ── Save ─────────────────────────────────────────────────────────
	function handleSave() {
		if (!server) { return; }
		const err = validatePort(server.port);
		if (err) {
			setPortError(err);
			return;
		}
		setPortError("");

		const isNew = !document.title.split("@:@")[1];
		vscode.postMessage({
			type: isNew
				? requestTypes.saveMockServerRequest
				: requestTypes.updateMockServerRequest,
			data: server,
		});
	}

	// ── Start / Stop ─────────────────────────────────────────────────
	function handleStart() {
		if (!server) { return; }
		const err = validatePort(server.port);
		if (err) {
			setPortError(err);
			return;
		}
		setPortError("");

		vscode.postMessage({
			type: requestTypes.startMockServerRequest,
			data: server,
		});

		handleSave();
	}

	function handleStop() {
		if (!server) { return; }
		vscode.postMessage({
			type: requestTypes.stopMockServerRequest,
			data: { id: server.id },
		});
	}

	// ── Delete ───────────────────────────────────────────────────────
	function handleDelete() {
		if (!server) { return; }
		vscode.postMessage({
			type: requestTypes.deleteMockServerRequest,
			data: { id: server.id, name: server.name },
		});
	}

	// ── Generate modal ────────────────────────────────────────────────
	function openGenerate() {
		vscode.postMessage({
			type: requestTypes.generateMockFromCollectionRequest,
		});
	}

	// ── Clear logs ────────────────────────────────────────────────────
	function handleClearLogs() {
		if (!server) { return; }
		vscode.postMessage({
			type: requestTypes.clearMockServerLogsRequest,
			data: { id: server.id },
		});
		dispatch(SetLogsAction([]));
	}

	// ── Render ───────────────────────────────────────────────────────
	if (!server) {
		return (
			<PanelLayout title="Mock Server" loading>
				{null}
			</PanelLayout>
		);
	}

	const statusLabel: Record<MockServerStatus, string> = {
		running: `Running on http://localhost:${server.port}`,
		stopped: "Stopped",
		error: `Error${state.statusError ? ": " + state.statusError : ""}`,
	};

	const titleNode = (
		<div className="ms-header">
			{/* Row 1: name + port + start/stop */}
			<div className="ms-header-row">
				<span className="ms-field-label">Name</span>
				<input
					className="ms-text-input name"
					value={server.name}
					disabled={isRunning}
					onChange={(e) => updateServer({ name: e.target.value })}
					placeholder="Mock server name"
				/>
				<span className="ms-field-label">Port</span>
				<input
					type="number"
					className={`ms-text-input port${portError ? " error" : ""}`}
					value={server.port}
					disabled={isRunning}
					min={MIN_PORT}
					max={MAX_PORT}
					onChange={(e) => {
						const v = parseInt(e.target.value, 10);
						setPortError(validatePort(v));
						updateServer({ port: v });
					}}
					title={`${MIN_PORT}–${MAX_PORT}`}
				/>
				<span className="ms-port-hint">
					{MIN_PORT}–{MAX_PORT}
				</span>

				{/* spacer */}
				<span style={{ flex: 1 }} />

				{!isRunning ? (
					<button className="ms-btn ms-btn-primary" onClick={handleStart}>
						▶ Start
					</button>
				) : (
					<button className="ms-btn ms-btn-danger" onClick={handleStop}>
						■ Stop
					</button>
				)}

				{!isRunning && (
					<>
						<button
							className="ms-btn ms-btn-secondary"
							onClick={openGenerate}
							title="Generate routes from Collection or OpenAPI"
						>
							⚡ Generate
						</button>
						<button
							className="ms-btn ms-btn-secondary"
							onClick={handleSave}
							disabled={!state.isLocalChange}
						>
							Save
						</button>
						<button
							className="ms-btn ms-btn-danger"
							onClick={handleDelete}
							title="Delete server"
						>
							Delete
						</button>
					</>
				)}
			</div>

			{/* Row 2: description + status */}
			<div className="ms-header-meta">
				<span className="ms-field-label">Description</span>
				<input
					className="ms-description-input"
					value={server.description}
					disabled={isRunning}
					onChange={(e) => updateServer({ description: e.target.value })}
					placeholder="Optional description"
				/>
				<div className="ms-status-bar">
					<span className={`ms-status-dot ${state.status}`} />
					<span className="ms-status-label">{statusLabel[state.status]}</span>
				</div>
			</div>

			{portError && <div className="ms-status-error">{portError}</div>}
		</div>
	);

	return (
		<PanelLayout title={titleNode}>
			<div
				className="ms-panel"
				style={{
					flex: 1,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
				}}
			>
				{/* Tabs: Routes / Logs */}
				<div className="ms-tabs">
					<button
						className={`ms-tab${activeTab === "routes" ? " active" : ""}`}
						onClick={() => setActiveTab("routes")}
					>
						Routes ({server.routes.length})
					</button>
					<button
						className={`ms-tab${activeTab === "logs" ? " active" : ""}`}
						onClick={() => setActiveTab("logs")}
					>
						Logs {state.logs.length > 0 ? `(${state.logs.length})` : ""}
					</button>
				</div>

				{activeTab === "routes" && (
					<div className="ms-split">
						<RouteList
							routes={server.routes}
							selectedRouteId={state.selectedRouteId}
							serverRunning={isRunning}
							onSelect={(id) => dispatch(SetSelectedRouteAction(id))}
							onAdd={addRoute}
							onDelete={deleteRoute}
						/>
						<div className="ms-detail">
							{selectedRoute ? (
								<RouteDetail
									route={selectedRoute}
									serverRunning={isRunning}
									onChange={updateRoute}
								/>
							) : (
								<div className="ms-detail-empty">
									{server.routes.length === 0
										? "Add a route to get started."
										: "Select a route to edit it."}
								</div>
							)}
						</div>
					</div>
				)}

				{activeTab === "logs" && (
					<RequestLog logs={state.logs} onClear={handleClearLogs} />
				)}
			</div>

			{showGenerate && (
				<GenerateModal
					collections={collections}
					onGenerated={handleGeneratedRoutes}
					onClose={() => setShowGenerate(false)}
				/>
			)}
		</PanelLayout>
	);
};

export default MockServer;
