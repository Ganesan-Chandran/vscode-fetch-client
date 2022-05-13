import React from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useEffect, useRef, useState } from "react";
import "./style.css";
import { EditorProps } from ".";

const EditorProvider = (props: EditorProps) => {

  const editorElement = useRef<HTMLDivElement>(null);

  const [copyText, setCopyText] = useState("Copy");
  const [monacoEditor, setMonacoEditor] = useState<monaco.editor.IStandaloneCodeEditor>();

  function onCopyClick() {
    navigator.clipboard.writeText(props.value)
      .then(() => {
        setCopyText("Copied");
        setTimeout(() => setCopyText("Copy"), 1000);
      });
  }

  useEffect(() => {
    if (editorElement.current) {
      const tmpEditor = monaco.editor.create(editorElement.current, {
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        theme: props.theme === 1 ? 'vs' : (props.theme === 2 ? "vs-dark" : "hc-black"),
        value: props.value,
        language: props.language,
        readOnly: props.readOnly,
        automaticLayout: true,
        formatOnType: true,
        formatOnPaste: true,
        renderLineHighlight: "none"
      });

      window.addEventListener("resize", () => {
        tmpEditor.layout();
      });

      tmpEditor.onDidChangeModelContent(() => {
        props.onContentChange && props.onContentChange(tmpEditor.getValue());
      });

      if (props.value) {
        formatContent(tmpEditor);
      }

      setMonacoEditor(tmpEditor);

      return () => {
        monacoEditor && monacoEditor.dispose();
      };
    }
  }, []);

  useEffect(() => {
    if (monacoEditor) {
      const model = monacoEditor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, props.language);
        formatContent(monacoEditor);
      }
    }
  }, [props.language, props.format, props.value]);

  useEffect(() => {
    if (monacoEditor) {
      if (props.readOnly) {
        monacoEditor.setValue(props.value);
      }
    }
  }, [props.value]);

  const formatContent = (monacoEditor: monaco.editor.IStandaloneCodeEditor) => {
    if (props.format) {
      monacoEditor.updateOptions({ readOnly: false });
      setTimeout(() => {
        monacoEditor
          .getAction("editor.action.formatDocument")
          .run()
          .then(() => {
            monacoEditor.updateOptions({ readOnly: props.readOnly });
          });
      }, 250);
    }
  };

  return (
    <div className={"editor" + " " + props.className} ref={editorElement}>
      {props.copyButtonVisible && (
        <button
          onClick={onCopyClick}
          className="copy-button"
        >
          {copyText}
        </button>
      )}
    </div>
  );
};

export default EditorProvider;