import {
	InputData,
	jsonInputForTargetLanguage,
	quicktype,
} from "quicktype-core";

export async function generateJsonSchema(jsonString: string) {
	const jsonInput = jsonInputForTargetLanguage("schema");
	await jsonInput.addSource({ name: "Root", samples: [jsonString] });
	const inputData = new InputData();
	inputData.addInput(jsonInput);
	const result = await quicktype({ inputData, lang: "schema" });
	return result.lines.join("\n");
}
