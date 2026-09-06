import React, { useMemo, useState } from "react";
import { withPanelLayout } from "./withPanelLayout";

export const RegexTester = withPanelLayout(() => {
	const [pattern, setPattern] = useState("\\b[A-Z][a-z]+\\b");
	const [flags, setFlags] = useState("g");
	const [input, setInput] = useState("This is Fetch Client Extension.");
	const [error, setError] = useState("");

	const result = useMemo(() => {
		try {
			setError("");
			const regex = new RegExp(pattern, flags);
			return [...input.matchAll(regex)].map((match) => ({
				value: match[0],
				index: match.index,
				groups: match.groups,
			}));
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			return [];
		}
	}, [pattern, flags, input]);

	return (
		<div className="dev-tool">
			<input
				value={pattern}
				onChange={(e) => setPattern(e.target.value)}
				placeholder="Regex"
			/>
			<input
				value={flags}
				onChange={(e) => setFlags(e.target.value)}
				placeholder="Flags"
			/>
			<textarea value={input} onChange={(e) => setInput(e.target.value)} />
			<div className="dev-tool-message">
				{error && (
					<div className="reorder-status reorder-status--error">{error}</div>
				)}
			</div>
			<pre className="dev-tool-output">{JSON.stringify(result, null, 2)}</pre>
		</div>
	);
}, "🧪 Regex Tester");
