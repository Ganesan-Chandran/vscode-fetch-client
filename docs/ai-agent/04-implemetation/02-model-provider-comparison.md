# Model Provider Comparison

**Session:** 11 **Phase:** 2 — Model Providers and First Model Call **Status:** Draft — Architecture and evaluation criteria defined **Last reviewed:** 21 November 2026

## 1. Objective

Evaluate different Large Language Model (LLM) providers for the Fetch Client AI Agent.

The objective is to identify suitable providers for our agent while maintaining a provider-independent architecture.

We will compare:

- Hosted and local model providers.
- Privacy and data retention.
- API pricing and operational costs.
- Context windows and output limits.
- Structured output capabilities.
- Tool calling capabilities.
- Streaming support.
- Latency and reliability.

Our goal is to implement our own agent orchestration and provider integration using TypeScript without depending on an external AI Agent SDK.

## 2. Providers in Scope

| Provider  | Type                    | Examples               |
| --------- | ----------------------- | ---------------------- |
| Anthropic | Hosted API              | Claude models          |
| OpenAI    | Hosted API              | GPT models             |
| Google    | Hosted API              | Gemini models          |
| Ollama    | Local model runtime     | Qwen, Gemma, Llama     |
| llama.cpp | Local inference runtime | GGUF-compatible models |

**Note:** Ollama and llama.cpp are runtimes, not model developers. Their capabilities depend on the selected model and runtime implementation.

OpenRouter and other model-routing services are excluded from the first-party provider comparison. They can be evaluated separately later.

## 3. Provider Comparison Matrix

| Criterion               | Anthropic                                 | OpenAI                                    | Google Gemini                         | Local Models                             |
| ----------------------- | ----------------------------------------- | ----------------------------------------- | ------------------------------------- | ---------------------------------------- |
| Deployment              | Hosted                                    | Hosted                                    | Hosted                                | Local                                    |
| Privacy                 | Depends on API policies and configuration | Depends on API policies and configuration | Depends on API tier and configuration | Can keep inference data local            |
| Input pricing           | Per model                                 | Per model                                 | Per model                             | Hardware and electricity                 |
| Output pricing          | Per model                                 | Per model                                 | Per model                             | Hardware and electricity                 |
| Cached input            | Supported; model-dependent                | Supported; model-dependent                | Supported; model-dependent            | Runtime-dependent                        |
| Batch processing        | Supported                                 | Supported                                 | Supported                             | Application-managed                      |
| Latency                 | Network and model-dependent               | Network and model-dependent               | Network and model-dependent           | Hardware and model-dependent             |
| Context window          | Model-dependent                           | Model-dependent                           | Model-dependent                       | Model-dependent                          |
| Output limit            | Model-dependent                           | Model-dependent                           | Model-dependent                       | Model-dependent                          |
| Structured output       | Supported; model-dependent                | Supported; model-dependent                | Supported; model-dependent            | Runtime/model-dependent                  |
| Tool calling            | Supported                                 | Supported                                 | Supported                             | Model/runtime-dependent                  |
| Parallel tool calls     | Verify per model/API                      | Verify per model/API                      | Verify per model/API                  | Model/runtime-dependent                  |
| Streaming               | Supported                                 | Supported                                 | Supported                             | Runtime-dependent                        |
| Rate limits             | API tier-dependent                        | API tier-dependent                        | API tier-dependent                    | No vendor API limits for local inference |
| Operational maintenance | Provider-managed                          | Provider-managed                          | Provider-managed                      | Application and infrastructure managed   |

**Important:** This is a capability overview, not a claim that every model supports every feature. Exact capabilities must be verified against the selected model and API version.

## 4. Privacy and Data Retention

Privacy is an important consideration because the Fetch Client agent may process:

- API request and response data.
- Authentication information.
- Environment variables.
- OpenAPI specifications.
- Test cases.
- Internal API documentation.

### Hosted Providers

Hosted providers receive prompts and model inputs through their APIs.

Before selecting a provider, evaluate:

1. Whether API data is used for model training.
2. Request and response retention policies.
3. Abuse monitoring and safety retention.
4. Data residency options.
5. Available enterprise privacy controls.

