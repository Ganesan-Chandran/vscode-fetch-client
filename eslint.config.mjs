import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default defineConfig([
	globalIgnores([
		"**/out/**",
		"**/dist/**",
		"**/*.d.ts",
		"**/*.config.js",
		"**/*.js",
	]),

	{
		files: ["**/*.ts", "**/*.tsx"],

		plugins: {
			"@typescript-eslint": typescriptEslint,
		},

		languageOptions: {
			parser: tsParser,
			ecmaVersion: 12,
			sourceType: "module",
		},

		rules: {
			"@typescript-eslint/naming-convention": "off",
			curly: "warn",
			eqeqeq: "warn",
			"no-throw-literal": "warn",
			semi: "warn",
		},
	},

	{
		files: ["src/fetch-client-core/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						"**/fetch-client-vscode/**",
						"**/fetch-client-cli/**",
						"**/fetch-client-ui/**",
					],
				},
			],
		},
	},

	{
		files: ["src/fetch-client-cli/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: ["**/fetch-client-vscode/**", "**/fetch-client-ui/**"],
				},
			],
		},
	},

	{
		files: ["src/fetch-client-vscode/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: ["**/fetch-client-cli/**", "**/fetch-client-ui/**"],
				},
			],
		},
	},

	{
		files: ["src/fetch-client-ui/**/*.ts", "src/fetch-client-ui/**/*.tsx"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						"**/fetch-client-vscode/**",
						"**/fetch-client-cli/**",
						"**/fetch-client-packages/**",
					],
				},
			],
		},
	},

	{
		files: ["src/fetch-client-packages/**/*.ts"],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						"**/fetch-client-vscode/**",
						"**/fetch-client-cli/**",
						"**/fetch-client-ui/**",
					],
				},
			],
		},
	},
]);
