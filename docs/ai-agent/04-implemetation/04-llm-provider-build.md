# Day 13 --- Model Providers and First Model Call

**Phase:** Phase 2 --- Model providers and first model call\
**Session:** 13\
**Date:** 21 November 2026\
**Status:** Implementation and tests completed;

## Objective

Build a provider-independent LLM integration by implementing the first concrete provider, `OllamaProvider`, using native TypeScript `fetch` rather than an external Agent SDK.

## Existing contracts reused

The implementation reuses the existing Agent contracts instead of introducing duplicate request/response abstractions:

- `ILLMProvider` --- provider contract with `generateResponse(messages, tools, signal)`.
- `AgentMessage` --- internal conversation message union.
- `ToolDefinition` --- tool descriptions exposed to the model.
- `LLMAssistantOutput` --- normalized assistant output returned by a provider.
- `LLMToolRequest` --- tool-call representation containing only `id`, `toolName`, and `arguments`.
- `LLMProviderError` --- normalized provider error with an `LLMErrorKind`.

The provider contract requires forwarding `AbortSignal`, avoiding mutation of input messages and tools, and excluding internal tool-call lifecycle fields from the provider wire format.

## Implementation

Implemented the first provider, `OllamaProvider`, against the Ollama `/api/chat` endpoint.

### Provider configuration

`OllamaProviderOptions` supports:

- `baseUrl` --- Ollama server base URL.
- `model` --- model name, for example `qwen2.5-coder:3b`.
- `fetch` --- optional injected fetch implementation for deterministic unit tests.

### Request handling

The provider:

1. Maps Agent messages into Ollama chat messages.
2. Maps tool definitions into Ollama function-tool definitions.
3. Omits the `tools` property when no tools are supplied.
4. Sends a POST request to `/api/chat`.
5. Uses `stream: false`.
6. Forwards the optional `AbortSignal`.
7. Normalizes the base URL to avoid duplicate trailing slashes.

### Response handling

The provider:

- Parses the Ollama response.
- Validates the response body, assistant message, role, content, and tool-call structure.
- Validates tool-call names and arguments.
- Converts Ollama tool calls into `LLMToolRequest` values and generates internal IDs.
- Returns the normalized `LLMAssistantOutput` shape.

### Error handling

Provider failures are normalized using `LLMProviderError`:

Condition Error kind

---

HTTP 429 `rate_limit` Other non-success HTTP status `unknown` Network/fetch failure `network` Aborted request `aborted` Invalid JSON or malformed response `invalid_response`

## Testing

### Unit tests

The Ollama provider unit test suite contains **29 tests**. The broader test run also included the existing HTTP client, tool executor, and Agent orchestrator suites.

Recorded broader test run:

Test file Tests

---

Ollama provider 29 HTTP client 16 Tool executor 4 Agent orchestrator 33 **Total** **82**

**Result:** 4 test files passed; 82 tests passed; 0 failures.

Unit tests use an injected/mock `fetch`, so they do not require Ollama to be installed or running in CI.

### Real Ollama integration test

A separate integration test was run against the local Ollama server using the configured model `qwen2.5-coder:3b`.

Test: `src/test/ai-agent/adapters/llm/ollama/ollama.integration.test.ts`

Observed result:

- 1 integration test passed.
- 0 failures.
- Test duration: approximately 2.3 seconds.
- Total Vitest run duration: approximately 2.78 seconds.

The model returned a response explaining HTTP 401. This confirms that the provider made a real request to Ollama, received a model response, parsed it, and returned the provider output.

This test verifies the provider-to-Ollama integration only. It does **not** verify the complete Agent orchestrator-to-provider flow.

## CI testing strategy

Ollama is not available by default in the normal GitHub Actions environment. Therefore:

- Run unit tests in the normal PR/CI workflow.
- Keep the real Ollama integration test separate and optional/manual unless the workflow explicitly provisions Ollama and downloads the required model.
- Do not use `--passWithNoTests` for mandatory unit tests, because accidentally discovering zero tests should fail CI.

The integration Vitest configuration should discover only files matching:

`src/**/*.integration.test.ts`

The regular unit-test configuration should exclude those integration test files.

## Architecture outcome

The implemented provider flow is:

```text
Test / Future Agent caller
        |
        v
    ILLMProvider
        |
        v
  OllamaProvider
        |
        v
  Native fetch()
        |
        v
  Ollama /api/chat
        |
        v
  Configured Ollama model
        |
        v
  LLMAssistantOutput
```

The provider can be called through `ILLMProvider` without the caller depending directly on Ollama's HTTP request/response format.

## Scope and limitations

Completed in this session:

- Provider contract reuse.
- Ollama-specific API types.
- Ollama provider implementation.
- Message and tool mapping.
- HTTP request and response handling.
- Error normalization and response validation.
- Provider unit tests.
- A real local Ollama provider integration test.

Not implemented or verified in this session:

- Full Agent orchestrator integration through the composition root.
- Provider factory or provider switching.
- OpenAI or Gemini provider implementations.
- Tool-call end-to-end execution through the complete Agent workflow.
- Ollama provisioning in GitHub Actions.

## Outcome

The Fetch Client AI Agent now has its first concrete LLM provider, `OllamaProvider`, implemented using native TypeScript HTTP calls and the existing provider-independent contract. Its unit tests passed, and a real local Ollama integration test
successfully generated and returned a model response.
