import React, { useEffect, useState } from 'react';
import ReactJson from 'react-json-view';
import "./style.css";
import { ViewerProps } from './types';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const XMLViewer = (props: ViewerProps) => {

    const [jsonData, setJsonData] = useState({});
    const [isValid, setValid] = useState(false);

    useEffect(() => {
        if (XMLValidator.validate(props.data)) {
            const options = {
                ignoreAttributes: false,
                attributeNamePrefix: "@",
                allowBooleanAttributes: true,
                removeNSPrefix: true
            };
            const parser = new XMLParser(options);
            const jsonObj = parser.parse(props.data);
            setJsonData(jsonObj);
            setValid(true);
        } else {
            setValid(false);
        }
    }, []);

    return (
        <div className="json-viewer-panel">
            {
                isValid ?
                    <ReactJson
                        src={jsonData}
                        theme={props.theme === 1 ? "summerfruit:inverted" : props.theme === 2 ? "summerfruit" : "brewer"}
                        enableClipboard={false}
                        displayDataTypes={false}
                    />
                    :
                    <span className="file-not-available json-viewer-error">{"Invalid XML."}</span>
            }
        </div>
    );
};