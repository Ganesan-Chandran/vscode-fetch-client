import React, { useEffect, useState } from 'react';
import ReactJson from 'react-json-view';
import { useSelector } from 'react-redux';
import { IRootState } from '../../../reducer/combineReducer';
import "./style.css";
import { ViewerProps } from './types';

export const JSONViewer = (props: ViewerProps) => {

	const { theme } = useSelector((state: IRootState) => state.uiData);

	const [jsonData, setJsonData] = useState({});
	const [isValid, setValid] = useState(false);

	useEffect(() => {
		try {
			setJsonData(JSON.parse(props.data));
			setValid(true);
		} catch {
			setValid(false);
		}
	}, []);

	return (
		<div className="json-viewer-panel">
			{
				isValid ?
					<ReactJson
						src={jsonData}
						theme={theme === 1 ? "summerfruit:inverted" : theme === 2 ? "summerfruit" : "brewer"}
						enableClipboard={false}
						displayDataTypes={false}
					/>
					:
					<span className="file-not-available json-viewer-error">{"Invalid JSON."}</span>
			}
		</div>
	);
};
