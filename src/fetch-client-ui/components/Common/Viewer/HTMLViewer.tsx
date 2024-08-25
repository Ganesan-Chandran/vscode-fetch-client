import React from 'react';
import "./style.css";
import { ViewerProps } from './types';

export const HTMLViewer = (props: ViewerProps) => {
		return (
				<div className="html-viewer-panel">
						<iframe sandbox="allow-forms allow-scripts allow-same-origin" srcDoc={props.data}></iframe>
				</div>
		);
};
