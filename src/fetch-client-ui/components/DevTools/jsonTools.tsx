import React, { useState } from "react";
import { copyText } from "./utils";
import { withPanelLayout } from "./withPanelLayout";
import { generateJsonSchema } from "../../../fetch-client-core/helpers/json.helper";
import { convertXmlToJson } from "../../../fetch-client-core/helpers/xml.helper";

export const JsonFormatter = withPanelLayout(() => {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    const format = () => {
        try {
            setError("");
            setOutput(JSON.stringify(JSON.parse(input), null, 2));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="dev-tool">
            <div className="dev-tool-grid">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='{"name":"Fetch Client"}'
                />
                <textarea value={output} readOnly />
            </div>
            <div className="dev-tool-message">
                {error && <div className="reorder-status reorder-status--error">{error}</div>}
            </div>
            <div className="dev-tool-actions">
                <button type="button" onClick={format}>
                    Format
                </button>
                <button type="button" onClick={() => copyText(output)}>
                    Copy
                </button>
            </div>
        </div>
    );
}, "✨ JSON Formatter");

export const JsonValidator = withPanelLayout(() => {
    const [input, setInput] = useState("");
    const [message, setMessage] = useState("");

    const validate = () => {
        try {
            JSON.parse(input);
            setMessage("✓ Valid JSON");
        } catch (e) {
            setMessage(`✗ Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
        }
    };

    return (
        <div className="dev-tool">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} />
            <div className="dev-tool-message">
                {message && <div className={message.startsWith("✓") ? "reorder-status reorder-status--ok" : "reorder-status reorder-status--error"}>{message}</div>}
            </div>
            <div className="dev-tool-actions">
                <button type="button" onClick={validate}>
                    Validate
                </button>
            </div>
        </div>
    );
}, "✅ JSON Validator");

export const JsonSchemaGenerator = withPanelLayout(() => {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    const generate = async () => {
        try {
            setError("");
            JSON.parse(input);
            const schema = await generateJsonSchema(input);
            setOutput(schema);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="dev-tool">
            <div className="dev-tool-grid">
                <textarea value={input} onChange={(e) => setInput(e.target.value)} />
                <textarea value={output} readOnly />
            </div>
            <div className="dev-tool-message">
                {error && <div className="reorder-status reorder-status--error">{error}</div>}
            </div>
            <div className="dev-tool-actions">
                <button type="button" onClick={generate}>Generate Schema</button>
                <button type="button" onClick={() => copyText(output)}>Copy</button>
            </div>
        </div>
    );
}, "📐 JSON Schema Generator");

function queryPath(root: unknown, expression: string): unknown[] {
    const path = expression
        .trim()
        .replace(/^\$/, "")
        .split(".")
        .filter(Boolean);

    let current: unknown[] = [root];

    for (const segment of path) {
        if (segment === "[*]" || segment === "*") {
            current = current.flatMap((item) =>
                Array.isArray(item) ? item : [],
            );
            continue;
        }

        const arrayMatch = segment.match(/^(.+)\[\*\]$/);
        if (arrayMatch) {
            const key = arrayMatch[1];
            current = current.flatMap((item) => {
                const child = (item as Record<string, unknown>)?.[key];
                return Array.isArray(child) ? child : [];
            });
            continue;
        }

        current = current
            .map((item) =>
                item !== null && typeof item === "object"
                    ? (item as Record<string, unknown>)[segment]
                    : undefined,
            )
            .filter((v) => v !== undefined);
    }

    return current;
}

export const JsonPathTester = withPanelLayout(() => {
    const [json, setJson] = useState("");
    const [path, setPath] = useState("$");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    const run = () => {
        try {
            setError("");
            const value = JSON.parse(json);
            setOutput(JSON.stringify(queryPath(value, path), null, 2));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="dev-tool">
            <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="$.users[*].name" />
            <div className="dev-tool-grid">
                <textarea value={json} onChange={(e) => setJson(e.target.value)} />
                <textarea value={output} readOnly />
            </div>
            <div className="dev-tool-message">
                {error && <div className="reorder-status reorder-status--error">{error}</div>}
            </div>
            <div className="dev-tool-actions">
                <button type="button" onClick={run}>Run JSONPath</button>
            </div>
        </div>
    );
}, "🔎 JSONPath Tester");

export const XmlToJson = withPanelLayout(() => {
    const [xml, setXml] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    const convert = () => {
        try {
            setError("");
            if (!xml.trim()) {
                throw new Error("Please enter XML.");
            }
            const jsonData = convertXmlToJson(xml);
            setOutput(jsonData);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="dev-tool">
            <div className="dev-tool-grid">
                <textarea value={xml} onChange={(e) => setXml(e.target.value)} placeholder="<user><id>1</id></user>" />
                <textarea value={output} readOnly />
            </div>
            <div className="dev-tool-message">
                {error && <div className="reorder-status reorder-status--error">{error}</div>}
            </div>
            <div className="dev-tool-actions">
                <button type="button" onClick={convert}>Convert</button>
                <button type="button" onClick={() => copyText(output)}>Copy</button>
            </div>
        </div>
    );
}, "🔄 XML → JSON");

export const JsonToXml = withPanelLayout(() => {
    const [json, setJson] = useState("");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    const escapeXml = (value: string) =>
        value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const element = (name: string, value: unknown): string => {
        if (Array.isArray(value)) {
            return value.map((item) => element(name, item)).join("");
        }

        if (value !== null && typeof value === "object") {
            const children = Object.entries(value as Record<string, unknown>)
                .map(([key, child]) => element(key, child))
                .join("");
            return `<${name}>${children}</${name}>`;
        }

        return `<${name}>${escapeXml(String(value ?? ""))}</${name}>`;
    };

    const convert = () => {
        try {
            setError("");
            const value = JSON.parse(json);
            setOutput(`<?xml version="1.0" encoding="UTF-8"?>\n${element("root", value)}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="dev-tool">
            <div className="dev-tool-grid">
                <textarea value={json} onChange={(e) => setJson(e.target.value)} />
                <textarea value={output} readOnly />
            </div>
            <div className="dev-tool-message">
                {error && <div className="reorder-status reorder-status--error">{error}</div>}
            </div>
            <div className="dev-tool-actions">
                <button type="button" onClick={convert}>Convert</button>
            </div>
        </div>
    );
}, "🔄 JSON → XML");
