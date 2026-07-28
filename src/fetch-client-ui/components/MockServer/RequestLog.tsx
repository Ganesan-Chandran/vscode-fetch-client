import React, { useEffect, useRef } from "react";
import { IMockRequestLog } from "../../../fetch-client-core/types/mockServer.types";

interface RequestLogProps {
	logs: IMockRequestLog[];
	onClear: () => void;
}

function formatTimestamp(iso: string): string {
	try {
		const d = new Date(iso);
		const hh = String(d.getHours()).padStart(2, "0");
		const mm = String(d.getMinutes()).padStart(2, "0");
		const ss = String(d.getSeconds()).padStart(2, "0");
		return `${hh}:${mm}:${ss}`;
	} catch {
		return iso.slice(11, 19);
	}
}

const METHOD_CLASSES: Record<string, string> = {
	GET: "ms-method-GET",
	POST: "ms-method-POST",
	PUT: "ms-method-PUT",
	PATCH: "ms-method-PATCH",
	DELETE: "ms-method-DELETE",
	OPTIONS: "ms-method-OPTIONS",
	HEAD: "ms-method-HEAD",
};

const RequestLog: React.FC<RequestLogProps> = ({ logs, onClear }) => {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [logs.length]);

	return (
		<div className="ms-log-panel">
			<div className="ms-log-header">
				<span>Request Log ({logs.length})</span>
				<button
					className="ms-btn ms-btn-icon"
					onClick={onClear}
					title="Clear log"
					disabled={logs.length === 0}
				>
					Clear
				</button>
			</div>

			<div className="ms-log-body">
				{logs.length === 0 ? (
					<div className="ms-log-empty">
						No requests yet. Start the server and send a request to see logs
						here.
					</div>
				) : (
					<>
						<div className="ms-log-header-row">
							<span>Time</span>
							<span>Method</span>
							<span className="log-header-path">Path</span>
							<span>Status</span>
							<span style={{ textAlign: "right" }}>Duration</span>
							<span style={{ textAlign: "center" }}>Match</span>
						</div>
						{logs.map((log) => (
							<div key={log.id} className="ms-log-row">
								<span className="ms-log-time">
									{formatTimestamp(log.timestamp)}
								</span>
								<span
									className={`ms-log-method ms-method-badge ${METHOD_CLASSES[log.method] ?? ""}`}
									style={{ fontSize: 10 }}
								>
									{log.method}
								</span>
								<span className="ms-log-path" title={log.path}>
									{log.path}
								</span>
								<span className="ms-log-status">{log.statusCode}</span>
								<span className="ms-log-duration">{log.durationMs}ms</span>
								<span
									className={
										log.matchedRouteId ? "ms-log-matched" : "ms-log-unmatched"
									}
									title={
										log.matchedRouteId ? "Matched route" : "No matching route"
									}
								>
									{log.matchedRouteId ? "✓" : "✗"}
								</span>
							</div>
						))}
						<div ref={bottomRef} />
					</>
				)}
			</div>
		</div>
	);
};

export default RequestLog;
