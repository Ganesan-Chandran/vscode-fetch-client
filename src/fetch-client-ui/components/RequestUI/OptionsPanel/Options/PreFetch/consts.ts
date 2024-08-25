export const preConditions = [
	{ name: "parameter", value: "", },
	{ name: "No Condition", value: "noCondition", },
	{ name: "ResponseCode", value: "Response Code", },
	{ name: "ResponseBody", value: "Response Body", },
	{ name: "Variable", value: "Variable", }
];

export const preConditionActions = {
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
	"Variable": {
		"action": [
			{ name: "select", value: "", },
			{ name: "empty", value: "empty" },
			{ name: "notEmpty", value: "notEmpty" },
		]
	}
};
