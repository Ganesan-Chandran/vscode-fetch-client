import React from "react";
import "../style.css";
import "./style.css";
import {
	DataFileFormat,
	CsvSeparator,
	IDataParseResult,
} from "../../../../fetch-client-core/utils/dataDrivenTestService/dataDriven.types";

interface IProps {
	fileFormat: DataFileFormat;
	csvSeparator: CsvSeparator;
	maxRows: number;
	stopOnRowFailure: boolean;
	parseResult: IDataParseResult | null;
	fileName: string;
	fileLoadError: string;
	disabled: boolean;
	onFileFormatChange: (f: DataFileFormat) => void;
	onSeparatorChange: (s: CsvSeparator) => void;
	onMaxRowsChange: (v: number) => void;
	onStopOnRowFailureChange: (v: boolean) => void;
	onBrowseFile: () => void;
}

const MAX_ROWS_LIMIT = 100;

export const DataDrivenTestSettings: React.FC<IProps> = ({
	fileFormat,
	csvSeparator,
	maxRows,
	stopOnRowFailure,
	parseResult,
	fileName,
	fileLoadError,
	disabled,
	onFileFormatChange,
	onSeparatorChange,
	onMaxRowsChange,
	onStopOnRowFailureChange,
	onBrowseFile,
}) => {
	return (
		<div className="dd-settings-panel">
			{/* File format */}
			<div className="dd-settings-section">
				<div className="perf-settings-option">
					<label className="perf-settings-title">File Format</label>
					<input
						type="radio"
						disabled={disabled}
						checked={fileFormat === "csv"}
						onChange={() => onFileFormatChange("csv")}
					/>{" "}
					<span>CSV</span>
					<input
						type="radio"
						className="settings-option"
						disabled={disabled}
						checked={fileFormat === "json"}
						onChange={() => onFileFormatChange("json")}
					/>{" "}
					<span>JSON</span>
				</div>
			</div>

			{/* CSV separator (only for CSV) */}
			{fileFormat === "csv" && (
				<div className="dd-settings-section">
					<div className="perf-settings-option">
						<label className="perf-settings-title">CSV Separator</label>
						<input
							type="radio"
							disabled={disabled}
							checked={csvSeparator === ","}
							onChange={() => onSeparatorChange(",")}
						/>{" "}
						<span>Comma ( , )</span>
						<input
							type="radio"
							className="settings-option"
							disabled={disabled}
							checked={csvSeparator === ";"}
							onChange={() => onSeparatorChange(";")}
						/>{" "}
						<span>Semicolon ( ; )</span>
						<input
							type="radio"
							className="settings-option"
							disabled={disabled}
							checked={csvSeparator === "\t"}
							onChange={() => onSeparatorChange("\t")}
						/>{" "}
						<span>Tab</span>
					</div>
				</div>
			)}

			{/* File picker */}
			<div className="dd-settings-section">
				<div className="perf-settings-delay-panel">
					<button
						className="submit-button dd-browse-btn"
						disabled={disabled}
						onClick={onBrowseFile}
					>
						Browse File
					</button>
					{fileName && (
						<span className="dd-file-name" title={fileName}>
							{fileName.split(/[\\/]/).pop()}
						</span>
					)}
					{parseResult && !parseResult.error && (
						<span className="dd-row-count dd-status-ok">
							✓ {parseResult.rowCount} row{parseResult.rowCount !== 1 ? "s" : ""} loaded
						</span>
					)}
{/* FIX #6: file load error from extension host */}
				{fileLoadError && (
					<span className="dd-row-count dd-status-error">
						✗ {fileLoadError}
					</span>
				)}
				{parseResult?.error && (
					<span className="dd-row-count dd-status-error">
						✗ {parseResult.error}
					</span>
				)}
			</div>
			{/* FIX #3: Show detected column names so users can match {{variable}} names */}
			{parseResult && !parseResult.error && parseResult.columns.length > 0 && (
				<div className="dd-columns-preview">
					<span className="dd-columns-label">Columns: </span>
					{parseResult.columns.map((col) => (
						<code key={col} className="dd-col-chip">{col}</code>
					))}
				</div>
			)}
			</div>

			{/* Max rows */}
			<div className="perf-settings-delay-panel">
				<label className="perf-settings-label">Max Rows</label>
				<input
					type="text"
					className="activity-search perf-delay-text"
					disabled={disabled}
					value={maxRows}
					pattern="[1-9]\d*"
					onChange={(e) => {
						const v = parseInt(e.target.value, 10);
						if (!isNaN(v) && v > 0) {
							onMaxRowsChange(Math.min(v, MAX_ROWS_LIMIT));
						}
					}}
					onBlur={(e) => {
						const v = parseInt(e.target.value, 10);
						onMaxRowsChange(isNaN(v) || v < 1 ? 1 : Math.min(v, MAX_ROWS_LIMIT));
					}}
				/>
				<label
					className="perf-settings-info-label"
					title={`Maximum value: ${MAX_ROWS_LIMIT}`}
				>
					ⓘ
				</label>
			</div>

			{/* Stop on failure */}
			<div className="perf-settings-delay-panel">
				<input
					type="checkbox"
					disabled={disabled}
					checked={stopOnRowFailure}
					onChange={(e) => onStopOnRowFailureChange(e.target.checked)}
				/>
				<label>Stop run on row failure</label>
			</div>
		</div>
	);
};
