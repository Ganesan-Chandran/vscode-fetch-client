import "./style.css";
import React, { useEffect, useState } from "react";

export interface ValueEditorModalProps {
	show: boolean;
	title?: string;
	value: string;
	onSave: (value: string) => void;
	onCancel: () => void;
}

export const ValueEditorModal = (props: ValueEditorModalProps) => {
	const { show, title, value, onSave, onCancel } = props;
	const [draft, setDraft] = useState(value);

	// Re-sync the draft whenever the modal is (re)opened with a new value
	useEffect(() => {
		if (show) {
			setDraft(value);
		}
	}, [show, value]);

	if (!show) {
		return <></>;
	}

	function onKeyDown(event: React.KeyboardEvent) {
		if (event.key === "Escape") {
			onCancel();
		}
	}

	function onBackdropClick(event: React.MouseEvent) {
		if (event.target === event.currentTarget) {
			onCancel();
		}
	}

	return (
		<div
			className="value-editor-backdrop"
			onMouseDown={onBackdropClick}
			onKeyDown={onKeyDown}
		>
			<div className="value-editor-dialog">
				<div className="value-editor-header">
					<span>{title ?? "Edit Value"}</span>
					<button
						className="value-editor-close"
						onClick={onCancel}
						aria-label="Close"
					>
						×
					</button>
				</div>
				<textarea
					className="value-editor-textarea"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					spellCheck={false}
					autoFocus
				/>
				<div className="value-editor-footer">
					<button className="value-editor-btn" onClick={onCancel}>
						Cancel
					</button>
					<button
						className="value-editor-btn primary"
						onClick={() => onSave(draft)}
					>
						Save
					</button>
				</div>
			</div>
		</div>
	);
};