Do not assume that API data policies are identical to consumer chat product policies.

### Local Models

Local inference can keep prompts and responses on the user's machine, provided that:

- The model runtime runs locally.
- The application does not send prompts to external services.
- Logs and telemetry do not expose sensitive information.
- Supporting services are also configured locally.

**Recommendation:** Local inference should be available as a privacy-focused option.

## 5. Pricing and Usage Limits

Hosted providers generally charge based on token consumption.

### Pricing Components

| Component           | Description                                                    |
| ------------------- | -------------------------------------------------------------- |
| Input tokens        | Tokens sent to the model                                       |
| Output tokens       | Tokens generated by the model                                  |
| Cached input        | Reduced cost for eligible cached input                         |
| Cache creation      | Cost associated with creating cached content, where applicable |
| Batch processing    | Discounted processing for eligible batch requests              |
| Additional services | Other provider-specific charges                                |

### Pricing Verification Table

Exact prices should be maintained separately because pricing changes frequently.

| Provider  | Model ID       | Input price / 1M tokens | Output price / 1M tokens | Last verified |
| --------- | -------------- | ----------------------: | -----------------------: | ------------- |
| Anthropic | To be selected |                  VERIFY |                   VERIFY | Pending       |
| OpenAI    | To be selected |                  VERIFY |                   VERIFY | Pending       |
| Gemini    | To be selected |                  VERIFY |                   VERIFY | Pending       |
| Local     | To be selected |           Hardware cost |            Hardware cost | Pending       |

### Rate Limits

Evaluate:

- Requests per minute (RPM).
- Input tokens per minute (ITPM).
- Output tokens per minute (OTPM).
- Daily request limits.
- Concurrent request limits.

For local inference, vendor API rate limits do not apply, but available memory, CPU/GPU capacity and concurrent workloads impose practical limits.

## 6. Context Window and Token Limits

The context window determines how much information the model can consider in a single interaction.

For Fetch Client, context usage can increase because of:

- Large OpenAPI specifications.
- Long conversation history.
- Multiple API requests.
- Test generation instructions.
- Tool execution results.

Evaluate the following:

| Metric                | Purpose                                        |
| --------------------- | ---------------------------------------------- |
| Maximum input context | Maximum supported input context                |
| Maximum output tokens | Maximum generated response                     |
| Context utilization   | Percentage of available context consumed       |
| Token estimation      | Estimate request size before submission        |
| Context management    | Summarize or truncate old conversation history |

The agent should not assume that every provider supports the same context size.

## 7. Structured Output

Structured output allows the model to generate predictable responses, such as JSON matching a specified schema.

Example:

