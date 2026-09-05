import "./style.css";
import { AceEditor } from "../Editor";
import { convertXmlToJson } from "../../../../fetch-client-core/helpers/xml.helper";
import { generateJsonSchema } from "../../../../fetch-client-core/helpers/json.helper";
import { IRootState } from "../../../reducer/combineReducer";
import { useSelector } from "react-redux";
import React, { useEffect, useState } from "react";

export type JsonSchemaGeneratorMode = "jsonschema" | "xmltojson";

interface JsonSchemaGeneratorProps {
    mode: JsonSchemaGeneratorMode;
}

const JsonSchemaGenerator = ({ mode }: JsonSchemaGeneratorProps) => {
    const responseData = useSelector(
        (state: IRootState) => state.responseData.response.responseData,
    );
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        setError("");
        setOutput("");
        const task =
            mode === "jsonschema"
                ? generateJsonSchema(responseData)
                : Promise.resolve(convertXmlToJson(responseData));

        task
            .then(setOutput)
            .catch((err) =>
                setError(
                    mode === "jsonschema"
                        ? "Unable to generate schema: " + err.message
                        : "Unable to convert XML to JSON: " + err.message,
                ),
            );
    }, [responseData, mode]);

    return (
        <div className="code-snippet-panel">
            <hr />
            {error && <div className="error-text">{error}</div>}
            {output && (
                <>
                    <div className="code-snippet-editor-panel schema-editor-panel">
                        <AceEditor
                            value={output}
                            language="json"
                            readOnly={true}
                            copyButtonVisible={true}
                            format={true}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default JsonSchemaGenerator;
