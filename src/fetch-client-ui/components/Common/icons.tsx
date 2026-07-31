import React from "react";

export function getPlusIconSVG(
	toolTip: string,
	className: string,
	onContextMenu: React.MouseEventHandler<SVGSVGElement>,
	onClick: React.MouseEventHandler<SVGSVGElement>,
) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			className={className}
			onContextMenu={onContextMenu}
			onClick={onClick}
		>
			<title>{toolTip}</title>
			<path d="M14.672 6.598H9.539v-5.13a1.467 1.467 0 10-2.934 0v5.134H1.473A1.47 1.47 0 00.43 9.113c.265.27.632.438 1.039.438h5.136v5.12c0 .407.165.778.43 1.04.266.27.633.434 1.035.434a1.47 1.47 0 001.47-1.473V9.55h5.132c.812 0 1.469-.664 1.469-1.477 0-.812-.657-1.476-1.47-1.476zm0 0">
				<title>{toolTip}</title>
			</path>
		</svg>
	);
}

export function getSideBarTabIcon(tab: string) {
	switch (tab) {
		case "History":
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 16 16"
					className="sidebar-tab-svg sidebar-tab-svg-history"
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.3"
				>
					<circle
						cx="8"
						cy="8"
						r="6.25"
						fill="currentColor"
						fillOpacity="0.15"
					></circle>
					<path d="M8 4.5V8l2.5 1.5"></path>
				</svg>
			);
		case "Collection":
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 16 16"
					className="sidebar-tab-svg sidebar-tab-svg-collection"
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.3"
				>
					<path
						d="M2 4.5h4l1.2 1.5H14v6.5H2z"
						fill="currentColor"
						fillOpacity="0.2"
					></path>
				</svg>
			);
		case "Variable":
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 16 16"
					className="sidebar-tab-svg sidebar-tab-svg-variable"
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.3"
				>
					<path d="M5.5 2.5c-1.2 0-1.5.6-1.5 1.6v1.8c0 .8-.3 1.1-1 1.6.7.5 1 .8 1 1.6v1.8c0 1 .3 1.6 1.5 1.6"></path>
					<path d="M10.5 2.5c1.2 0 1.5.6 1.5 1.6v1.8c0 .8.3 1.1 1 1.6-.7.5-1 .8-1 1.6v1.8c0 1-.3 1.6-1.5 1.6"></path>
				</svg>
			);
		case "Mock Server":
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 16 16"
					className="sidebar-tab-svg sidebar-tab-svg-mockserver"
					fill="none"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.3"
				>
					<rect
						x="2.5"
						y="3"
						width="11"
						height="3.6"
						rx="0.6"
						fill="currentColor"
						fillOpacity="0.18"
					></rect>
					<rect
						x="2.5"
						y="9.4"
						width="11"
						height="3.6"
						rx="0.6"
						fill="currentColor"
						fillOpacity="0.18"
					></rect>
					<circle
						cx="4.3"
						cy="4.8"
						r="0.5"
						fill="currentColor"
						stroke="none"
					></circle>
					<circle
						cx="4.3"
						cy="11.2"
						r="0.5"
						fill="currentColor"
						stroke="none"
					></circle>
				</svg>
			);
		default:
			return null;
	}
}

export function getColFolDotMenu(
	id: string,
	toolTip: string,
	className: string,
	onContextMenu: React.MouseEventHandler<SVGSVGElement>,
	onClick: React.MouseEventHandler<SVGSVGElement>,
) {
	return (
		<svg
			width="16"
			height="16"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth="1.5"
			className={className}
			id={id}
			onContextMenu={onContextMenu}
			onClick={onClick}
		>
			<title>{toolTip}</title>
			<circle cx="8" cy="2.5" r="0.75"></circle>
			<circle cx="8" cy="8" r="0.75"></circle>
			<circle cx="8" cy="13.5" r="0.75"></circle>
		</svg>
	);
}
