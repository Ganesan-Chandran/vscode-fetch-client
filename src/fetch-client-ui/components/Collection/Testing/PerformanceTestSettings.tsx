import React from "react";
import "../style.css";
import { IPerfConfig, LoadModel, TestScope } from "../../../../fetch-client-core/types/perfTest.types";

interface IProps {
	config: IPerfConfig;
	disabled: boolean; // lock config once a run has started
	onChange: (patch: Partial<IPerfConfig>) => void;
}

const MAX_VUS = 50;
const MAX_ITERATIONS = 1000;
const MAX_DURATION_SEC = 3600;
const MAX_DELAY_MS = 300000;

export const PerformanceTestSettings = ({
	config,
	disabled,
	onChange,
}: IProps) => {
	function clamp(value: number, min: number, max: number) {
		if (isNaN(value)) {
			return min;
		}
		return Math.min(Math.max(value, min), max);
	}

	function onScopeChange(scope: TestScope) {
		onChange({ scope });
	}

	function onLoadModelChange(loadModel: LoadModel) {
		onChange({ loadModel });
	}

	return (
		<div className="perf-settings-panel">
			<div className="perf-settings-section">
				<div className="perf-settings-option">
					<label className="perf-settings-title">Scope</label>
					<input
						type="radio"
						disabled={disabled}
						checked={config.scope === "single"}
						onChange={() => onScopeChange("single")}
					/>{" "}
					<span>Single Request</span>
					<input
						type="radio"
						className="settings-option"
						disabled={disabled}
						checked={config.scope === "collection"}
						onChange={() => onScopeChange("collection")}
					/>{" "}
					<span>Whole Collection / Folder</span>
				</div>
			</div>

			<div className="perf-settings-section">
				<div className="perf-settings-option perf-settings-option-wrap">
					<label className="perf-settings-title">Load Model</label>
					<input
						type="radio"
						disabled={disabled}
						checked={config.loadModel === "fixed"}
						onChange={() => onLoadModelChange("fixed")}
					/>{" "}
					<span>Fixed Iterations</span>
					<input
						type="radio"
						className="settings-option"
						disabled={disabled}
						checked={config.loadModel === "duration"}
						onChange={() => onLoadModelChange("duration")}
					/>{" "}
					<span>Duration</span>
					<input
						type="radio"
						className="settings-option"
						disabled={disabled}
						checked={config.loadModel === "rampup"}
						onChange={() => onLoadModelChange("rampup")}
					/>{" "}
					<span>Ramp-up</span>
					<input
						type="radio"
						className="settings-option"
						disabled={disabled}
						checked={config.loadModel === "combined"}
						onChange={() => onLoadModelChange("combined")}
					/>{" "}
					<span>Ramp-up + Duration</span>
				</div>
			</div>

			<div className="perf-settings-delay-panel">
				<label className="perf-settings-label">
					{config.loadModel === "rampup" || config.loadModel === "combined"
						? "Target Virtual Users"
						: "Virtual Users"}
				</label>
				<input
					type="text"
					className="activity-search perf-delay-text"
					disabled={disabled}
					value={config.targetVUs}
					pattern="[1-9]\d*"
					onChange={(e) => {
						if (e.target.validity.valid) {
							onChange({ targetVUs: Number(e.target.value) });
						}
					}}
					onBlur={(e) =>
						onChange({
							targetVUs: clamp(Number(e.target.value) || 1, 1, MAX_VUS),
						})
					}
				/>
				<label
					className="perf-settings-info-label"
					title={`Maximum value: ${MAX_VUS}`}
				>
					ⓘ
				</label>
			</div>

			{config.loadModel === "fixed" && (
				<div className="perf-settings-delay-panel">
					<label className="perf-settings-label">
						Iterations per Virtual User
					</label>
					<input
						type="text"
						className="activity-search perf-delay-text"
						disabled={disabled}
						value={config.iterations}
						pattern="[1-9]\d*"
						onChange={(e) => {
							if (e.target.validity.valid) {
								onChange({ iterations: Number(e.target.value) });
							}
						}}
						onBlur={(e) =>
							onChange({
								iterations: clamp(
									Number(e.target.value) || 1,
									1,
									MAX_ITERATIONS,
								),
							})
						}
					/>
					<label
						className="perf-settings-info-label"
						title={`Maximum value: ${MAX_ITERATIONS}`}
					>
						ⓘ
					</label>
				</div>
			)}

			{(config.loadModel === "duration" || config.loadModel === "combined") && (
				<div className="perf-settings-delay-panel">
					<label className="perf-settings-label">
						{config.loadModel === "combined"
							? "Hold Duration after ramp-up (sec)"
							: "Test Duration (sec)"}
					</label>
					<input
						type="text"
						className="activity-search perf-delay-text"
						disabled={disabled}
						value={config.testDurationSec}
						pattern="[1-9]\d*"
						onChange={(e) => {
							if (e.target.validity.valid) {
								onChange({ testDurationSec: Number(e.target.value) });
							}
						}}
						onBlur={(e) =>
							onChange({
								testDurationSec: clamp(
									Number(e.target.value) || 1,
									1,
									MAX_DURATION_SEC,
								),
							})
						}
					/>
					<label
						className="perf-settings-info-label"
						title={`Maximum value: ${MAX_DURATION_SEC}`}
					>
						ⓘ
					</label>
				</div>
			)}

			{(config.loadModel === "rampup" || config.loadModel === "combined") && (
				<>
					<div className="perf-settings-delay-panel">
						<label className="perf-settings-label">
							Ramp-up Duration (sec)
						</label>
						<input
							type="text"
							className="activity-search perf-delay-text"
							disabled={disabled}
							value={config.rampUpDurationSec}
							pattern="[1-9]\d*"
							onChange={(e) => {
								if (e.target.validity.valid) {
									onChange({ rampUpDurationSec: Number(e.target.value) });
								}
							}}
							onBlur={(e) =>
								onChange({
									rampUpDurationSec: clamp(
										Number(e.target.value) || 1,
										1,
										MAX_DURATION_SEC,
									),
								})
							}
						/>
						<label
							className="perf-settings-info-label"
							title={`Maximum value: ${MAX_DURATION_SEC}`}
						>
							ⓘ
						</label>
					</div>
					<div className="perf-settings-delay-panel">
						<label className="perf-settings-label">Ramp-up Steps</label>
						<input
							type="text"
							className="activity-search perf-delay-text"
							disabled={disabled}
							value={config.rampSteps}
							pattern="[1-9]\d*"
							onChange={(e) => {
								if (e.target.validity.valid) {
									onChange({ rampSteps: Number(e.target.value) });
								}
							}}
							onBlur={(e) =>
								onChange({
									rampSteps: clamp(
										Number(e.target.value) || 1,
										1,
										config.targetVUs,
									),
								})
							}
						/>
						<label
							className="perf-settings-info-label"
							title="Cannot exceed target Virtual Users"
						>
							ⓘ
						</label>
					</div>
				</>
			)}

			<div className="perf-settings-delay-panel">
				<label className="perf-settings-label">Delay between waves (ms)</label>
				<input
					type="text"
					className="activity-search perf-delay-text"
					disabled={disabled}
					value={config.thinkTimeMs}
					pattern="[0-9]*"
					onChange={(e) => {
						if (e.target.validity.valid) {
							onChange({ thinkTimeMs: Number(e.target.value) });
						}
					}}
					onBlur={(e) =>
						onChange({
							thinkTimeMs: clamp(Number(e.target.value) || 0, 0, MAX_DELAY_MS),
						})
					}
				/>
				<label
					className="perf-settings-info-label"
					title={`Maximum value: ${MAX_DELAY_MS}. Think-time / pacing between concurrent waves.`}
				>
					ⓘ
				</label>
			</div>

			{config.loadModel === "rampup" && (
				<div className="perf-settings-delay-panel">
					<label className="max-req">
						* Ramp-up alone stops as soon as target Virtual Users is reached.
						Use "Ramp-up + Duration" to sustain load afterwards.
					</label>
				</div>
			)}
		</div>
	);
};
