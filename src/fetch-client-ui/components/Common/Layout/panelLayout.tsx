import "./style.css";
import React from "react";

interface PanelLayoutProps {
	title: React.ReactNode;
	loading?: boolean;
	header?: React.ReactNode;
	children: React.ReactNode;
	footer?: React.ReactNode;
}

const PanelLayout: React.FC<PanelLayoutProps> = ({
	title,
	loading,
	header,
	children,
	footer,
}) => (
	<div className="layout-panel">
		<div className="reorder-header">{title}</div>
		<div className="layout-body">
			{header}
			{loading ? (
				<>
					<div id="divSpinner" className="spinner loading" />
					<div className="loading-history-text">Loading....</div>
				</>
			) : (
				<>
					<div className="layout-content">{children}</div>
					{footer && <div className="layout-footer">{footer}</div>}
				</>
			)}
		</div>
	</div>
);

export default PanelLayout;
