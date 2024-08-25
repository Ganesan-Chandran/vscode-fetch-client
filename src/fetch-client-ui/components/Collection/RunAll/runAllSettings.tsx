import React from "react";
import "../style.css";

export const RunAllSettings = (props: any) => {

	const { selectedOption, iteration, iterationDelay, delay } = props;
	const { setSelectedOption, setIterationValue, setIterationDelayValue, setDelayValue, setIterationValueBlur, setDelayValueBlur, setIterationDelayValueBlur } = props;

	return (
		<>
			<div className="runall-settings-option">
				<input type="radio"
					checked={selectedOption === 1 ? true : false}
					onChange={() => setSelectedOption(1)}
				/> <span>Sequential Run</span>
				<input type="radio"
					className="settings-option"
					checked={selectedOption === 2 ? true : false}
					onChange={() => setSelectedOption(2)}
				/> <span>Parallel Run</span>
			</div>
			<div className="runall-settings-delay-panel">
				<label className="runall-settings-label">Iterations</label>
				<input type="text"
					className="activity-search runall-delay-text"
					value={iteration}
					pattern="[1-9]\d*"
					onChange={setIterationValue}
					onBlur={setIterationValueBlur}
				/>
				<label className="runall-settings-info-label" title="max value is 10">ⓘ</label>
			</div>
			<div className="runall-settings-delay-panel">
				<label className="runall-settings-label">Delay between iteration (ms)</label>
				<input type="text"
					className="activity-search runall-delay-text"
					value={iterationDelay}
					pattern="[0-9]*"
					onChange={setIterationDelayValue}
					onBlur={setIterationDelayValueBlur}
					disabled={iteration < 2} />
				<label className="runall-settings-info-label" title="max value is 300000">ⓘ</label>
			</div>
			{selectedOption !== 2 && <div className="runall-settings-delay-panel">
				<label className="runall-settings-label">Delay between request (ms)</label>
				<input type="text"
					className="activity-search runall-delay-text"
					value={delay}
					pattern="[0-9]*"
					onChange={setDelayValue}
					onBlur={setDelayValueBlur}
				/>
				<label className="runall-settings-info-label" title="max value is 300000">ⓘ</label>
			</div>}
			{selectedOption === 2 && <div className="runall-settings-delay-panel"><label className="max-req">* Collection/Folder PreRequest will not be run with this option."</label></div>}
		</>
	);
};
