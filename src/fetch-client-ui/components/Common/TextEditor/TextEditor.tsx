import "./style.css";
import React, {
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { useSelector } from "react-redux";
import {
	$createParagraphNode,
	$createTextNode,
	$getRoot,
	$getSelection,
	$isParagraphNode,
	$isRangeSelection,
	BLUR_COMMAND,
	COMMAND_PRIORITY_HIGH,
	COMMAND_PRIORITY_LOW,
	DecoratorNode,
	EditorConfig,
	FOCUS_COMMAND,
	INSERT_LINE_BREAK_COMMAND,
	KEY_ENTER_COMMAND,
	LexicalNode,
	NodeKey,
	PASTE_COMMAND,
	SerializedLexicalNode,
	Spread,
	TextNode,
} from "lexical";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { IRootState } from "../../../reducer/combineReducer";
import { checkSysVariable } from "../../../../fetch-client-core/helpers/systemVariable.helper";
import { replaceDataWithVariable } from "../../../../fetch-client-core/helpers/variable.helper";

export interface TextEditorProps {
	varWords: string[];
	focus: boolean;
	className?: string;
	value?: string;
	placeholder?: string;
	maxLength?: number;
	disabled?: boolean;
	onChange?: (value: string) => void;
	onKeyPress?: (keyCode: number) => void;
	onBlur?: () => void;
	onFocus?: () => void;
}

// ─── Regex ──────────────────────────────────────────────────────────────────
const VAR_REGEX = /{{[A-Za-z0-9\s!@#$%^&*()_+\-=`~\\\]\[|';:\/.,?><]+}}/g;

// Tag used to mark programmatic editor updates so onChange is not called
const EXTERNAL_TAG = "fc-external";

// ─── Context for variable data (tooltip support) ────────────────────────────
const VarDataContext = React.createContext<Record<string, string>>({});

// ─── VariableNode ─────────────────────────────────────────────────────────
type VariableStatus = "valid" | "invalid";

type SerializedVariableNode = Spread<
	{ text: string; status: VariableStatus },
	SerializedLexicalNode
>;

export class VariableNode extends DecoratorNode<React.ReactElement> {
	__text: string;
	__status: VariableStatus;

	static override getType(): string {
		return "variable";
	}

	static override clone(node: VariableNode): VariableNode {
		return new VariableNode(node.__text, node.__status, node.__key);
	}

	static override importJSON(serialized: SerializedVariableNode): VariableNode {
		return new VariableNode(serialized.text, serialized.status);
	}

	constructor(text: string, status: VariableStatus, key?: NodeKey) {
		super(key);
		this.__text = text;
		this.__status = status;
	}

	override exportJSON(): SerializedVariableNode {
		return {
			...super.exportJSON(),
			type: "variable",
			version: 1,
			text: this.__text,
			status: this.__status,
		};
	}

	override createDOM(_config: EditorConfig): HTMLElement {
		return document.createElement("span");
	}

	override updateDOM(): boolean {
		return false;
	}

	override isInline(): boolean {
		return true;
	}

	override isKeyboardSelectable(): boolean {
		return true;
	}

	override getTextContent(): string {
		return this.__text;
	}

	override decorate(): React.ReactElement {
		return <VariableSpan text={this.__text} status={this.__status} />;
	}
}

function $createVariableNode(
	text: string,
	status: VariableStatus,
): VariableNode {
	return new VariableNode(text, status);
}

function $isVariableNode(
	node: LexicalNode | null | undefined,
): node is VariableNode {
	return node instanceof VariableNode;
}

// ─── VariableSpan ────────────────────────────────────────────────────────────
// Rendered by DecoratorNode.decorate(). Uses VarDataContext for tooltips.
function VariableSpan({
	text,
	status,
}: {
	text: string;
	status: VariableStatus;
}) {
	const varData = useContext(VarDataContext);
	const color = status === "invalid" ? "#f05348" : "rgb(18, 187, 18)";

	let title: string | undefined;
	if (status === "valid" && !checkSysVariable(text)) {
		const resolved = replaceDataWithVariable(text, varData);
		if (resolved && resolved !== text) {
			title = resolved;
		}
	}

	return (
		<span style={{ color }} title={title}>
			{text}
		</span>
	);
}

// ─── Helper ──────────────────────────────────────────────────────────────────
function getVariableStatus(token: string, varWords: string[]): VariableStatus {
	if (checkSysVariable(token)) {
		return "valid";
	}
	const varName = token.slice(2, -2).trim();
	return varWords.includes(varName) ? "valid" : "invalid";
}

// ─── VariablePlugin ────────────────────────────────────────────────────────
// Transforms TextNodes containing {{...}} into VariableNodes.
// Re-evaluates existing VariableNodes when varWords change.
function VariablePlugin({ varWords }: { varWords: string[] }) {
	const [editor] = useLexicalComposerContext();
	const varWordsRef = useRef(varWords);

	// Keep ref current so the transform closure always reads the latest varWords
	useEffect(() => {
		varWordsRef.current = varWords;
	});

	// Re-color existing VariableNodes when varWords change
	useEffect(() => {
		editor.update(
			() => {
				const root = $getRoot();
				for (const child of root.getChildren()) {
					if ($isParagraphNode(child)) {
						for (const node of child.getChildren()) {
							if ($isVariableNode(node)) {
								const newStatus = getVariableStatus(node.__text, varWords);
								if (newStatus !== node.__status) {
									node.replace($createVariableNode(node.__text, newStatus));
								}
							}
						}
					}
				}
			},
			{ tag: EXTERNAL_TAG },
		);
	}, [editor, varWords]);

	// Transform TextNodes: split on the first variable match.
	// Lexical re-runs the transform on newly created TextNodes until stable.
	useEffect(() => {
		return editor.registerNodeTransform(TextNode, (node) => {
			const text = node.getTextContent();
			VAR_REGEX.lastIndex = 0;
			const match = VAR_REGEX.exec(text);
			if (!match) {
				return;
			}

			const before = text.slice(0, match.index);
			const varToken = match[0];
			const after = text.slice(match.index + varToken.length);

			const status = getVariableStatus(varToken, varWordsRef.current);
			const varNode = $createVariableNode(varToken, status);

			if (before) {
				node.insertBefore($createTextNode(before));
			}
			node.insertBefore(varNode);

			if (after) {
				node.replace($createTextNode(after));
			} else {
				node.remove();
			}
		});
	}, [editor]);

	return null;
}

// ─── SingleLinePlugin ──────────────────────────────────────────────────────
// Prevents Enter/newlines; strips newlines on paste; respects maxLength.
function SingleLinePlugin({
	onKeyPress,
	maxLength,
	textLengthRef,
}: {
	onKeyPress?: (keyCode: number) => void;
	maxLength?: number;
	textLengthRef: React.MutableRefObject<number>;
}) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const unregEnter = editor.registerCommand(
			KEY_ENTER_COMMAND,
			(e: KeyboardEvent | null) => {
				if (e) {
					e.preventDefault();
				}
				onKeyPress?.(13);
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);

		const unregLineBreak = editor.registerCommand(
			INSERT_LINE_BREAK_COMMAND,
			() => true,
			COMMAND_PRIORITY_HIGH,
		);

		const unregPaste = editor.registerCommand(
			PASTE_COMMAND,
			(e: ClipboardEvent | InputEvent | null) => {
				if (!e) {
					return false;
				}
				e.preventDefault();

				let text = "";
				if (e instanceof ClipboardEvent) {
					text = e.clipboardData?.getData("text/plain") ?? "";
				} else if (e instanceof InputEvent) {
					text = e.data ?? "";
				}

				text = text.replace(/[\n\r]/g, " ");

				if (maxLength) {
					const remaining = maxLength - textLengthRef.current;
					if (remaining <= 0) {
						return true;
					}
					text = text.slice(0, remaining);
				}

				const selection = $getSelection();
				if ($isRangeSelection(selection)) {
					selection.insertText(text);
				}
				return true;
			},
			COMMAND_PRIORITY_HIGH,
		);

		return () => {
			unregEnter();
			unregLineBreak();
			unregPaste();
		};
	}, [editor, onKeyPress, maxLength, textLengthRef]);

	return null;
}

// ─── SetValuePlugin ────────────────────────────────────────────────────────
// Pushes external value changes into the editor without triggering onChange.
// Compares against the live editor text so that a parent echoing back the
// user's own keystroke (props.onChange → setState → props.value) does NOT
// reset the editor (which would move the cursor to position 0).
function SetValuePlugin({ value }: { value: string }) {
	const [editor] = useLexicalComposerContext();
	const isFirstRender = useRef(true);

	useEffect(() => {
		// Skip first render - initial value was set via initialConfig
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}

		// Read what the editor currently contains
		const currentText = editor
			.getEditorState()
			.read(() => $getRoot().getTextContent());

		// If the incoming value already matches the editor, the parent is just
		// echoing back a user-typed change - no reset needed.
		if (value === currentText) {
			return;
		}

		editor.update(
			() => {
				const root = $getRoot();
				root.clear();
				const paragraph = $createParagraphNode();
				paragraph.append($createTextNode(value));
				root.append(paragraph);
				// Place cursor at the end after external replacement
				const rootElement = editor.getRootElement();
				if (rootElement && rootElement === document.activeElement) {
					paragraph.selectEnd();
				}
			},
			{ tag: EXTERNAL_TAG },
		);
	}, [editor, value]);

	return null;
}

// ─── FocusPlugin ───────────────────────────────────────────────────────────
function FocusPlugin({ focus }: { focus: boolean }) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		if (focus) {
			editor.focus();
		}
	}, [editor, focus]);

	return null;
}

