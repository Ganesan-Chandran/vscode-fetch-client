export const ActionsParametersMapping = {
	"Content-Type": {
		"action": [
			{ name: "select", value: "", },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "contains", value: "contains" },
			{ name: "regex", value: "regex" },
		]
	},
	"Content-Length": {
		"action": [
			{ name: "select", value: "", },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "regex", value: "regex" },
		]
	},
	"Content-Encoding": {
		"action": [
			{ name: "select", value: "", },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "regex", value: "regex" },
		]
	},
	"Header": {
		"action": [
			{ name: "select", value: "", },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "contains", value: "contains" },
			{ name: "type", value: "type" },
			{ name: "regex", value: "regex" },
		]
	},
	"Response Code": {
		"action": [
			{ name: "select", value: "", },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "<", value: "<" },
			{ name: "<=", value: "<=" },
			{ name: ">", value: ">" },
			{ name: ">=", value: ">=" },
			{ name: "regex", value: "regex" },
		]
	},
	"Response Body": {
		"action": [
			{ name: "select", value: "", },
			{ name: "isJSON", value: "isJSON" },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "contains", value: "contains" },
			{ name: "regex", value: "regex" },
		]
	},
	"Response Time": {
		"action": [
			{ name: "select", value: "", },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "<", value: "<" },
			{ name: "<=", value: "<=" },
			{ name: ">", value: ">" },
			{ name: ">=", value: ">=" },
		]
	},
	"JSON": {
		"action": [
			{ name: "select", value: "", },
			{ name: "equal", value: "equal" },
			{ name: "notEqual", value: "notEqual" },
			{ name: "<", value: "<" },
			{ name: "<=", value: "<=" },
			{ name: ">", value: ">" },
			{ name: ">=", value: ">=" },
			{ name: "contains", value: "contains" },
			{ name: "notContains", value: "notContains" },
			{ name: "length", value: "length" },
			{ name: "type", value: "type" },
			{ name: "regex", value: "regex" },
		]
	},
};

export const ParametersModelMapping = {
	"Response Code": "response.status",
	"Response Body": "response.responseData",
	"Response Time": "response.duration",
	"Content-Type": "headers.Content-Type",
	"Content-Length": "headers.Content-Length",
	"Content-Encoding": "headers.Content-Encoding",
	"Header": "headers.[specific]",
	"JSON": "responseData.[specific]",
	"Variable": "variable"
};

export const TestCaseParameters = [
	{ name: "select", value: "", },
	{ name: "Content-Type", value: "Content-Type", },
	{ name: "Content-Length", value: "Content-Length", },
	{ name: "Content-Encoding", value: "Content-Encoding", },
	{ name: "Header", value: "Header", },
	{ name: "ResponseCode", value: "Response Code", },
	{ name: "ResponseBody", value: "Response Body", },
	{ name: "ResponseTime", value: "Response Time", },
	{ name: "Json Query", value: "JSON", }
];

export const TestValueSuggestions = [
	"string",
	"boolean",
	"number",
	"object",
	"array",
	"true",
	"false",
	"null",
	"undefined"
];
