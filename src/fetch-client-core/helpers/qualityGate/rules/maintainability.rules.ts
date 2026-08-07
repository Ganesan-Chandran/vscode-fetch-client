import { IQGRuleDefinition } from "../qgEngineTypes";

// ─── Maintainability rules ─────────────────────────────────────────────────────
export const maintainabilityRules: IQGRuleDefinition[] = [
	{
		id: "request-name",
		dimension: "Maintainability",
		name: "Request has a meaningful name",
		description: "Fails when the request name is empty.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const hasName = !!input.request.name?.trim();
			return {
				applicable: true,
				passed: hasName,
				severity: hasName ? undefined : "Medium",
				issue: hasName
					? undefined
					: {
							description: "Request name is empty",
							impact:
								"Unnamed requests are difficult to identify in large collections",
							recommendation: "Give every request a meaningful name",
						},
			};
		},
	},
	{
		id: "request-notes",
		dimension: "Maintainability",
		name: "Request contains documentation",
		description: "Fails when the request has no Notes/description.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const hasNotes = !!input.request.notes?.trim();
			return {
				applicable: true,
				passed: hasNotes,
				severity: hasNotes ? undefined : "Low",
				issue: hasNotes
					? undefined
					: {
							description: "Request has no documentation",
							impact:
								"Future developers may not understand the purpose of this request",
							recommendation: "Add request notes or description",
						},
			};
		},
	},
	{
		id: "url-variable",
		dimension: "Maintainability",
		name: "URL uses environment variables",
		description:
			"Fails when the request URL contains no {{variable}} placeholders.",
		defaultSeverity: "Medium",
		evaluate: ({ input }) => {
			const usesVariableUrl = /{{.+?}}/.test(input.request.url);
			return {
				applicable: true,
				passed: usesVariableUrl,
				severity: usesVariableUrl ? undefined : "Medium",
				issue: usesVariableUrl
					? undefined
					: {
							description: "Request URL contains hardcoded values",
							impact: "Changing environments requires editing every request",
							recommendation: "Use variables such as {{baseUrl}}",
						},
			};
		},
	},
	{
		id: "token-variable",
		dimension: "Maintainability",
		name: "Authentication uses variables",
		description:
			"Fails when a Bearer token is hardcoded instead of using a {{variable}}.",
		defaultSeverity: "High",
		evaluate: ({ input }) => {
			const auth = input.request.auth;
			let tokenUsesVariable = true;
			if (auth?.authType === "bearertoken" && auth.password) {
				tokenUsesVariable = auth.password.includes("{{");
			}
			return {
				applicable: true,
				passed: tokenUsesVariable,
				severity: tokenUsesVariable ? undefined : "High",
				issue: tokenUsesVariable
					? undefined
					: {
							description: "Bearer token is hardcoded",
							impact:
								"Tokens expire and cannot easily be shared between environments",
							recommendation:
								"Store tokens in variables such as {{accessToken}}",
						},
			};
		},
	},
	{
		id: "empty-headers",
		dimension: "Maintainability",
		name: "No empty headers",
		description: "Flags enabled headers with an empty key or value.",
		defaultSeverity: "Low",
		evaluate: ({ input }) => {
			const emptyHeaders =
				input.request.headers?.filter(
					(h) => h.isChecked !== false && (!h.key?.trim() || !h.value?.trim()),
				) ?? [];
			const passed = emptyHeaders.length === 0;
			return {
				applicable: true,
				passed,
				severity: passed ? undefined : "Low",
				issue: passed
					? undefined
					: {
							description: `${emptyHeaders.length} empty header(s) found`,
							impact: "Unused headers increase maintenance effort",
							recommendation: "Remove empty or unused headers",
						},
			};
		},
	},
];
