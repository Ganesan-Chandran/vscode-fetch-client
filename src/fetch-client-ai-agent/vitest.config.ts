import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		include: ["__tests__/**/*.test.ts"],
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
