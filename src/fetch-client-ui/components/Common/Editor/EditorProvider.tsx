import React, { useEffect, useRef, useState } from "react";
import AceEditor from "react-ace";
import { EditorProps } from ".";
import "./style.css";

// --- Ace modes (only the ones you use) ---
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-dart";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-kotlin";
import "ace-builds/src-noconflict/mode-ruby";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-xml";
import "ace-builds/src-noconflict/mode-php";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-sh";
import "ace-builds/src-noconflict/mode-swift";
import "ace-builds/src-noconflict/mode-graphqlschema";
import "ace-builds/src-noconflict/mode-rdoc"; // closest built-in to restructuredtext
import "ace-builds/src-noconflict/mode-text";

// --- Ace themes ---
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-tomorrow_night";
import "ace-builds/src-noconflict/theme-github_dark"; // used as hc-black substitute

// --- Extensions (no workers needed) ---
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/ext-language_tools";

// --- Prettier (for format support) ---
import * as prettier from "prettier/standalone";
import prettierBabel from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";
import prettierTypescript from "prettier/plugins/typescript";
import prettierHtml from "prettier/plugins/html";
// import prettierPostcss from "prettier/plugins/postcss";

// Map your language identifiers -> Ace mode names
const languageToAceMode: Record<string, string> = {
	cpp: "c_cpp",
	csharp: "csharp",
	dart: "dart",
	go: "golang",
	java: "java",
	javascript: "javascript",
	json: "json",
	kotlin: "kotlin",
	ruby: "ruby",
	typescript: "typescript",
	html: "html",
	xml: "xml",
	php: "php",
	python: "python",
	shell: "sh",
	swift: "swift",
	graphql: "graphqlschema",
	restructuredtext: "rdoc",
};

// Map your theme codes -> Ace theme names
function themeFromCode(theme?: number): string {
	if (theme === 2) { return "tomorrow_night"; } // vs-dark
	if (theme === 3) { return "github_dark"; }    // hc-black
	return "github";                          // vs (light)
}

// Format content for languages we can actually format client-side.
// Languages with no client-side formatter (csharp, kotlin, go, etc.)
// are returned unchanged - same behavior as before.
async function formatValue(value: string, language: string): Promise<string> {
	try {
		switch (language) {
			case "json": {
				const parsed = JSON.parse(value);
				return JSON.stringify(parsed, null, 2);
			}
			case "javascript":
				return await prettier.format(value, {
					parser: "babel",
					plugins: [prettierBabel, prettierEstree],
				});
			case "typescript":
				return await prettier.format(value, {
					parser: "typescript",
					plugins: [prettierTypescript, prettierEstree],
				});
			case "html":
				return await prettier.format(value, {
					parser: "html",
					plugins: [prettierHtml],
				});
			case "xml": {
				// Simple XML pretty-printer (prettier has no built-in xml plugin)
				return formatXml(value);
			}
			default:
				return value;
		}
	} catch {
		// If parsing/formatting fails (invalid JSON/JS etc.), return original value
		return value;
	}
}

// Minimal XML formatter (indentation based)
function formatXml(xml: string): string {
	const PADDING = "  ";
	const reg = /(>)(<)(\/*)/g;
	let formatted = xml.replace(reg, "$1\r\n$2$3");
	let pad = 0;
	return formatted
		.split("\r\n")
		.map((node) => {
			let indent = 0;
			if (/^<\/\w/.test(node)) {
				pad = Math.max(pad - 1, 0);
			} else if (/^<\w[^>]*[^/]>.*$/.test(node)) {
				indent = 1;
			}
			const line = PADDING.repeat(pad) + node;
			pad += indent;
			return line;
		})
		.join("\n");
}

const EditorProvider = (props: EditorProps) => {
	const editorRef = useRef<AceEditor | null>(null);
	const [copyText, setCopyText] = useState("Copy");
	const [value, setValue] = useState(props.value || "");

	function onCopyClick() {
		navigator.clipboard.writeText(value).then(() => {
			setCopyText("Copied");
			setTimeout(() => setCopyText("Copy"), 1000);
		});
	}

	// Apply formatting whenever value/language/format flag changes
	useEffect(() => {
		let cancelled = false;

		async function run() {
			if (props.format && props.value) {
				const formatted = await formatValue(props.value, props.language);
				if (!cancelled) {
					setValue(formatted);
				}
			} else {
				setValue(props.value || "");
			}
		}

		run();

		return () => {
			cancelled = true;
		};
	}, [props.value, props.language, props.format]);

	function handleChange(newValue: string) {
		setValue(newValue);
		props.onContentChange && props.onContentChange(newValue);
	}

	const aceMode = languageToAceMode[props.language] || "text";
	const aceTheme = themeFromCode(props.theme);

	return (
		<div className={"editor" + " " + (props.className || "")}>
			{props.copyButtonVisible && (
				<button onClick={onCopyClick} className="copy-button">
					{copyText}
				</button>
			)}
			<AceEditor
				ref={editorRef}
				mode={aceMode}
				theme={aceTheme}
				value={value}
				onChange={handleChange}
				readOnly={props.readOnly}
				wrapEnabled={!!props.wordWrap}
				width="100%"
				height="100%"
				fontSize={14}
				showPrintMargin={false}
				setOptions={{
					useWorker: false, // avoids any webview worker/CSP issues
					showLineNumbers: true,
					tabSize: 2,
					highlightActiveLine: false,
				}}
			/>
		</div>
	);
};

export default EditorProvider;