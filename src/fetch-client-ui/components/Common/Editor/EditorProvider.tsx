import "./style.css";
import { EditorProps } from ".";
import { syncAceWithVSCodeTheme } from "./themeHelper";
import * as prettier from "prettier/standalone";
import * as prettierGraphqlNS from "prettier/plugins/graphql";
import AceEditor from "react-ace";
import prettierBabel from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";
import prettierHtml from "prettier/plugins/html";
import prettierTypescript from "prettier/plugins/typescript";
import React, { useEffect, useRef, useState } from "react";
import xmlFormatter from "xml-formatter";

import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/ext-searchbox";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-dart";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-graphqlschema";
import "ace-builds/src-noconflict/mode-graphqlschema";
import "ace-builds/src-noconflict/mode-html";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-kotlin";
import "ace-builds/src-noconflict/mode-php";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-rdoc";
import "ace-builds/src-noconflict/mode-ruby";
import "ace-builds/src-noconflict/mode-sh";
import "ace-builds/src-noconflict/mode-swift";
import "ace-builds/src-noconflict/mode-text";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/mode-xml";
import "ace-builds/src-noconflict/theme-github_dark";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/theme-tomorrow_night";

const prettierGraphql = (prettierGraphqlNS as any).default ?? prettierGraphqlNS;
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

function themeFromCode(theme?: number): string {
	if (theme === 2) {
		return "tomorrow_night";
	} // vs-dark
	if (theme === 3) {
		return "github_dark";
	} // hc-black
	return "github"; // vs (light)
}

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
			case "graphql":
				return await prettier.format(value, {
					parser: "graphql",
					plugins: [prettierGraphql],
				});
			case "xml": {
				return formatXml(value);
			}
			default:
				return value;
		}
	} catch {
		return value;
	}
}

function formatXml(xml: string): string {
	const formatted = xmlFormatter(xml, {
		indentation: "  ",
		lineSeparator: "\n",
		collapseContent: true,
	});

	return formatted;
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

	useEffect(() => {
		syncAceWithVSCodeTheme();
	}, [props.theme]);

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
				wrapEnabled={!props.wordWrap}
				width="100%"
				height="100%"
				fontSize={14}
				showPrintMargin={false}
				setOptions={{
					useWorker: false,
					showLineNumbers: true,
					tabSize: 2,
					highlightActiveLine: false,
				}}
			/>
		</div>
	);
};

export default EditorProvider;
