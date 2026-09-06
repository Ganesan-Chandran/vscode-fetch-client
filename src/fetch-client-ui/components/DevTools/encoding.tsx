import React, { useMemo, useState } from "react";
import { copyText, decodeBase64Url } from "./utils";
import { withPanelLayout } from "./withPanelLayout";

const Encoder = ({ mode }: { mode: "url" | "base64" | "html" }) => {
	const [input, setInput] = useState("");
	const [output, setOutput] = useState("");
	const [error, setError] = useState("");

	const run = (action: "encode" | "decode") => {
		try {
			setError("");

			if (mode === "url") {
				setOutput(
					action === "encode"
						? encodeURIComponent(input)
						: decodeURIComponent(input),
				);
			} else if (mode === "base64") {
				setOutput(
					action === "encode"
						? btoa(unescape(encodeURIComponent(input)))
						: decodeURIComponent(escape(atob(input))),
				);
			} else {
				const textarea = document.createElement("textarea");
				textarea.innerHTML = input;
				if (action === "encode") {
					const div = document.createElement("div");
					div.textContent = input;
					setOutput(div.innerHTML);
				} else {
					setOutput(textarea.value);
				}
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		}
	};

	return (
		<div className="dev-tool">
			<div className="dev-tool-grid">
				<div className="dev-tool-column">
					<span className="dev-tool-label">Input</span>
					<textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Enter value..."
					/>
					<div className="dev-tool-message">
						{error && <div className="dev-tool-error">{}</div>}
					</div>
				</div>
				<div className="dev-tool-column">
					<span className="dev-tool-label">Output</span>
					<textarea value={output} readOnly />
					<div className="dev-tool-message">
						{error && (
							<div className="reorder-status reorder-status--error">
								{error}
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="dev-tool-actions">
				<button type="button" onClick={() => run("encode")}>
					Encode
				</button>
				<button type="button" onClick={() => run("decode")}>
					Decode
				</button>
				<button type="button" onClick={() => copyText(output)}>
					Copy
				</button>
				<button
					type="button"
					onClick={() => {
						setInput("");
						setOutput("");
						setError("");
					}}
				>
					Clear
				</button>
			</div>
		</div>
	);
};

export const UrlEncoder = withPanelLayout(
	() => <Encoder mode="url" />,
	"🔗 URL Encoder / Decoder",
);

export const Base64Encoder = withPanelLayout(
	() => <Encoder mode="base64" />,
	"🔢 Base64 Encoder / Decoder",
);

export const JwtDecoder = withPanelLayout(() => {
	const [token, setToken] = useState("");
	const [result, setResult] = useState("");
	const [error, setError] = useState("");

	const decode = () => {
		try {
			setError("");
			const parts = token.trim().split(".");
			if (parts.length !== 3) {
				throw new Error("JWT must contain header.payload.signature");
			}

			const header = JSON.parse(decodeBase64Url(parts[0]));
			const payload = JSON.parse(decodeBase64Url(parts[1]));

			setResult(
				JSON.stringify(
					{
						header,
						payload,
						signature: parts[2],
					},
					null,
					2,
				),
			);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setResult("");
		}
	};

	const payload = useMemo(() => {
		try {
			const parts = token.trim().split(".");
			return parts.length === 3 ? JSON.parse(decodeBase64Url(parts[1])) : null;
		} catch {
			return null;
		}
	}, [token]);

	return (
		<div className="dev-tool">
			<span className="dev-tool-label">JWT</span>
			<textarea
				value={token}
				onChange={(e) => setToken(e.target.value)}
				placeholder="eyJhbGciOi..."
			/>
			<div className="dev-tool-actions">
				<button type="button" onClick={decode}>
					Decode
				</button>
				<button type="button" onClick={() => copyText(result)}>
					Copy
				</button>
			</div>
			{payload?.exp && (
				<div className="dev-tool-output">
					Expiration: {new Date(payload.exp * 1000).toISOString()}
				</div>
			)}
			<div className="dev-tool-message">
				{error && (
					<div className="reorder-status reorder-status--error">{error}</div>
				)}
			</div>
			<pre className="dev-tool-output">{result}</pre>
		</div>
	);
}, "🎫 JWT Decoder");
