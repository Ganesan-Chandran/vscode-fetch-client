import { XMLParser } from "fast-xml-parser";

// handles nested elements, arrays (repeated tags), attributes, text nodes, empty/self-closing tags
export function convertXmlToJson(xmlString: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    isArray: () => false, // let fast-xml-parser auto-detect repeats as arrays
  });
  const parsed = parser.parse(xmlString);
  return JSON.stringify(parsed, null, 2);
}
