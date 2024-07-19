import React, { useEffect, useState } from "react";
import { quicktype, InputData, jsonInputForTargetLanguage } from "quicktype-core";
import { MonacoEditor } from "../Editor";
import { codeTypesLangunages } from "./consts";
import { IRootState } from "../../../reducer/combineReducer";
import { useSelector } from "react-redux";

const TypesGenerator = () => {
  const responseData = useSelector((state: IRootState) => state.responseData.response.responseData);

  const [language, setLang] = useState("cs");
  const [editorLanguage, setEditorLang] = useState("csharp");
  const [codeTypes, setCodeTypes] = useState("");

  async function quicktypeJSON(targetLanguage: string, typeName: string, jsonString: string) {
    const jsonInput = jsonInputForTargetLanguage(targetLanguage);

    await jsonInput.addSource({
      name: typeName,
      samples: [jsonString],
    });

    const inputData = new InputData();
    inputData.addInput(jsonInput);
    let rendererOptions = { package: "generated_types", namespace: "Generated_Types" };
    if (targetLanguage === "cs") {
      rendererOptions["features"] = "just-types";
    } else if (targetLanguage === "kotlin")  {
      rendererOptions["framework"] = "just-types";
    } else {
      rendererOptions["just-types"] = "true";
    }

    return await quicktype({
      inputData,
      lang: targetLanguage,
      rendererOptions: rendererOptions,
    });
  }

  useEffect(() => {
    quicktypeJSON(language, "Root", responseData).then((i) => {
      setCodeTypes(i.lines.join("\n"));
    });
  }, []);

  function onSelectedLanguage(e: React.ChangeEvent<HTMLSelectElement>) {
    setLang(e.target.value);
    let editorLang = codeTypesLangunages.filter(i => i.value === e.target.value)[0].editorLang;
    setEditorLang(editorLang);
    quicktypeJSON(e.target.value, "Root", responseData).then((i) => {
      setCodeTypes(i.lines.join("\n"));
    });
  }

  return (
    <div className="code-snippet-panel">
      <hr />
      {codeTypes && <><div className="code-snippet-select-panel">
        <div className="code-snippet-lang-panel">
          <label className="code-snippet-lang-label">Language</label>
          <select
            onChange={onSelectedLanguage}
            value={language}
            className="code-snippet-lang-select"
          >
            {
              codeTypesLangunages.map((lang) => (
                <option key={lang.editorLang} value={lang.value}>
                  {lang.name}
                </option>
              ))
            }
          </select>
        </div>
      </div>
        <div className="code-snippet-editor-panel">
          <MonacoEditor
            value={codeTypes}
            language={editorLanguage}
            readOnly={true}
            copyButtonVisible={true}
            format={true}
          />
        </div>
      </>
      }
    </div>
  );
};

export default TypesGenerator;