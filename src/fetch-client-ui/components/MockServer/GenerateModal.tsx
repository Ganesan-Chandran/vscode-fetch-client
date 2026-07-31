import React, { useState } from "react";
import { ICollections } from "../../../fetch-client-core/types/sidebar.types";
import { generateMockFromCollection } from "../../../fetch-client-core/helpers/mockGeneratorHelper";
import { IMockRoute } from "../../../fetch-client-core/types/mockServer.types";
import vscode from "../Common/vscodeAPI";
import {
	requestTypes,
	responseTypes,
} from "../../../fetch-client-core/consts/requestTypes.consts";

type GenerateMode = "collection" | "openapi";
type OpenAPISource = "url" | "file";

interface GenerateModalProps {
	collections: ICollections[];
	onGenerated: (routes: IMockRoute[]) => void;
	onClose: () => void;
}

const GenerateModal: React.FC<GenerateModalProps> = ({
	collections,
	onGenerated,
	onClose,
}) => {
	const [mode, setMode] = useState<GenerateMode>("collection");
	const [selectedColId, setSelectedColId] = useState(
		collections.length > 0 ? collections[0].id : "",
	);
	const [openapiSource, _setOpenapiSource] = useState<OpenAPISource>("file");
	const [openapiValue, setOpenapiValue] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	function handleGenerate() {
		setError("");

		if (mode === "collection") {
			const col = collections.find((c) => c.id === selectedColId);
			if (!col) {
				setError("Please select a collection.");
				return;
			}
			const routes = generateMockFromCollection(col);
			onGenerated(routes);
			return;
		}

		// OpenAPI - delegate to extension host
		if (!openapiValue.trim()) {
			setError("Please enter a URL or file path.");
			return;
		}
		setLoading(true);
		vscode.postMessage({
			type: requestTypes.generateMockFromOpenAPIRequest,
			data: { source: openapiSource, value: openapiValue.trim() },
		});
	}

	// Listen for the generated routes response (OpenAPI path)
	React.useEffect(() => {
		const handler = (event: MessageEvent) => {
			if (event.data?.type === responseTypes.getMockServerByIdResponse) {
				const routes = event.data?.data?.generatedRoutes as
					| IMockRoute[]
					| undefined;
				if (routes) {
					setLoading(false);
					onGenerated(routes);
				}
			}
		};
		window.addEventListener("message", handler);
		return () => window.removeEventListener("message", handler);
	}, [onGenerated]);

	return (
		<div className="ms-modal-overlay" onClick={onClose}>
			<div className="ms-modal" onClick={(e) => e.stopPropagation()}>
				<div className="ms-modal-title">Generate Routes</div>

				{/* Mode selector */}
				<div className="ms-radio-group">
					<label className="ms-radio-label">
						<input
							type="radio"
							checked={mode === "collection"}
							onChange={() => setMode("collection")}
						/>
						From Collection
					</label>
					<label className="ms-radio-label">
						<input
							type="radio"
							checked={mode === "openapi"}
							onChange={() => setMode("openapi")}
						/>
						From OpenAPI / Swagger
					</label>
				</div>

				{/* ── Collection mode ── */}
				{mode === "collection" && (
					<div>
						<label className="ms-field-label">Select Collection</label>
						<div style={{ marginTop: 6 }}>
							{collections.length === 0 ? (
								<span
									style={{
										fontSize: 12,
										color: "var(--description-text-color)",
									}}
								>
									No collections found.
								</span>
							) : (
								<select
									className="ms-select full-width"
									value={selectedColId}
									onChange={(e) => setSelectedColId(e.target.value)}
								>
									{collections.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							)}
						</div>
						<p className="ms-modal-note">
							Routes will be created from every request in the collection. Paths
							and methods are auto-detected; responses default to 200 JSON.
						</p>
					</div>
				)}

				{/* ── OpenAPI mode ── */}
				{mode === "openapi" && (
					<div>
						{/* <div className="ms-radio-group">
							<label className="ms-radio-label">
								<input
									type="radio"
									checked={openapiSource === "url"}
									onChange={() => setOpenapiSource("url")}
								/>
								URL
							</label>
							<label className="ms-radio-label">
								<input
									type="radio"
									checked={openapiSource === "file"}
									onChange={() => setOpenapiSource("file")}
								/>
								Local file path
							</label>
						</div> */}
						<input
							className="ms-url-input"
							value={openapiValue}
							onChange={(e) => setOpenapiValue(e.target.value)}
							placeholder={
								openapiSource === "url"
									? "https://petstore.swagger.io/v2/swagger.json"
									: "C:\\path\\to\\openapi.yaml"
							}
							spellCheck={false}
						/>
						<p className="ms-modal-note">
							Supports OpenAPI v3 JSON or YAML. Routes are auto-generated from
							all paths and operations with example responses.
						</p>
					</div>
				)}

				{error && <div className="ms-modal-error">{error}</div>}

				<div className="ms-modal-footer">
					<button className="ms-btn ms-btn-secondary" onClick={onClose}>
						Cancel
					</button>
					<button
						className="ms-btn ms-btn-primary"
						onClick={handleGenerate}
						disabled={loading}
					>
						{loading ? "Generating…" : "Generate"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default GenerateModal;
