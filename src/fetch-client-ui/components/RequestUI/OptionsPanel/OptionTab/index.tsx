import React from "react";
import { useSelector } from "react-redux";
import { ReactComponent as MenuLogo } from "../../../../../../icons/settings.svg";
import { IRootState } from "../../../../reducer/combineReducer";

export const OptionsTab = (props: any) => {
	const { selectedTab, setSelectedTab, options, settings, secondary } = props;

	const { headers } = useSelector((state: IRootState) => state.requestData);

	const settingsCss = () => {
		return selectedTab === "settings"
			? "settings-menu settings-menu-clicked"
			: "settings-menu";
	};

	const onKeyDown = (evt: React.KeyboardEvent) => {
		const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
		if (!keys.includes(evt.key)) {
			return;
		}
		evt.preventDefault();
		const idx = options.findIndex((o) => o.value === selectedTab);
		const last = options.length - 1;
		const next =
			evt.key === "Home"
				? 0
				: evt.key === "End"
					? last
					: evt.key === "ArrowRight"
						? (idx + 1) % options.length
						: (idx - 1 + options.length) % options.length;
		setSelectedTab(options[next].value);
		(
			evt.currentTarget.querySelectorAll("[role=tab]")[next] as HTMLElement
		)?.focus();
	};

	return (
		<div
			className={
				secondary ? "tab-options tab-options-secondary" : "tab-options"
			}
			role="tablist"
			onKeyDown={onKeyDown}
		>
			{options.map((option) => (
				<button
					key={option.value}
					role="tab"
					aria-selected={selectedTab === option.value}
					tabIndex={selectedTab === option.value ? 0 : -1}
					onClick={() => setSelectedTab(option.value)}
					className={
						selectedTab === option.value ? "option option-selected" : "option"
					}
				>
					<div className="option-names">
						{option.name}
						{option.value === "headers" ? (
							<div className="header-count">({headers.length - 1})</div>
						) : null}
					</div>
				</button>
			))}
			{settings && (
				<div className="settings-menu-panel">
					<MenuLogo
						className={settingsCss()}
						title="Menu"
						onClick={() => {
							setSelectedTab("settings");
						}}
					/>
				</div>
			)}
		</div>
	);
};
