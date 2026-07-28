import React, { useState } from "react";
import {
	IMockHeader,
	IMockRoute,
	MockBodyMatchType,
	MockBodyType,
	MockMethod,
} from "../../../fetch-client-core/types/mockServer.types";

const METHODS: MockMethod[] = [
	"GET",
	"POST",
	"PUT",
	"PATCH",
	"DELETE",
	"OPTIONS",
	"HEAD",
	"*",
];
const BODY_TYPES: { label: string; value: MockBodyType }[] = [
	{ label: "JSON", value: "json" },
	{ label: "Text", value: "text" },
	{ label: "XML", value: "xml" },
	{ label: "HTML", value: "html" },
	{ label: "None", value: "none" },
];
const BODY_MATCH_TYPES: { label: string; value: MockBodyMatchType; }[] = [
	{ label: "None", value: "none", },
	{ label: "Exact", value: "exact", },
	{ label: "Contains", value: "contains", },
	{ label: "JSON", value: "json", },
];
const STATUS_CODES = [
	200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 502, 503,
];
const TABS = ["Response", "Headers", "Request Match"] as const;
type Tab = (typeof TABS)[number];

interface RouteDetailProps {
	route: IMockRoute;
	serverRunning: boolean;
	onChange: (updated: IMockRoute) => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({
	route,
	serverRunning,
	onChange,
}) => {
	const [activeTab, setActiveTab] = useState<Tab>("Response");
	const disabled = serverRunning;

	const update = (partial: Partial<IMockRoute>) =>
		onChange({ ...route, ...partial });

	// ── Header table helpers ──────────────────────────────────────
	function addHeader() {
		update({ headers: [...route.headers, { key: "", value: "" }] });
	}

	function setHeader(index: number, field: keyof IMockHeader, value: string) {
		const headers = route.headers.map((h, i) =>
			i === index ? { ...h, [field]: value } : h,
		);
		// Auto-add empty row when last row gets content
		if (
			index === headers.length - 1 &&
			headers[index].key &&
			headers[index].value
		) {
			headers.push({ key: "", value: "" });
		}
		update({ headers });
	}

	function deleteHeader(index: number) {
		update({ headers: route.headers.filter((_, i) => i !== index) });
	}

	return (
		<div className="ms-detail">
			{/* ── Top form row ── */}
			<div className="ms-detail-scroll">
				{/* Name */}
				<div className="ms-form-row">
					<span className="ms-field-label">
						Name
					</span>
					<input
						className="ms-text-input name"
						style={{ flex: 1 }}
						value={route.name}
						disabled={disabled}
						onChange={(e) => update({ name: e.target.value })}
						placeholder="Route name"
					/>
					<label className="ms-toggle-row">
						<span className="ms-field-label">
							Enabled
						</span>
						<label className="ms-toggle">
							<input
								type="checkbox"
								checked={route.isEnabled}
								disabled={disabled}
								onChange={(e) =>
									update({
										isEnabled: e.target.checked,
									})
								}
							/>
							<span className="ms-toggle-slider" />
						</label>
					</label>
				</div>

				{/* Method + Path */}
				<div className="ms-form-row">
					<span className="ms-field-label">Method</span>
					<select
						className="ms-select method"
						value={route.method}
						disabled={disabled}
						onChange={(e) => update({ method: e.target.value as MockMethod })}
					>
						{METHODS.map((m) => (
							<option key={m} value={m}>
								{m === "*" ? "ANY" : m}
							</option>
						))}
					</select>
					<span className="ms-field-label">Path</span>
					<input
						className="ms-path-input"
						value={route.path}
						disabled={disabled}
						onChange={(e) => update({ path: e.target.value })}
						placeholder="/users/:id"
						spellCheck={false}
					/>
				</div>

				{/* Tabs */}
				<div className="ms-tabs" style={{ marginTop: 4 }}>
					{TABS.map((tab) => (
						<button
							key={tab}
							className={`ms-tab${activeTab === tab ? " active" : ""}`}
							onClick={() => setActiveTab(tab)}
						>
							{tab}
						</button>
					))}
				</div>

				{/* ── Response tab ── */}
				{activeTab === "Response" && (
					<div className="ms-form-section" style={{ marginTop: 12 }}>
						<div className="ms-form-row">
							<span className="ms-field-label">Status</span>
							<select
								className="ms-select status"
								value={route.statusCode}
								disabled={disabled}
								onChange={(e) =>
									update({
										statusCode: parseInt(e.target.value, 10),
									})
								}
							>
								{STATUS_CODES.map((c) => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
							<span className="ms-field-label">
								Body type
							</span>
							<select
								className="ms-select body-type"
								value={route.bodyType}
								disabled={disabled}
								onChange={(e) =>
									update({
										bodyType:
											e.target.value as MockBodyType,
									})
								}
							>
								{BODY_TYPES.map((b) => (
									<option key={b.value} value={b.value}>
										{b.label}
									</option>
								))}
							</select>
							<span className="ms-field-label">
								Delay (ms)
							</span>
							<input
								type="number"
								className="ms-delay-input"
								min={0}
								max={30000}
								step={50}
								value={route.delayMs}
								disabled={disabled}
								onChange={(e) =>
									update({
										delayMs: Math.max(
											0,
											parseInt(e.target.value, 10) || 0,
										),
									})
								}
							/>
						</div>

						{/* NEW */}
						{route.bodyType !== "none" && (
							<div className="ms-form-section">
								<div className="ms-section-title">
									Response Body
								</div>
								<textarea
									className="ms-body-editor"
									rows={14}
									spellCheck={false}
									value={route.body}
									disabled={disabled}
									onChange={(e) =>
										update({
											body: e.target.value,
										})
									}
								/>
							</div>
						)}
					</div>
				)}

				{/* ── Headers tab ── */}
				{activeTab === "Headers" && (
					<div className="ms-form-section" style={{ marginTop: 12 }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								marginBottom: 6,
							}}
						>
							<span className="ms-section-title" style={{ marginBottom: 0 }}>
								Response Headers
							</span>
							{!disabled && (
								<button className="ms-btn ms-btn-secondary" onClick={addHeader}>
									＋ Add
								</button>
							)}
						</div>
						<table className="ms-header-table">
							<thead>
								<tr>
									<th style={{ width: "45%" }}>Key</th>
									<th>Value</th>
									{!disabled && <th style={{ width: 28 }}></th>}
								</tr>
							</thead>
							<tbody>
								{route.headers.length === 0 && (
									<tr>
										<td
											colSpan={disabled ? 2 : 3}
											style={{
												padding: "10px 6px",
												color: "var(--vscode-descriptionForeground)",
												fontSize: 12,
											}}
										>
											No headers defined.
										</td>
									</tr>
								)}
								{route.headers.map((h, i) => (
									<tr key={i}>
										<td>
											<input
												className="ms-header-input"
												value={h.key}
												placeholder="Content-Type"
												disabled={disabled}
												onChange={(e) => setHeader(i, "key", e.target.value)}
											/>
										</td>
										<td>
											<input
												className="ms-header-input"
												value={h.value}
												placeholder="application/json"
												disabled={disabled}
												onChange={(e) => setHeader(i, "value", e.target.value)}
											/>
										</td>
										{!disabled && (
											<td>
												<button
													className="ms-header-del"
													onClick={() => deleteHeader(i)}
													title="Remove header"
												>
													✕
												</button>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				{activeTab === "Request Match" && (
					<div
						className="ms-form-section"
						style={{ marginTop: 12 }}
					>
						<div className="ms-form-row">
							<span className="ms-field-label">
								Enable Body Match
							</span>
							<label className="ms-toggle">
								<input
									type="checkbox"
									checked={route.bodyMatcher.enabled}
									disabled={disabled}
									onChange={(e) =>
										update({
											bodyMatcher: {
												...route.bodyMatcher,
												enabled: e.target.checked,
											},
										})
									}
								/>
								<span className="ms-toggle-slider" />
							</label>
						</div>
						<div className="ms-form-row">
							<span className="ms-field-label">
								Match Type
							</span>
							<select
								className="ms-select"
								value={route.bodyMatcher.matchType}
								disabled={
									disabled ||
									!route.bodyMatcher.enabled
								}
								onChange={(e) =>
									update({
										bodyMatcher: {
											...route.bodyMatcher,
											matchType:
												e.target.value as MockBodyMatchType,
										},
									})
								}
							>
								{BODY_MATCH_TYPES.map(type => (
									<option
										key={type.value}
										value={type.value}
									>
										{type.label}
									</option>
								))}
							</select>
						</div>

						{route.bodyMatcher.enabled && (

							<div
								className="ms-help-text"
								style={{
									marginTop: 6,
									marginBottom: 10,
									fontSize: 12,
									opacity: 0.75,
								}}
							>
								{route.bodyMatcher.matchType === "exact" && "Entire request body must exactly match."}
								{route.bodyMatcher.matchType === "contains" && "Request body must contain the specified text."}
								{route.bodyMatcher.matchType === "json" && "Only the specified JSON properties are compared."}
							</div>
						)}
						<div className="ms-form-section">
							<div className="ms-section-title">
								Body Match Pattern
							</div>
							<textarea
								className="ms-body-editor"
								rows={8}
								spellCheck={false}
								disabled={
									disabled ||
									!route.bodyMatcher.enabled ||
									route.bodyMatcher.matchType === "none"
								}
								value={route.bodyMatcher.value}
								onChange={(e) =>
									update({
										bodyMatcher: {
											...route.bodyMatcher,
											value: e.target.value,
										},
									})
								}
							/>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default RouteDetail;