// ─── BlurFocusPlugin ───────────────────────────────────────────────────────
function BlurFocusPlugin({
	onBlur,
	onFocus,
}: {
	onBlur?: () => void;
	onFocus?: () => void;
}) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		const unregBlur = editor.registerCommand(
			BLUR_COMMAND,
			() => {
				onBlur?.();
				return false;
			},
			COMMAND_PRIORITY_LOW,
		);

		const unregFocus = editor.registerCommand(
			FOCUS_COMMAND,
			() => {
				onFocus?.();
				return false;
			},
			COMMAND_PRIORITY_LOW,
		);

		return () => {
			unregBlur();
			unregFocus();
		};
	}, [editor, onBlur, onFocus]);

	return null;
}

// ─── EditablePlugin ────────────────────────────────────────────────────────
function EditablePlugin({ disabled }: { disabled?: boolean }) {
	const [editor] = useLexicalComposerContext();

	useEffect(() => {
		editor.setEditable(!disabled);
	}, [editor, disabled]);

	return null;
}

// ─── TextEditor ────────────────────────────────────────────────────────────
export const TextEditor = (props: TextEditorProps) => {
	const { selectedVariable } = useSelector(
		(state: IRootState) => state.variableData,
	);

	const [varData, setVarData] = useState<Record<string, string>>({});
	const textLengthRef = useRef(0);

	useEffect(() => {
		if (selectedVariable.data.length > 0) {
			const data: Record<string, string> = {};
			selectedVariable.data.forEach((item) => {
				data[item.key] = item.value;
			});
			setVarData(data);
		}
	}, [selectedVariable]);

	// Capture initial value once so initialConfig dep array stays empty
	const initialValueRef = useRef(props.value ?? "");

	// LexicalComposer only reads initialConfig on mount
	const initialConfig = useRef({
		namespace: "TextEditor",
		nodes: [VariableNode],
		onError: (error: Error) => console.error(error),
		editorState: () => {
			const paragraph = $createParagraphNode();
			paragraph.append($createTextNode(initialValueRef.current));
			$getRoot().append(paragraph);
		},
	}).current;

	const handleChange = useCallback(
		(editorState: any, _editor: any, tags: Set<string>) => {
			if (tags.has(EXTERNAL_TAG)) {
				return;
			}

			editorState.read(() => {
				const text = $getRoot().getTextContent();
				textLengthRef.current = text.length;
				props.onChange?.(text);
			});
		},
		[props.onChange],
	);

	return (
		<VarDataContext.Provider value={varData}>
			<div className="outer-container">
				<LexicalComposer initialConfig={initialConfig}>
					<div className="DraftEditor-root">
						<PlainTextPlugin
							contentEditable={
								<ContentEditable
									className={`DraftEditor-editorContainer${
										props.className ? " " + props.className : ""
									}`}
								/>
							}
							placeholder={
								props.placeholder ? (
									<div className="public-DraftEditorPlaceholder-inner">
										{props.placeholder}
									</div>
								) : null
							}
							ErrorBoundary={LexicalErrorBoundary}
						/>
					</div>
					<HistoryPlugin />
					<OnChangePlugin ignoreSelectionChange onChange={handleChange} />
					<VariablePlugin varWords={props.varWords} />
					<SingleLinePlugin
						onKeyPress={props.onKeyPress}
						maxLength={props.maxLength}
						textLengthRef={textLengthRef}
					/>
					<SetValuePlugin value={props.value ?? ""} />
					<FocusPlugin focus={props.focus} />
					<BlurFocusPlugin onBlur={props.onBlur} onFocus={props.onFocus} />
					<EditablePlugin disabled={props.disabled} />
				</LexicalComposer>
			</div>
		</VarDataContext.Provider>
	);
};
