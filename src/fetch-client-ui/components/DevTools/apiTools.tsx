import React, { useMemo, useState } from "react";
import { copyText } from "./utils";
import { withPanelLayout } from "./withPanelLayout";

export const UrlParser = withPanelLayout(() => {
    const [value, setValue] = useState("https://example.com/users?id=10&active=true");
    const parsed = useMemo(() => {
        try {
            const url = new URL(value);
            return {
                href: url.href,
                protocol: url.protocol,
                host: url.host,
                hostname: url.hostname,
                port: url.port,
                pathname: url.pathname,
                search: url.search,
                hash: url.hash,
                origin: url.origin,
            };
        } catch {
            return null;
        }
    }, [value]);

    return (
        <div className="dev-tool">
            <input value={value} onChange={(e) => setValue(e.target.value)} />
            {parsed ? (
                <pre className="dev-tool-output">{JSON.stringify(parsed, null, 2)}</pre>
            ) : (
                <div className="dev-tool-error">Invalid URL</div>
            )}
        </div>
    );
}, "🔗 URL Parser");

export const QueryStringParser = withPanelLayout(() => {
    const [value, setValue] = useState("id=10&active=true&tag=api");
    const [output, setOutput] = useState("");

    const parse = () => {
        const params = new URLSearchParams(value);
        const result: Record<string, string | string[]> = {};

        params.forEach((item, key) => {
            if (result[key] === undefined) { result[key] = item; }
            else { result[key] = Array.isArray(result[key]) ? [...result[key], item] : [result[key] as string, item]; }
        });

        setOutput(JSON.stringify(result, null, 2));
    };

    return (
        <div className="dev-tool">
            <input value={value} onChange={(e) => setValue(e.target.value)} />
            <div className="dev-tool-actions">
                <button type="button" onClick={parse}>Parse</button>
            </div>
            <textarea value={output} readOnly />
            <div className="dev-tool-actions">
                <button type="button" onClick={() => copyText(output)}>Copy</button>
            </div>
        </div>
    );
}, "🔎 Query String Parser");
