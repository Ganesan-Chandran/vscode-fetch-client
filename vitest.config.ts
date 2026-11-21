import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["src/**/*.test.ts"],
		exclude: ["**/node_modules/**", "**/.git/**", "**/*.integration.test.ts"],
		environment: "node",
		clearMocks: true,
		restoreMocks: true,
		mockReset: true,
		coverage: {
			include: ["src/**/*.ts"],
			exclude: ["src/**/*.test.ts", "src/**/index.ts"],
		},
	},
});
