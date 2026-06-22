import "./style.css";
import {
	CompositeDecorator,
	ContentState,
	DraftHandleValue,
	Editor,
	EditorState,
	getDefaultKeyBinding,
	Modifier,
} from "draft-js";
import { IRootState } from "../../../reducer/combineReducer";
import { replaceDataWithVariable } from "../../../../utils/helper";
import { SysVariables } from "../../../../fetch-client-core/consts/sysvariables.consts";
import { useSelector } from "react-redux";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { checkSysVariable } from "../Consts/sysVariables";

export interface TextEditorProps {
	varWords: string[];
	focus: boolean;
	className?: string;
	value?: string;
	placeholder?: string;
	maxLength?: number;
	disabled?: boolean;
	onChange?: (text: string) => void;
	onKeyPress?: (keyCode: number) => void;
	onBlur?: () => void;
	onFocus?: () => void;
}

const VAR_PATTERN = /{{[A-Za-z0-9\s!@#$%^&*()_+=-`~\\\]\[|';:\/.,?><]+}}/g;

const SYS_VAR_PATTERN =
	/(({{#)((num|str|char|rdate|date|dateISO|email|guid|bool)|(num,[ ]?[0-9]+,[ ]?[0-9]+)|(date,( )*[a-zA-Z $&+,:;=?@#|'<>.^*()%!-\/]*))(}}))/g;

function isSysVarMatch(word: string): boolean {
	return (
		SysVariables.includes(word) ||
		word.includes("{{#num,") ||
		word.includes("{{#date,")
	);
}

function MatchedSpan({
	decoratedText,
	varData,
	children,
}: {
	decoratedText: string;
	varData: Record<string, string>;
	children: React.ReactNode;
}) {
	const title =
		!checkSysVariable(decoratedText)
			? replaceDataWithVariable(decoratedText, varData) ?? undefined
			: undefined;

	return (
		<span style={{ color: "rgb(18, 187, 18)" }} title={title}>
			{children}
		</span>
	);
}

function UnmatchedSpan({ children }: { children: React.ReactNode }) {
	return <span style={{ color: "#f05348" }}>{children}</span>;
}

type CallbackFn = (start: number, end: number) => void;

function collectVarMatches(text: string): Array<{ index: number; word: string }> {
	return [...text.matchAll(VAR_PATTERN)].map((m) => ({
		index: m.index!,
		word: m[0],
	}));
}

function collectSysVarMatches(text: string): Array<{ index: number; word: string }> {
	return [...text.matchAll(SYS_VAR_PATTERN)].map((m) => ({
		index: m.index!,
		word: m[0],
	}));
}

function varWordFromMatch(raw: string): string {
	return raw.replace(/^{{/, "").replace(/}}$/, "").trim();
}

export const TextEditor = (props: TextEditorProps) => {
	const { varWords, focus, value = "", maxLength, disabled, placeholder, onChange, onKeyPress, onBlur, onFocus } = props;

	const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

	const varDataRef = useRef<Record<string, string>>({});

	const editorRef = useRef<Editor>(null);

	const lastExternalValueRef = useRef<string>(value);

	const matchedStrategy = useCallback(
		(contentBlock: any, callback: CallbackFn) => {
			const text: string = contentBlock.getText();

			for (const match of collectVarMatches(text)) {
				const word = varWordFromMatch(match.word);
				if (varWords.includes(word)) {
					callback(match.index, match.index + match.word.length);
				}
			}

			for (const match of collectSysVarMatches(text)) {
				if (isSysVarMatch(match.word)) {
					callback(match.index, match.index + match.word.length);
				}
			}
		},
		[varWords]
	);

	const unmatchedStrategy = useCallback(
		(contentBlock: any, callback: CallbackFn) => {
			const text: string = contentBlock.getText();

			for (const match of collectVarMatches(text)) {
				const word = varWordFromMatch(match.word);
				if (!varWords.includes(word)) {
					callback(match.index, match.index + match.word.length);
				}
			}

			for (const match of collectSysVarMatches(text)) {
				if (!isSysVarMatch(match.word)) {
					callback(match.index, match.index + match.word.length);
				}
			}
		},
		[varWords]
	);

	const MatchedComponent = useCallback(
		(componentProps: any) => (
			<MatchedSpan
				decoratedText={componentProps.decoratedText}
				varData={varDataRef.current}
			>
				{componentProps.children}
			</MatchedSpan>
		),
		[]
	);

	const decorator = useMemo(
		() =>
			new CompositeDecorator([
				{ strategy: matchedStrategy, component: MatchedComponent },
				{ strategy: unmatchedStrategy, component: UnmatchedSpan },
			]),
		[matchedStrategy, MatchedComponent, unmatchedStrategy]
	);

	const [editorState, setEditorState] = useState(() =>
		EditorState.createWithContent(
			ContentState.createFromText(value),
			decorator
		)
	);

	const getPlainText = (state: EditorState): string => {
		const content = state.getCurrentContent();
		return content.hasText() ? content.getPlainText("\u0001") : "";
	};

	const replaceAllContent = useCallback(
		(state: EditorState, newText: string): EditorState => {
			const currentContent = state.getCurrentContent();
			const fullSelection = currentContent.getSelectionAfter().merge({
				anchorKey: currentContent.getFirstBlock().getKey(),
				anchorOffset: 0,
				focusKey: currentContent.getLastBlock().getKey(),
				focusOffset: currentContent.getLastBlock().getText().length,
			});

			return EditorState.push(
				state,
				Modifier.replaceText(currentContent, fullSelection, newText),
				state.getLastChangeType()
			);
		},
		[]
	);

	const handleChange = useCallback(
		(nextState: EditorState, notifyParent = true) => {
			setEditorState(nextState);

			const text = getPlainText(nextState);
			lastExternalValueRef.current = text;

			if (notifyParent && onChange) {
				onChange(text);
			}
		},
		[onChange]
	);

	useEffect(() => {
		if (value === lastExternalValueRef.current) { return; }

		lastExternalValueRef.current = value;
		setEditorState((prev) => replaceAllContent(prev, value));
	}, [value, replaceAllContent]);

	useEffect(() => {
		setEditorState((prev) => EditorState.set(prev, { decorator }));
	}, [decorator]);

	useEffect(() => {
		if (!selectedVariable?.data?.length) { return; }

		const nextData: Record<string, string> = {};
		for (const item of selectedVariable.data) {
			nextData[item.key] = item.value;
		}
		varDataRef.current = nextData;

		setEditorState((prev) => EditorState.set(prev, { decorator }));
	}, [selectedVariable, decorator]);

	useEffect(() => {
		if (focus) {
			editorRef.current?.focus();
		}
	}, []);

	const handlePaste = useCallback(
		(text: string, _html: string | undefined, state: EditorState): DraftHandleValue => {
			let sanitised = text.replace(/\n/g, " ");

			if (maxLength) {
				const currentLength = getPlainText(state).length;
				const available = maxLength - currentLength;
				if (available <= 0) { return "handled"; }
				if (sanitised.length > available) {
					sanitised = sanitised.substring(0, available);
				}
			}

			handleChange(
				EditorState.push(
					state,
					Modifier.replaceText(
						state.getCurrentContent(),
						state.getSelection(),
						sanitised
					),
					state.getLastChangeType()
				)
			);

			return "handled";
		},
		[handleChange, maxLength]
	);

	const handleBeforeInput = useCallback(
		(chars: string, _state: EditorState): DraftHandleValue => {
			if (!maxLength) { return "not-handled"; }

			const currentLength = getPlainText(editorState).length;
			return currentLength + chars.length > maxLength ? "handled" : "not-handled";
		},
		[editorState, maxLength]
	);

	const keyBindingFn = useCallback(
		(e: React.KeyboardEvent): string | null => {
			onKeyPress?.(e.keyCode);

			if (e.keyCode === 13) { return "enter_command"; }

			return getDefaultKeyBinding(e);
		},
		[onKeyPress]
	);

	const focusEditor = useCallback(() => {
		if (focus) { editorRef.current?.focus(); }
	}, [focus]);

	return (
		<div className={`outer-container${props.className ? ` ${props.className}` : ""}`}>
			<div onClick={focusEditor}>
				<Editor
					ref={editorRef}
					editorState={editorState}
					onChange={handleChange}
					handlePastedText={handlePaste}
					placeholder={placeholder}
					keyBindingFn={keyBindingFn}
					handleBeforeInput={handleBeforeInput}
					readOnly={disabled}
					onBlur={onBlur}
					onFocus={onFocus}
				/>
			</div>
		</div>
	);
};