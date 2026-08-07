import React from "react";
import { IMockRoute } from "../../../fetch-client-core/types/mockServer.types";

interface RouteListProps {
	routes: IMockRoute[];
	selectedRouteId: string | null;
	serverRunning: boolean;
	onSelect: (id: string) => void;
	onAdd: () => void;
	onDelete: (id: string) => void;
}

const METHOD_CLASSES: Record<string, string> = {
	GET: "ms-method-GET",
	POST: "ms-method-POST",
	PUT: "ms-method-PUT",
	PATCH: "ms-method-PATCH",
	DELETE: "ms-method-DELETE",
	OPTIONS: "ms-method-OPTIONS",
	HEAD: "ms-method-HEAD",
	"*": "ms-method-star",
};

const RouteList: React.FC<RouteListProps> = ({
	routes,
	selectedRouteId,
	serverRunning,
	onSelect,
	onAdd,
	onDelete,
}) => {
	return (
		<div className="ms-route-list">
			<div className="ms-route-list-header">
				<span>Routes ({routes.length})</span>
				<button
					className="ms-btn ms-btn-icon"
					title="Add route"
					onClick={onAdd}
					disabled={serverRunning}
				>
					＋
				</button>
			</div>

			<div className="ms-route-list-body">
				{routes.length === 0 ? (
					<div className="ms-route-list-empty">
						No routes yet.
						<br />
						Click ＋ to add one.
					</div>
				) : (
					routes.map((route) => (
						<div
							key={route.id}
							className={[
								"ms-route-item",
								route.id === selectedRouteId ? "selected" : "",
								!route.isEnabled ? "disabled-route" : "",
							]
								.filter(Boolean)
								.join(" ")}
							onClick={() => onSelect(route.id)}
							title={`${route.method} ${route.path}`}
						>
							<span
								className={`ms-method-badge ${METHOD_CLASSES[route.method] ?? "ms-method-star"}`}
							>
								{route.method === "*" ? "ANY" : route.method}
							</span>
							<span className="ms-route-path">{route.path}</span>
							{!serverRunning && (
								<button
									className="ms-btn ms-btn-icon ms-header-del"
									title="Delete route"
									onClick={(e) => {
										e.stopPropagation();
										onDelete(route.id);
									}}
									style={{ fontSize: 12, padding: "1px 4px" }}
								>
									✕
								</button>
							)}
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default RouteList;
