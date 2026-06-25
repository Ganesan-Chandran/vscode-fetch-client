import "./style.css";
import { checkSysVariable } from "../../../../fetch-client-core/helpers/systemVariable.helper";
import { CompositeDecorator, ContentState, DraftHandleValue, Editor, EditorState, getDefaultKeyBinding, Modifier } from "draft-js";
import { IRootState } from "../../../reducer/combineReducer";
import { replaceDataWithVariable } from "../../../../fetch-client-core/helpers/variable.helper";
import { SysVariables } from "../../../../fetch-client-core/consts/systemVariables.consts";
import { useSelector } from "react-redux";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface TextEditorProps {
	varWords: string[];
	focus: boolean;
	className?: string;
	value?: string;
	placeholder?: string;
	maxLength?: number;
	disabled?: boolean;
	onChange?: any;
	onKeyPress?: any;
	onBlur?: any;
	onFocus?: any;
}

const VAR_REGEX = /{{[A-Za-z0-9\s!@#$%^&*()_+=-`~\\\]\[|';:\/.,?><]+}}/g;
const SYS_VAR_REGEX = /(({{#)((num|str|char|rdate|date|dateISO|email|guid|bool)|(num,[ ]?[0-9]+,[ ]?[0-9]+)|(date,( )*[a-zA-Z $&+,:;=?@#|'<>.^*()%!-\/]*))(}}))/g;

export const TextEditor = (props: TextEditorProps) => {

	const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

	const [charLength, setLength] = useState(0);
	const [curValue, setCurValue] = useState("");
	const [changeHandle, setChangeHandle] = useState(false);

	const refVarData = useRef({});
	const setVarData = (value: {}) => {
		refVarData.current = value;
	};

	const editor = React.useRef(null);

	const varWordsRef = useRef(props.varWords);
	useEffect(() => {
		varWordsRef.current = props.varWords;
	}, [props.varWords]);

	const matchedDecorated = useCallback((props: any) => {
		if (!checkSysVariable(props.decoratedText)) {
			let title = replaceDataWithVariable(props.decoratedText, refVarData.current);
			if (title) {
				return <span style={{ color: "rgb(18, 187, 18)" }} title={title}>{props.children}</span>;
			}
		}
		return <span style={{ color: "rgb(18, 187, 18)" }}>{props.children}</span>;
	}, []);

	const unmatchedDecorated = useCallback(({ children }) => {
		return <span style={{ color: "#f05348" }}>{children}</span>;
	}, []);

	function findWithRegex(words: string[], contentBlock: any, callback: any) {
		const text = contentBlock.getText();
		const matches = [...text.matchAll(VAR_REGEX)].map(a => ({ index: a.index, word: a[0] }));
		const sysVarMatches = [...text.matchAll(SYS_VAR_REGEX)].map(a => ({ index: a.index, word: a[0] }));

		matches.forEach(match => {
			const word = match.word.replace("{{", "").replace("}}", "").trim();
			if (words.includes(word)) {
				callback(match.index, match.index + match.word.length);
			}
		});

		sysVarMatches.forEach(match => {
			if (SysVariables.includes(match.word) || match.word.includes("{{#num,") || match.word.includes("{{#date,")) {
				callback(match.index, match.index + match.word.length);
			}
		});
	}

	function findWithRegexUnMatched(words: string[], contentBlock: any, callback: any) {
		const text = contentBlock.getText();
		const matches = [...text.matchAll(VAR_REGEX)].map(a => ({ index: a.index, word: a[0] }));
		const sysVarMatches = [...text.matchAll(SYS_VAR_REGEX)].map(a => ({ index: a.index, word: a[0] }));

		matches.forEach(match => {
			const word = match.word.replace("{{", "").replace("}}", "").trim();
			if (!words.includes(word)) {
				callback(match.index, match.index + match.word.length);
			}
		});

		sysVarMatches.forEach(match => {
			if (!SysVariables.includes(match.word) && !match.word.includes("{{#num,") && !match.word.includes("{{#date,")) {
				callback(match.index, match.index + match.word.length);
			}
		});
	}

	const matchedHandleStrategy = useCallback((contentBlock: any, callback: any) => {
		findWithRegex(varWordsRef.current, contentBlock, callback);
	}, []);

	const unmatchedHandleStrategy = useCallback((contentBlock: any, callback: any) => {
		findWithRegexUnMatched(varWordsRef.current, contentBlock, callback);
	}, []);

	const decorator = useMemo(() =>
		new CompositeDecorator([
			{ strategy: matchedHandleStrategy, component: matchedDecorated },
			{ strategy: unmatchedHandleStrategy, component: unmatchedDecorated }
		]),
		[matchedHandleStrategy, unmatchedHandleStrategy, matchedDecorated, unmatchedDecorated]
	);

	const [editorState, setEditorState] = React.useState(
		EditorState.createWithContent(ContentState.createFromText(props.value ?? ""), decorator)
	);

	useEffect(() => {
		if (props.value !== curValue) {

			setChangeHandle(false);

			let currentContent = editorState.getCurrentContent();

			let selection = editorState.getSelection().merge({
				anchorKey: currentContent.getFirstBlock().getKey(),
				anchorOffset: 0,
				focusOffset: currentContent.getLastBlock().getText().length,
				focusKey: currentContent.getLastBlock().getKey(),
			});

			handleChange(EditorState.push(
				editorState,
				Modifier.replaceText(
					currentContent,
					selection,
					props.value),
				editorState.getLastChangeType(),
			));
		}
	}, [props.value]);

	const focusEditor = React.useCallback(() => {
		if (props.focus) {
			editor.current?.focus();
		}
	}, [props.focus]);

	useEffect(() => {
		if (selectedVariable.data.length > 0) {
			const varData = {};
			selectedVariable.data.forEach(item => {
				varData[item.key] = item.value;
			});
			setVarData(varData);

			setEditorState(prev => EditorState.set(prev, { decorator }));
		}
	}, [selectedVariable, decorator]);

	React.useEffect(() => {
		focusEditor();
	}, []);

	React.useEffect(() => {
		focusEditor();
	}, [focusEditor]);

	const handlePaste = (text: string, _html: string | undefined, editorState: EditorState): DraftHandleValue => {
		if (props.maxLength) {
			const totalLength = charLength + text.length;

			if (totalLength > props.maxLength) {
				text = text.trim().replace(/\n/g, ' ').substring(0, props.maxLength);
			}
		}
		handleChange(EditorState.push(
			editorState,
			Modifier.replaceText(
				editorState.getCurrentContent(),
				editorState.getSelection(),
				text.replace(/\n/g, ' ')),
			editorState.getLastChangeType(),
		));

		return 'handled';
	};

	const handleChange = (changeEditorState: EditorState) => {

		if (changeEditorState === editorState) {
			return;
		}

		setEditorState(changeEditorState);

		let hasText = changeEditorState.getCurrentContent().hasText();
		let text = "";

		if (hasText) {
			text = changeEditorState.getCurrentContent().getPlainText('\u0001');
		}

		if (props.onChange && changeHandle) {
			props.onChange(text);
		}

		setCurValue(text);
		setLength(text.length);
		setChangeHandle(true);
	};

	function handleBeforeInput(chars: string, _changeEditorState: EditorState, _eventTimeStamp: number) {
		if (!props.maxLength) {
			return 'not-handled';
		}
		const totalLength = charLength + chars.length;
		return totalLength > props.maxLength ? 'handled' : 'not-handled';
	}

	function myKeyBindingFn(e: any): string | null {
		if (props.onKeyPress) {
			props.onKeyPress(e.keyCode);
		}

		if (e.keyCode === 13) {
			return 'enter_command';
		}

		return getDefaultKeyBinding(e);
	}

	return (
		<div className="outer-container">
			<div onClick={focusEditor}>
				<Editor
					ref={editor}
					editorState={editorState}
					onChange={handleChange}
					handlePastedText={handlePaste}
					placeholder={props.placeholder}
					keyBindingFn={myKeyBindingFn}
					handleBeforeInput={handleBeforeInput}
					readOnly={props.disabled}
					onBlur={props.onBlur}
					onFocus={props.onFocus}
				/>
			</div>
		</div>
	);
};