\`\`\`json { "taskType": "generate_test_cases", "confidence": 0.95, "requiresApproval": true } \`\`\`

### Why It Matters

Fetch Client requires structured output for:

- Agent task classification.
- Tool arguments.
- Test case generation.
- API documentation generation.
- Agent execution results.

### Important Distinction

Structured output does not eliminate runtime validation.

Our application must validate model responses before using them.

We currently use Ajv for runtime validation of agent tool arguments and related contracts.

Expected flow:

1. Define the expected schema.
2. Send the schema to the provider when supported.
3. Receive the model response.
4. Parse the response.
5. Validate it using Ajv.
6. Reject invalid responses.
7. Continue execution only when validation succeeds.

Provider-supported JSON Schema features may be a subset of the full JSON Schema specification. We must verify compatibility with our schemas.

## 8. Tool Calling

Tool calling allows the model to request execution of application functions.

Example user request:

"Generate API test cases from my Swagger file."

The model may return a tool request:

\`\`\`json { "name": "read_openapi_file", "arguments": { "filePath": "swagger.json" } } \`\`\`

The model does not execute our TypeScript function directly.

Our orchestrator handles execution.

### Expected Execution Flow

1. User sends a request.
2. Orchestrator sends conversation messages and available tool definitions to the provider.
3. Model returns a tool-call request.
4. Orchestrator validates the tool name.
5. Tool arguments are validated using Ajv.
6. Tool registry executes the approved tool.
7. Tool result is returned to the model.
8. Model generates the next response.
9. Orchestrator returns the final result to the user.

### Tool Calling Evaluation

| Capability                 | Evaluation                                  |
| -------------------------- | ------------------------------------------- |
| Tool selection             | Does the model select the correct tool?     |
| Argument generation        | Are arguments valid?                        |
| Required properties        | Are required fields populated?              |
| Multiple tool calls        | Can it request multiple tools?              |
| Parallel execution         | Can independent tools execute concurrently? |
| Error handling             | Can it recover from tool failures?          |
| Tool result interpretation | Can it correctly use execution results?     |

Tool execution must always remain under application control.

The agent must never blindly execute arbitrary model-generated code or unapproved operations.

## 9. Streaming

Streaming allows the application to receive model output incrementally rather than waiting for the complete response.

### Without Streaming

\`\`\`text Request sent | v Model processes request | v Wait for completion | v Complete response received \`\`\`

### With Streaming

\`\`\`text Request sent | v First response chunk | v Additional response chunks | v More response chunks | v Stream completed \`\`\`

### Benefits

- Better user experience.
- Faster perceived response time.
- Incremental UI updates.
- Suitable for long-running model responses.

### Implementation Considerations

Our provider abstraction should eventually support streaming.

We must also consider:

- Stream cancellation.
- Network interruptions.
- Partial responses.
- Tool-call event accumulation.
- Error handling.
- Final response assembly.

Streaming support does not mean that incomplete JSON should be executed. Structured responses must be assembled and validated before execution.

## 10. Local vs Hosted Models

| Area            | Local Models                                 | Hosted Models                                  |
| --------------- | -------------------------------------------- | ---------------------------------------------- |
| Privacy         | Can keep inference local                     | Depends on provider policies                   |
| Cost            | Hardware and electricity                     | Token-based pricing                            |
| Initial setup   | Requires installation and configuration      | Requires API configuration                     |
| Performance     | Depends on local hardware                    | Depends on network and provider infrastructure |
| Scalability     | Limited by available resources               | Provider infrastructure                        |
| Maintenance     | User/application responsibility              | Mostly provider-managed                        |
| Internet        | Not required for local inference after setup | Required                                       |
| Model selection | Open-weight model availability               | Provider model availability                    |

### Local Model Considerations

Local inference provides greater control, but model quality and tool-calling reliability can vary significantly.

We should evaluate models based on actual task performance rather than parameter count alone.

## 11. Benchmark Strategy

A common benchmark should be used to compare providers.

All providers should receive the same prompts, tool definitions and expected outputs wherever their APIs support equivalent functionality.

### Test Cases

| Test ID | Test               | Expected Result                      |
| ------- | ------------------ | ------------------------------------ |
| TC-01   | Tool calling       | Correct tool selection and arguments |
| TC-02   | Structured output  | Valid JSON matching expected schema  |
| TC-03   | Long context       | Correct handling of supplied context |
| TC-04   | Streaming          | Incremental response received        |
| TC-05   | Repeated execution | Consistent results across five runs  |

### Metrics to Record

| Metric              | Description                              |
| ------------------- | ---------------------------------------- |
| Model ID            | Exact model identifier                   |
| Provider            | Provider name                            |
| Test date           | Date of execution                        |
| Time to first token | Time until first streamed content        |
| Total latency       | Total response time                      |
| Input tokens        | Number of input tokens                   |
| Output tokens       | Number of output tokens                  |
| Tool-call accuracy  | Correct tool and arguments               |
| Schema validation   | Ajv validation success                   |
| Success rate        | Successful executions / total executions |
| Error details       | Provider or application errors           |

### Benchmark Result Template

| Provider  | Model   | Tool Calling | Structured Output | Long Context | Streaming | Avg. Latency |
| --------- | ------- | ------------ | ----------------- | ------------ | --------- | ------------ |
| Gemini    | Pending | Pending      | Pending           | Pending      | Pending   | Pending      |
| Ollama    | Pending | Pending      | Pending           | Pending      | Pending   | Pending      |
| OpenAI    | Pending | Pending      | Pending           | Pending      | Pending   | Pending      |
| Anthropic | Pending | Pending      | Pending           | Pending      | Pending   | Pending      |

Use five repeated runs for reliability testing. Record latency and token usage separately for each run before calculating averages.

## 12. Fetch Client Recommendation

For the initial implementation, evaluate two providers first.

### First: Google Gemini

Reasons:

- Hosted API integration.
- Suitable for experimenting with model API communication.
- Structured output and tool-calling capabilities.
- Free-tier availability for eligible models.

Free-tier eligibility, quotas and data-use policies must be checked before use.

### Second: Ollama

Reasons:

- Local inference.
- No mandatory external API usage charges.
- Suitable for evaluating open-weight models.
- Greater control over local data processing.

### Future Providers

OpenAI and Anthropic can be added after the provider abstraction is established.

### Initial Evaluation Priority

1. Tool-calling reliability.
2. Structured-output reliability.
3. Privacy.
4. Cost.
5. Latency.
6. Context window.
7. Streaming support.

Our initial provider choice is an experimentation decision, not a permanent architecture decision.

## 13. Provider Abstraction Design

The Fetch Client AI Agent should not depend directly on any specific provider.

The orchestrator should communicate through our own TypeScript provider contract.

Conceptual interface:

```typescript
interface LLMProvider {
  generateResponse(messages: AgentMessage[]): Promise<AgentMessage>;
}
```

This is the initial conceptual contract, not the final implementation.

The provider interface will evolve to support:

- Provider configuration.
- Model selection.
- Structured output.
- Tool definitions.
- Tool-call responses.
- Streaming.
- Usage metadata.
- Error normalization.
- Cancellation.

Each provider will have its own implementation.

The orchestrator should remain independent of provider-specific API formats.

## 14. Security Considerations

The agent processes untrusted model output.

Therefore:

- Never trust model-generated tool arguments.
- Validate tool arguments using Ajv.
- Enforce tool registry allowlists.
- Apply permission checks before execution.
- Never expose API keys in prompts or logs.
- Avoid sending secrets to external providers.
- Limit request and response sizes.
- Handle provider errors safely.
- Require user approval for sensitive operations.
- Keep execution logs free of credentials and sensitive payloads.

Provider selection must not weaken our existing application security boundaries.

## 15. Official References

### Anthropic

- Pricing: https://platform.claude.com/docs/en/about-claude/pricing
- API documentation: https://platform.claude.com/docs/en/api/overview
- Tool use: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview

### OpenAI

- API pricing: https://developers.openai.com/api/docs/pricing
- Function calling: https://developers.openai.com/api/docs/guides/function-calling
- Structured outputs: https://developers.openai.com/api/docs/guides/structured-outputs
- Streaming: https://developers.openai.com/api/docs/guides/streaming-responses

### Google Gemini

- API pricing: https://ai.google.dev/gemini-api/docs/pricing
- API documentation: https://ai.google.dev/gemini-api/docs
- Function calling: https://ai.google.dev/gemini-api/docs/function-calling
- Structured output: https://ai.google.dev/gemini-api/docs/structured-output

### Ollama

- Documentation: https://docs.ollama.com/
- API documentation: https://docs.ollama.com/api
- Tool calling: https://docs.ollama.com/capabilities/tool-calling

### llama.cpp

- GitHub repository: https://github.com/ggml-org/llama.cpp

**Verification note:** Model-specific pricing, context limits, rate limits and capabilities have not been exhaustively verified in this document. Verify them against official documentation before making implementation or cost decisions.

---

## 16. Session 11 Deliverables

| Deliverable                         | Status    |
| ----------------------------------- | --------- |
| Understand model providers          | Completed |
| Compare hosted and local models     | Completed |
| Understand tool calling             | Completed |
| Understand structured output        | Completed |
| Understand streaming                | Completed |
| Understand context and token limits | Completed |
| Provider comparison documentation   | Completed |

**Architecture principle:** We own the agent, orchestration, validation and tool execution. External providers supply model inference only.
