import "./style.css";
import {
	curlResponseOptions,
	responseOptions,
} from "../../../../../fetch-client-core/consts/response.consts";
import { FormatBytes } from "../../../../../fetch-client-core/helpers/common.helper";
import { getColFolDotMenu } from "../../../Common/icons";
import { GetResponseTime } from "../../../../../fetch-client-core/helpers/dateTime.helper";
import { IRootState } from "../../../../reducer/combineReducer";
import { ReactComponent as CodeLogo } from "../../../../../../icons/code.svg";
import { requestTypes } from "../../../../../fetch-client-core/consts/requestTypes.consts";
import { useSelector } from "react-redux";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import vscode from "../../../Common/vscodeAPI";

const MORE_BUTTON_WIDTH = 36;

function formatDuration(ms: number): string {
	if (ms <= 0) {
		return "0 ms";
	}
	if (ms < 1) {
		return "<1 ms";
	}
	return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
}

export const ResponseOptionsTab = (props: any) => {
	const { selectedTab, setSelectedTab, isVerticalLayout } = props;

	const { headers, response, testResults, cookies, preFetchResponse } =
		useSelector((state: IRootState) => state.responseData);
	const preFetchCount = preFetchResponse?.filter((i) => i.reqId)?.length ?? 0;
	const testCount = testResults?.length ?? 0;
	const { url } = useSelector((state: IRootState) => state.requestData);

	const [menuShow, setMenuShow] = useState(false);
	const [codeMenuShow, setCodeMenuShow] = useState(false);
	const [moreShow, setMoreShow] = useState(false);
	const [visibleCount, setVisibleCount] = useState(Number.MAX_SAFE_INTEGER);

	const wrapperRef = useRef(null);
	const codeWrapperRef = useRef(null);
	const moreWrapperRef = useRef<HTMLDivElement>(null);
	const tabsRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);

	function getClassName(status: number): string {
		if (response.isError) {
			return "response-params error-text";
		}

		if (status <= 399) {
			return "response-params";
		}

		return "response-params error-text";
	}

	function renderTimeInfo() {
		const pre = response.preRequestDuration ?? 0;
		const api = response.duration ?? 0;
		const post = response.postFetchDuration ?? 0;
		const rows: [string, number][] = [
			["Pre-fetch", pre],
			["API request", api],
			["Post-fetch (tests & set variables)", post],
		];

		return (
			<span className="time-info" tabIndex={0} aria-label="Time breakdown">
				ⓘ
				<span
					role="tooltip"
					className={
						"time-info-popup" +
						(isVerticalLayout ? " time-info-popup-left" : "")
					}
				>
					{rows.map(([label, value]) => (
						<span className="time-info-row" key={label}>
							<span>{label}</span>
							<span>{formatDuration(value)}</span>
						</span>
					))}
					<span className="time-info-row time-info-total">
						<span>Total</span>
						<span>{formatDuration(pre + api + post)}</span>
					</span>
				</span>
			</span>
		);
	}

	function responseParamsRender() {
		return (
			<div
				className={
					isVerticalLayout
						? "response-params-panel-vertical"
						: "response-params-panel"
				}
			>
				<label>
					Status:
					<label className={getClassName(response.status)}>
						{response.isError
							? "ERROR"
							: response.status === 0
								? ""
								: response.status + " " + response.statusText}
					</label>
				</label>
				<label>
					Time:
					<label
						className={
							response.isError
								? "response-params error-text"
								: "response-params-time"
						}
					>
						{response.isError ? "0 ms" : GetResponseTime(response.duration)}
					</label>
					{!response.isError && response.status !== 0 && renderTimeInfo()}
				</label>
				<label>
					Size:
					<label
						className={
							response.isError
								? "response-params error-text"
								: "response-params"
						}
					>
						{response.size ? FormatBytes(parseInt(response.size)) : ""}
					</label>
				</label>
			</div>
		);
	}

	useEffect(() => {
		document.addEventListener("mousedown", handleClickOutside, false);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside, false);
		};
	}, []);

	function handleClickOutside(evt: any) {
		if (wrapperRef.current && !wrapperRef.current.contains(evt.target)) {
			setMenuShow(false);
		}

		if (
			codeWrapperRef.current &&
			!codeWrapperRef.current.contains(evt.target)
		) {
			setCodeMenuShow(false);
		}

		if (
			moreWrapperRef.current &&
			!moreWrapperRef.current.contains(evt.target)
		) {
			setMoreShow(false);
		}
	}

	function setShowMenu(evt: any) {
		evt.preventDefault();
		setMenuShow(!menuShow);
		setCodeMenuShow(false);
	}

	function setCodeShowMenu(evt: any) {
		evt.preventDefault();
		setMenuShow(false);
		setCodeMenuShow(!codeMenuShow);
	}

	function onSaveResponse(evt: any) {
		evt.preventDefault();
		vscode.postMessage({
			type: requestTypes.saveResponseRequest,
			data: response.responseData,
			fileType: response.responseType?.format,
		});
		setMenuShow(false);
	}

	function onSaveTestResponse(evt: any) {
		evt.preventDefault();
		vscode.postMessage({
			type: requestTypes.saveTestResponseRequest,
			data: JSON.stringify(testResults),
		});
		setMenuShow(false);
	}

	function onSelectTab(opt: string) {
		setSelectedTab(opt);
		setCodeMenuShow(false);
	}

	function isDisabled(opt: string) {
		if (opt === "codesnippet" && url) {
			return false;
		}

		if (opt === "codetype" && url) {
			//&& !response.isError && isJson(response.responseData)) {
			return false;
		}

		if (
			opt === "jsonschema" &&
			!response.isError &&
			response.responseData &&
			response.responseType?.format === "json"
		) {
			return false;
		}

		if (
			opt === "xmltojson" &&
			!response.isError &&
			response.responseData &&
			response.responseType?.format === "xml"
		) {
			return false;
		}

		return true;
	}

	function getResponseOptions(): { name: string; value: string }[] {
		let options = props.isCurl ? curlResponseOptions : responseOptions;

		return options.filter((option) => {
			if (option.value === "testresults") {
				return testCount > 0;
			}

			if (option.value === "prefetchresults") {
				return preFetchCount > 0;
			}

			if (option.value === "aiprompt") {
				return !response.isError && !!response.responseData;
			}

			return true;
		});
	}

	const options = getResponseOptions();
	const shownCount = Math.min(visibleCount, options.length);
	let visibleOptions = options.slice(0, shownCount);
	let overflowOptions = options.slice(shownCount);

	// Keep the selected tab visible by swapping it with the last visible one.
	const hiddenSelected = overflowOptions.find((o) => o.value === selectedTab);
	if (hiddenSelected && visibleOptions.length > 0) {
		const last = visibleOptions[visibleOptions.length - 1];
		visibleOptions = [...visibleOptions.slice(0, -1), hiddenSelected];
		overflowOptions = [
			last,
			...overflowOptions.filter((o) => o !== hiddenSelected),
		];
	}

	function updateVisibleCount() {
		const container = tabsRef.current;
		const measure = measureRef.current;
		if (!container || !measure) {
			return;
		}

		const widths = Array.from(measure.children).map(
			(c) => (c as HTMLElement).offsetWidth,
		);
		const available = container.clientWidth;
		let next = widths.length;

		if (widths.reduce((a, b) => a + b, 0) > available) {
			let used = MORE_BUTTON_WIDTH;
			next = 0;
			for (const w of widths) {
				if (used + w > available) {
					break;
				}
				used += w;
				next++;
			}
			next = Math.max(next, 1);
		}

		setVisibleCount(next);
	}

	useLayoutEffect(updateVisibleCount);

	useEffect(() => {
		if (!tabsRef.current) {
			return undefined;
		}
		const observer = new ResizeObserver(updateVisibleCount);
		observer.observe(tabsRef.current);
		return () => observer.disconnect();
	}, []);

	function getTabLabel(option: { name: string; value: string }) {
		return (
			<>
				{option.name}
				{option.value === "cookies" && response.responseData ? (
					<div className="header-count">({cookies?.length})</div>
				) : null}
				{option.value === "headers" && response.responseData ? (
					<div className="header-count">({headers?.length})</div>
				) : null}
				{option.value === "testresults" && (
					<div className="header-count">({testCount})</div>
				)}
				{option.value === "aiprompt" && (
					<span className="beta-badge">Beta</span>
				)}
				{option.value === "prefetchresults" && (
					<div className="header-count">({preFetchCount})</div>
				)}
			</>
		);
	}

	function onTabsKeyDown(evt: React.KeyboardEvent<HTMLDivElement>) {
		if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(evt.key)) {
			return;
		}
		evt.preventDefault();
		const idx = visibleOptions.findIndex((o) => o.value === selectedTab);
		const last = visibleOptions.length - 1;
		const next =
			evt.key === "Home"
				? 0
				: evt.key === "End"
					? last
					: evt.key === "ArrowRight"
						? Math.min(idx + 1, last)
						: Math.max(idx - 1, 0);
		if (next < 0) {
			return;
		}
		setSelectedTab(visibleOptions[next].value);
		// Skip the hidden measuring row, which holds the first N tab buttons.
		const tabs = evt.currentTarget.querySelectorAll(
			":scope > [role=tab]",
		) as NodeListOf<HTMLElement>;
		tabs[next]?.focus();
	}

	function renderTab(
		option: { name: string; value: string },
		measuring: boolean,
	) {
		return (
			<button
				key={option.value}
				role="tab"
				aria-selected={!measuring && selectedTab === option.value}
				tabIndex={measuring || selectedTab !== option.value ? -1 : 0}
				onClick={() => setSelectedTab(option.value)}
				className={
					selectedTab === option.value && !measuring
						? "option option-selected"
						: "option"
				}
			>
				<div className="option-names">{getTabLabel(option)}</div>
			</button>
		);
	}

	return (
		<>
			{isVerticalLayout ? (
				<div className="response-top-row">
					{responseParamsRender()}
					{renderToolbar()}
				</div>
			) : (
				<></>
			)}
			<div className="tab-options">
				<div
					className="response-tabs-wrap"
					ref={tabsRef}
					role="tablist"
					onKeyDown={onTabsKeyDown}
				>
					<div className="response-tabs-measure" ref={measureRef} aria-hidden>
						{options.map((option) => renderTab(option, true))}
					</div>
					{visibleOptions.map((option) => renderTab(option, false))}
					{overflowOptions.length > 0 && (
						<div className="dropdown" ref={moreWrapperRef}>
							<button
								className="option more-tabs-button"
								title="More"
								aria-label="More tabs"
								onClick={() => setMoreShow(!moreShow)}
							>
								▾
							</button>
							{moreShow && (
								<div className="dropdown-content res-more-drop-down-menu show">
									{overflowOptions.map((option) => (
										<button
											key={option.value}
											className="save-to-file-button"
											onClick={() => {
												setSelectedTab(option.value);
												setMoreShow(false);
											}}
										>
											<div className="option-names">{getTabLabel(option)}</div>
										</button>
									))}
								</div>
							)}
						</div>
					)}
				</div>
				{!isVerticalLayout ? responseParamsRender() : <></>}
				{!isVerticalLayout ? renderToolbar() : <></>}
			</div>
		</>
	);

	function renderToolbar() {
		return (
			<div className="menu-panel">
				<div className="response-toolbar-actions">
					{props.onToggleLayout && (
						<button
							type="button"
							className="response-layout-toggle"
							onClick={props.onToggleLayout}
							title={`Switch to ${
								isVerticalLayout ? "horizontal" : "vertical"
							} view for this window`}
							aria-label={`Switch to ${
								isVerticalLayout ? "horizontal" : "vertical"
							} view for this window`}
						>
							{isVerticalLayout ? "⬒" : "◧"}
						</button>
					)}
					<div className="dropdown" ref={codeWrapperRef}>
						<CodeLogo
							title="Code Snippet"
							className="code-snippet-icon"
							onClick={setCodeShowMenu}
						/>
						{codeMenuShow && (
							<div
								id="res-menu"
								className={"dropdown-content res-code-drop-down-menu show"}
							>
								<button
									className="save-to-file-button"
									disabled={isDisabled("codesnippet")}
									onClick={() => onSelectTab("codesnippet")}
								>
									Code Snippet
								</button>
								<button
									className="save-to-file-button"
									disabled={isDisabled("codetype")}
									onClick={() => onSelectTab("codetype")}
								>
									Code Types
								</button>
								<button
									className="save-to-file-button"
									disabled={isDisabled("jsonschema")}
									onClick={() => onSelectTab("jsonschema")}
								>
									JSON Schema
								</button>
								<button
									className="save-to-file-button"
									disabled={isDisabled("xmltojson")}
									onClick={() => onSelectTab("xmltojson")}
								>
									XML to JSON
								</button>
							</div>
						)}
					</div>
					<div className="dropdown" ref={wrapperRef}>
						{getColFolDotMenu(
							"res-menu",
							"Menu",
							"hamburger-menu",
							(e) => {
								e.stopPropagation();
								e.preventDefault();
							},
							(e) => setShowMenu(e),
						)}
						{menuShow && (
							<div
								id="res-menu"
								className={"dropdown-content res-drop-down-menu show"}
							>
								<button
									className="save-to-file-button"
									onClick={(e) => onSaveResponse(e)}
									disabled={
										response.responseData &&
										!response.responseType.isBinaryFile &&
										!response.isError
											? false
											: true
									}
								>
									Save Response to File
								</button>
								{!props.isCurl && (
									<button
										className="save-to-file-button"
										onClick={(e) => onSaveTestResponse(e)}
										disabled={testResults.length > 0 ? false : true}
									>
										Save Tests to File
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		);
	}
};
