import React, { useEffect, useState } from "react";
import { Editor, EditorState, CompositeDecorator, Modifier, DraftHandleValue, ContentState, getDefaultKeyBinding, KeyBindingUtil } from "draft-js";
import { useSelector } from "react-redux";
import { IRootState } from "../../../reducer/combineReducer";
import "./style.css";

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

export const TextEditor = (props: TextEditorProps) => {

  const { selectedVariable } = useSelector((state: IRootState) => state.variableData);

  const [charLength, setLength] = useState(0);
  const [curValue, setCurValue] = useState("");
  const [changeHandle, setChangeHandle] = useState(false);

  const editor = React.useRef(null);

  const matchedDecorated = ({ children }) => {
    return <span style={{ color: "rgb(18, 187, 18)" }}>{children}</span>;
  };

  const unmatchedDecorated = ({ children }) => {
    return <span style={{ color: "#f05348" }}>{children}</span>;
  };

  function findWithRegex(words: string[], contentBlock: any, callback: any) {
    const text = contentBlock.getText();

    var regexEx = /{{[\w]+}}/;
    const matches = [...text.matchAll(new RegExp(regexEx, 'gm'))].map(a => { return { index: a.index, word: a[0] }; });

    matches.forEach(match => {
      let word = match.word.replace("{{", "").replace("}}", "").trim();
      if (words.includes(word)) {
        callback(match.index, match.index + match.word.length);
      }
    }
    );
  }

  function findWithRegexUnMatched(words: string[], contentBlock: any, callback: any) {
    const text = contentBlock.getText();

    var regexEx = /{{[\w]+}}/;
    const matches = [...text.matchAll(new RegExp(regexEx, 'gm'))].map(a => { return { index: a.index, word: a[0] }; });

    matches.forEach(match => {
      let word = match.word.replace("{{", "").replace("}}", "").trim();
      if (!words.includes(word)) {
        callback(match.index, match.index + match.word.length);
      }
    }
    );
  }

  function matchedHandleStrategy(contentBlock: any, callback: any) {
    findWithRegex(props.varWords, contentBlock, callback);
  }

  function unmatchedHandleStrategy(contentBlock: any, callback: any) {
    findWithRegexUnMatched(props.varWords, contentBlock, callback);
  }

  const createDecorator = () =>
    new CompositeDecorator([
      {
        strategy: matchedHandleStrategy,
        component: matchedDecorated
      },
      {
        strategy: unmatchedHandleStrategy,
        component: unmatchedDecorated
      }
    ]);

  const [editorState, setEditorState] = React.useState(
    EditorState.createWithContent(ContentState.createFromText(props.value ?? ""), createDecorator())
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

  function focusEditor() {
    if (props.focus) {
      editor.current.focus();
    }
  }

  useEffect(() => {
    if (selectedVariable.data.length > 0) {
      setEditorState(EditorState.set(editorState, { decorator: createDecorator() }));
    }
  }, [selectedVariable]);

  React.useEffect(() => {
    focusEditor();
  }, []);

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
