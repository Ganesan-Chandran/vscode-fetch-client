import React from "react";
import { copyText } from "./utils";

export function ToolActions({
    value,
    label = "Copy",
}: {
    value: string;
    label?: string;
}) {
    return (
        <div className="dev-tool-actions">
            <button type="button" onClick={() => copyText(value)} disabled={!value}>
                {label}
            </button>
        </div>
    );
}

export function downloadText(
    filename: string,
    content: string,
    mime = "text/plain",
): void {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
