import "./style.css";
import { codeSnippetLangunages } from "../../../../fetch-client-core/consts/codeLang.consts";
import { HTTPSnippet, type TargetId, type ClientId } from "httpsnippet";
import { IRequestModel } from "../../../../fetch-client-core/types/request.types";
import { IRootState } from "../../../reducer/combineReducer";
import { AceEditor } from "../Editor";
import { replaceValueWithVariable } from "../../../../fetch-client-core/helpers/variable.helper";
import { useSelector } from "react-redux";
import React, { useEffect, useState } from "react";

const CodeSnippetGenerator = () => {
	const [language, setLang] = useState<TargetId>("csharp");
	const [option, setOption] = useState<ClientId>("httpclient");
	const [codeSnippet, setCodeSnippet] = useState("");

	const requestData = useSelector((state: IRootState) => state.requestData);
	const { selectedVariable } = useSelector(
		(state: IRootState) => state.variableData,
	);

	function onSelectedLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
		const lang = e.target.value as TargetId;
		setLang(lang);
		setOption(
			codeSnippetLangunages.filter((l) => l.value === lang)[0].options[0]
				.value as ClientId,
		);
	}

	function onSelectedOption(e: React.ChangeEvent<HTMLSelectElement>) {
		setOption(e.target.value as ClientId);
	}

	function getRawContentType(rawType: string): string {
		let contentTypes = {
			json: "application/json",
			html: "text/html",
			xml: "application/xml",
			text: "text/plain",
		};

		return contentTypes[rawType];
	}

	useEffect(() => {
		if (!requestData.url) {
			return;
		}

		let request: IRequestModel;
		let varData = {};

		if (selectedVariable.data.length > 0) {
			selectedVariable.data.forEach((item) => {
				varData[item.key] = item.value;
			});
			let copy = JSON.parse(JSON.stringify(requestData));
			request = replaceValueWithVariable(copy, varData);
		} else {
			request = requestData;
		}

		if (
			requestData.url.startsWith("http://") ||
			requestData.url.startsWith("https://")
		) {
			request.url = requestData.url;
		} else {
			request.url = "https://" + requestData.url;
		}

		let body: any = {
			mimeType: "",
			text: "",
		};

		if (request.body.bodyType === "formdata") {
			let params = [];
			request.body.formdata.forEach((data) => {
				if (data.key && data.isChecked) {
					if (data.type === "File") {
						params.push({ name: data.key, fileName: data.value });
					} else {
						params.push({ name: data.key, value: data.value });
					}
				}
			});
			body = {
				mimeType: "multipart/form-data",
				params: params,
			};
		} else if (request.body.bodyType === "formurlencoded") {
			let params = [];
			request.body.urlencoded.forEach((data) => {
				if (data.key && data.isChecked) {
					params.push({ name: data.key, value: data.value });
				}
			});
			body = {
				mimeType: "application/x-www-form-urlencoded",
				params: params,
			};
		} else if (request.body.bodyType === "raw") {
			body = {
				mimeType: getRawContentType(request.body.raw.lang),
				text: request.body.raw.data,
			};
		} else if (request.body.bodyType === "binary") {
			if (request.body.binary.data.length > 0) {
				let contentType = request.headers.find(
					(item) => item.key.toUpperCase() === "Content-Type",
				);
				body = {
					mimeType: contentType ? contentType.key : "application/octet-stream",
					text: request.body.binary.data,
				};
			} else {
				body = {};
			}
		} else if (request.body.bodyType === "graphql") {
			body = {
				mimeType: "application/json",
				text: JSON.stringify({
					query: request.body.graphql.query,
					variables: request.body.graphql.variables,
				}),
			};
		}

		let headers = [];
		request.headers.forEach((header) => {
			if (header.key) {
				headers.push({ name: header.key, value: header.value });
			}
		});

		let value: any;

		try {
			var harRequest = {
				method: request.method.toUpperCase(),
				url: request.url,
				httpVersion: "HTTP/1.1",
				cookies: [],
				headers: headers,
				queryString: [],
				headersSize: -1,
				bodySize: -1,
				postData: body,
			};
			const snippet = new HTTPSnippet(harRequest);
			value = snippet.convert(language, option);
		} catch (err) {
			value = "";
			console.log(
				"CodeSnippetGenerator error: " + JSON.stringify(err, null, 2),
			);
		}

		let str = isString(value) ? (value as string) : "";

		setCodeSnippet(str);
	}, [language, option, requestData]);

	function isString(val: any): boolean {
		if (typeof val === "string" || val instanceof String) {
			return true;
		} else {
			return false;
		}
	}

	return (
		<div className="code-snippet-panel">
			<hr />
			{codeSnippet && (
				<>
					<div className="code-snippet-select-panel">
						<div className="code-snippet-lang-panel">
							<label className="code-snippet-lang-label">Language</label>
							<select
								onChange={onSelectedLanguage}
								value={language}
								className="code-snippet-lang-select"
							>
								{codeSnippetLangunages.map((lang) => (
									<option key={lang.value} value={lang.value}>
										{lang.name}
									</option>
								))}
							</select>
						</div>
						<div className="code-snippet-opt-panel">
							<label className="code-snippet-opt-label">Options</label>
							<select
								onChange={onSelectedOption}
								value={option}
								className="code-snippet-opt-select"
							>
								{language &&
									codeSnippetLangunages
										.filter((l) => l.value === language)[0]
										.options.map((opt) => (
											<option key={opt.value} value={opt.value}>
												{opt.name}
											</option>
										))}
							</select>
						</div>
					</div>
					<div className="code-snippet-editor-panel">
						<AceEditor
							value={codeSnippet}
							language={language === "node" ? "javascript" : language}
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

export default CodeSnippetGenerator;
