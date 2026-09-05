import React, { useState } from "react";
import { copyText, encodeBase64Url } from "./utils";
import { withPanelLayout } from "./withPanelLayout";

async function digest(
    algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512",
    text: string,
): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest(algorithm, data);
    return Array.from(new Uint8Array(hash), (b) =>
        b.toString(16).padStart(2, "0"),
    ).join("");
}

async function hmac(
    algorithm: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512",
    secret: string,
    text: string,
): Promise<string> {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: algorithm },
        false,
        ["sign"],
    );

    const result = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(text),
    );

    return Array.from(new Uint8Array(result), (b) =>
        b.toString(16).padStart(2, "0"),
    ).join("");
}

export const HashGenerator = withPanelLayout(() => {
    const [algorithm, setAlgorithm] = useState<"SHA-1" | "SHA-256" | "SHA-384" | "SHA-512">("SHA-256");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");

    const generate = async () => setOutput(await digest(algorithm, input));

    return (
        <div className="dev-tool">
            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as typeof algorithm)}>
                {["SHA-1", "SHA-256", "SHA-384", "SHA-512"].map((a) => <option key={a}>{a}</option>)}
            </select>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} />
            <div className="dev-tool-actions">
                <button type="button" onClick={generate}>Generate Hash</button>
            </div>
            <textarea value={output} readOnly />
            <div className="dev-tool-actions">
                <button type="button" onClick={() => copyText(output)}>Copy</button>
            </div>
        </div>
    );
}, "#️⃣ Hash Generator");

export const HmacGenerator = withPanelLayout(() => {
    const [algorithm, setAlgorithm] = useState<"SHA-1" | "SHA-256" | "SHA-384" | "SHA-512">("SHA-256");
    const [secret, setSecret] = useState("");
    const [input, setInput] = useState("");
    const [output, setOutput] = useState("");

    const generate = async () => setOutput(await hmac(algorithm, secret, input));

    return (
        <div className="dev-tool">
            <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as typeof algorithm)}>
                {["SHA-1", "SHA-256", "SHA-384", "SHA-512"].map((a) => <option key={a}>{a}</option>)}
            </select>
            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="Secret" />
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message" />
            <div className="dev-tool-actions">
                <button type="button" onClick={generate}>Generate HMAC</button>
            </div>
            <textarea value={output} readOnly />
            <div className="dev-tool-actions">
                <button type="button" onClick={() => copyText(output)}>Copy</button>
            </div>
        </div>
    );
}, "🔏 HMAC Generator");

export const JwtGenerator = withPanelLayout(() => {
    const [header, setHeader] = useState('{"alg":"none","typ":"JWT"}');
    const [payload, setPayload] = useState('{"sub":"123","name":"John"}');
    const [output, setOutput] = useState("");

    const generate = () => {
        try {
            const h = encodeBase64Url(JSON.stringify(JSON.parse(header)));
            const p = encodeBase64Url(JSON.stringify(JSON.parse(payload)));
            setOutput(`${h}.${p}.`);
        } catch (e) {
            setOutput(e instanceof Error ? e.message : String(e));
        }
    };

    return (
        <div className="dev-tool">
            <div className="dev-tool-grid">
                <textarea value={header} onChange={(e) => setHeader(e.target.value)} />
                <textarea value={payload} onChange={(e) => setPayload(e.target.value)} />
            </div>
            <div className="dev-tool-actions">
                <button type="button" onClick={generate}>Generate JWT</button>
            </div>
            <textarea value={output} readOnly />
            <div className="dev-tool-actions">
                <button type="button" onClick={() => copyText(output)}>Copy</button>
            </div>
        </div>
    );
}, "🎫 JWT Generator");
