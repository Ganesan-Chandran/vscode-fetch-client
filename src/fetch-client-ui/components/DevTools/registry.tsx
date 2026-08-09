import {
    Base64Encoder,
    JwtDecoder,
    UrlEncoder,
} from "./encoding";
import {
    JsonFormatter,
    JsonPathTester,
    JsonSchemaGenerator,
    JsonToXml,
    JsonValidator,
    XmlToJson,
} from "./jsonTools";
import {
    RandomDataGenerator,
    TimestampGenerator,
    UuidGenerator,
} from "./generators";
import {
    QueryStringParser,
    UrlParser,
} from "./apiTools";
import {
    HashGenerator,
    HmacGenerator,
    JwtGenerator,
} from "./securityTools";
import { RegexTester } from "./testingTools";
import type { IDevTool, DevToolCategory } from "./devTools.types";

export const categoryLabels: Record<DevToolCategory, string> = {
    encoding: "🔐 Encoding & Decoding",
    json: "📦 JSON & Data",
    generators: "🆔 Generators",
    api: "🌐 API Tools",
    security: "🛡️ Security",
    testing: "🧪 Testing",
};

export const devTools: IDevTool[] = [
    { id: "url-encoder", icon: "🔗", title: "URL Encoder / Decoder", category: "encoding", description: "Encode and decode URL values", component: UrlEncoder },
    { id: "base64", icon: "🔢", title: "Base64 Encoder / Decoder", category: "encoding", description: "Encode and decode Base64", component: Base64Encoder },
    { id: "jwt-decoder", icon: "🎫", title: "JWT Decoder", category: "encoding", description: "Decode JWT header and payload", component: JwtDecoder },

    { id: "json-formatter", icon: "✨", title: "JSON Formatter", category: "json", description: "Format JSON", component: JsonFormatter },
    { id: "json-validator", icon: "✅", title: "JSON Validator", category: "json", description: "Validate JSON", component: JsonValidator },
    { id: "json-schema", icon: "📐", title: "JSON Schema Generator", category: "json", description: "Generate a basic JSON Schema", component: JsonSchemaGenerator },
    { id: "jsonpath", icon: "🔎", title: "JSONPath Tester", category: "json", description: "Test JSONPath expressions", component: JsonPathTester },
    { id: "xml-json", icon: "🔄", title: "XML → JSON", category: "json", description: "Convert XML to JSON", component: XmlToJson },
    { id: "json-xml", icon: "🔄", title: "JSON → XML", category: "json", description: "Convert JSON to XML", component: JsonToXml },

    { id: "uuid", icon: "🆔", title: "UUID Generator", category: "generators", description: "Generate UUID v1, v4 and v7", component: UuidGenerator },
    { id: "timestamp", icon: "⏱️", title: "Timestamp Generator", category: "generators", description: "Convert Unix timestamps", component: TimestampGenerator },
    { id: "random-data", icon: "🎲", title: "Random Data Generator", category: "generators", description: "Generate API test data", component: RandomDataGenerator },

    { id: "url-parser", icon: "🔗", title: "URL Parser", category: "api", description: "Inspect URL components", component: UrlParser },
    { id: "query-parser", icon: "🔎", title: "Query String Parser", category: "api", description: "Parse query parameters", component: QueryStringParser },

    { id: "hash", icon: "#️⃣", title: "Hash Generator", category: "security", description: "Generate SHA hashes", component: HashGenerator },
    { id: "hmac", icon: "🔏", title: "HMAC Generator", category: "security", description: "Generate HMAC signatures", component: HmacGenerator },
    { id: "jwt-generator", icon: "🎫", title: "JWT Generator", category: "security", description: "Generate unsigned JWTs", component: JwtGenerator },

    { id: "regex", icon: "🧪", title: "Regex Tester", category: "testing", description: "Test regular expressions", component: RegexTester },
];
