import { describe, it, expect } from "vitest";
import { OllamaProvider } from "../../../../../fetch-client-ai-agent/adapters/llm/ollama/ollama-provider";

describe("OllamaProvider integration", () => {
	it("should generate a response using Ollama", async () => {
		const provider = new OllamaProvider({
			baseUrl: "http://localhost:11434",
			model: "qwen2.5-coder:3b",
		});

		const response = await provider.generateResponse(
			[
				{
					id: "msg-1",
					timestamp: Date.now(),
					role: "user",
					content: "Explain HTTP 401 in one sentence.",
				},
			],
			[],
		);

		expect(response.role).toBe("assistant");
		expect(response.content.length).toBeGreaterThan(0);

		console.log(response.content);
	}, 30000);
});
