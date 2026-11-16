import "./style.css";
import { AceEditor } from "../Editor";
import {
	AIPromptKind,
	AIPromptOptions,
	buildAIPrompt,
} from "../../../../fetch-client-core/helpers/aiPrompt.helper";
import { IRootState } from "../../../reducer/combineReducer";
import { useSelector } from "react-redux";
import React, { useMemo, useState } from "react";

const AIPromptGenerator = () => {
	const { method, url, params, headers, auth, body } = useSelector(
		(state: IRootState) => state.requestData,
	);
	const { response, headers: resHeaders } = useSelector(
		(state: IRootState) => state.responseData,
	);

	const [kind, setKind] = useState<AIPromptKind>("testcase");
	const [notes, setNotes] = useState("");

	const prompt = useMemo(
		() =>
			buildAIPrompt(
				kind,
				{ method, url, params, headers, authType: auth?.authType, body },
				{
					status: response.status,
					statusText: response.statusText,
					duration: response.duration,
					headers: resHeaders,
					body: response.responseData,
				},
				notes,
			),
		[
			kind,
			notes,
			method,
			url,
			params,
			headers,
			auth,
			body,
			response,
			resHeaders,
		],
	);

	return (
		<div className="ai-prompt-panel">
			<hr />
			<div className="ai-prompt-notice">
				⚠️ This is a beta feature. The prompt is built from your request and
				response; known sensitive values (tokens, passwords, API keys, cookies)
				are masked, but masking is not guaranteed. Review the prompt and remove
				any confidential data before pasting it into an AI tool. AI output can
				be inaccurate, so verify generated test cases before relying on them.
			</div>
			<div className="ai-prompt-select-panel">
				<div className="ai-prompt-field">
					<label className="ai-prompt-label">Action</label>
					<select
						className="ai-prompt-select"
						value={kind}
						onChange={(e) => setKind(e.target.value as AIPromptKind)}
					>
						{AIPromptOptions.map((opt) => (
							<option key={opt.value} value={opt.value}>
								{opt.name}
							</option>
						))}
					</select>
				</div>
				<div className="ai-prompt-field ai-prompt-field-grow">
					<label className="ai-prompt-label">Instructions</label>
					<input
						type="text"
						className="ai-prompt-notes"
						placeholder="Optional"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
					/>
				</div>
			</div>
			<div className="ai-prompt-editor">
				<AceEditor
					value={prompt}
					language="text"
					readOnly={true}
					copyButtonVisible={true}
					format={false}
				/>
			</div>
		</div>
	);
};

export default AIPromptGenerator;
