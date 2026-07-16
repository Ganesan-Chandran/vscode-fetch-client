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
	onStopOnRowFailureChange: (v: boolean) => void;
	onBrowseFile: () => void;
}

export const DataDrivenTestSettings: React.FC<IProps> = ({
	fileFormat,
	csvSeparator,
	stopOnRowFailure,
	parseResult,
	fileName,
	fileLoadError,
	disabled,
	onFileFormatChange,
	onSeparatorChange,
	onStopOnRowFailureChange,
	onBrowseFile,
}) => {
	return (
		<div className="dd-settings-panel">
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

			<div className="dd-settings-section">
				<div className="perf-settings-delay-panel">
					<label className="perf-settings-title">File</label>
					<button
						className="submit-button dd-browse-btn"
						disabled={disabled}
						onClick={onBrowseFile}
					>
						Browse
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
			{parseResult && !parseResult.error && parseResult.columns.length > 0 && (
				<div className="dd-columns-preview">
					<span className="dd-columns-label">Columns: </span>
					{parseResult.columns.map((col) => (
						<code key={col} className="dd-col-chip">{col}</code>
					))}
				</div>
			)}
			</div>

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
