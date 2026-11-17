# TypeScript Types and Contracts

**Project:** Fetch Client AI Agent\
**Phase:** Phase 1 --- TypeScript Foundations\
**Session:** Day 6 --- TypeScript Interfaces and Contracts\
**Status:** Draft

## 1. Purpose

This document records the TypeScript contracts drafted for the Fetch Client AI Agent. These contracts establish shared shapes for conversation messages, tasks, tool calls and results, approvals, events, and the public agent API.

The goal of this session is to define and understand the contracts. It is not to implement the complete agent runtime or every future validation and security mechanism.

The corresponding TypeScript draft is `agent-contracts.ts`. Sample objects and a minimal stub are in `agent-contracts.samples.ts`.

## 2. Design conventions

The current contracts use these conventions:

- **Timestamps:** `Timestamp` is a number representing Unix epoch milliseconds, typically produced by `Date.now()`.
- **IDs:** IDs are opaque strings. The draft suggests UUID v4 or ULID and recommends choosing one convention and using it consistently.
- **Required and optional properties:** Properties without `?` are mandatory; properties with `?` are optional.
- **Untrusted tool arguments:** Tool arguments may originate from LLM output. They must be validated before a tool uses them.
- **Discriminated unions:** Message and result variants use literal fields such as `role` and `success` so TypeScript can distinguish the variants.

## 3. Shared primitives and status types

### `Timestamp`

```ts
export type Timestamp = number;
```

Represents Unix epoch time in milliseconds.

### `RiskLevel`

```ts
export type RiskLevel = "read" | "write" | "destructive";
```

Represents the draft's three tool-risk categories. The risk level is intended to inform the approval policy.

### `AgentStatus`

```ts
export type AgentStatus = "idle" | "thinking" | "executing" | "waiting_for_approval";
```

Represents the current state of the agent itself:

- `idle`: nothing is running.
- `thinking`: waiting for or processing LLM output.
- `executing`: a tool is running.
- `waiting_for_approval`: execution is paused for the user's decision.

### `TaskStatus`

```ts
export type TaskStatus = "pending" | "running" | "waiting_for_approval" | "completed" | "failed" | "cancelled";
```

Represents the lifecycle of an individual task, including terminal states.

**Why keep both status types?** Agent status describes the agent's current activity. Task status describes the lifecycle of one task. They are related, but they answer different questions.

## 4. Conversation contracts

### `AgentMessage`

`AgentMessage` is a union of four message variants, discriminated by `role`:

---

Variant Role Purpose

---

`UserMessage` `user` Text supplied by the user

`SystemMessage` `system` Application-provided instructions or context

`AssistantMessage` `assistant` LLM output, optionally including tool calls

`ToolMessage` `tool` Tool output returned to the conversation

---

The shared message fields are:

- `id`: message identifier.
- `timestamp`: message creation time.
- `taskId` (optional): task associated with the message.

`UserMessage` and `SystemMessage` contain `content`. `AssistantMessage` contains `content` and may contain `toolCalls`. `ToolMessage` contains a `toolResult`.

The `role` discriminator lets TypeScript narrow a message to its specific variant.

## 5. Task contract

### `AgentTask`

`AgentTask` represents a unit of work assigned to the agent, for example: creating a collection for an API and testing its endpoints.

Its fields include:

---

Field Required? Purpose

---

`id` Yes Task identifier

`description` Yes User's requested work

`status` Yes Current task lifecycle state

`createdAt` Yes Creation timestamp

`updatedAt` No Timestamp of the last state change

`completedAt` No Set when the task completes, fails, or is cancelled

`result` No Final summary when completed

`error` No Failure reason when failed

`parentTaskId` No Parent task identifier for a subtask

---

The optional parent identifier allows the contract to represent a task hierarchy.

## 6. Tool invocation and result contracts

### `ToolCall`

`ToolCall` represents a request, produced by the LLM, to execute a named tool.

Its fields are:

- `id`: unique tool-call identifier.
- `toolName`: name matching a registered `ToolDefinition`.
- `arguments`: raw arguments represented as `Record<string, unknown>`.
- `status`: lifecycle state of the invocation.
- `requiresApproval`: whether user approval is required before execution.

`ToolCallStatus` currently includes `pending`, `awaiting_approval`, `approved`, `rejected`, `running`, `succeeded`, and `failed`.

The `arguments` value is untrusted input. The TypeScript type does not validate the runtime data.

### `ToolResult`

The result is represented as a discriminated union:

```ts
export type ToolResult = ToolSuccess | ToolFailure;
```

- `ToolSuccess` has `success: true` and mandatory `data`.
- `ToolFailure` has `success: false` and mandatory structured `error`.
- Both variants share `toolCallId` and optional `durationMs`.

This design makes success and failure explicit and prevents the two variants from being accidentally mixed in ordinary typed code.

### `ToolError`

`ToolError` contains:

- `code`: one of `INVALID_ARGUMENTS`, `TIMEOUT`, `NETWORK`, `PERMISSION_DENIED`, `REJECTED_BY_USER`, or `UNKNOWN`.
- `message`: human-readable error information.
- `retryable`: whether retrying the same call could succeed.

## 7. Tool definition and execution contracts

### `JSONSchemaType`, `JSONSchemaProperty`, and `JSONSchema`

These types describe the argument schema exposed for a tool.

The current draft supports the primitive schema types `string`, `number`, `integer`, `boolean`, `object`, and `array`. A property can include a description, a string enum, and an `items` schema. The top-level `JSONSchema` describes an object with
`properties`, optional `required` fields, and optional `additionalProperties`.

This is a deliberately small schema model in the current draft; it is not a complete implementation of the JSON Schema specification.

### `ToolDefinition`

`ToolDefinition` describes a tool to the agent/LLM:

- `name`: tool name.
- `description`: when and how the tool should be used.
- `inputSchema`: schema for its arguments.
- `riskLevel`: `read`, `write`, or `destructive`.
- `requiresApproval` (optional): an approval-policy override in the current draft.

### `ToolContext`

`ToolContext` provides execution context:

- `taskId`: task associated with the execution.
- `signal` (optional): `AbortSignal` for cancellation of long-running work.
- `workspacePath` (optional): workspace folder, if one is open.

### `Tool`

`Tool` pairs a `ToolDefinition` with an asynchronous `execute` implementation. The implementation receives untrusted arguments and a `ToolContext`, and returns a `Promise<ToolResult>`.

The contract describes the boundary; it does not itself implement registration, validation, execution, or cancellation.

## 8. Approval contracts

### `ApprovalRequest`

`ApprovalRequest` asks the user to allow a specific tool call. It contains:

- `id`: approval-request identifier.
- `toolCallId`: associated tool-call identifier.
- `summary`: human-readable description of the operation.
- `riskLevel`: excludes the `read` risk level in this draft.
- `createdAt`: creation timestamp.

### `ApprovalResponse`

`ApprovalResponse` records the user's decision:

- `requestId`: approval request being answered.
- `decision`: `approve` or `reject`.
- `reason` (optional): explanation, which may be forwarded to the LLM on rejection.
- `respondedAt`: response timestamp.

These contracts describe an approval exchange. They do not, by themselves, enforce an approval policy or guarantee that approval is bound to an immutable set of tool arguments.

## 9. Events and UI communication

### `AgentEvent`

`AgentEvent` is a discriminated union. The current event types are:

---

Event type Payload Purpose

---

`status_changed` `status` Agent status changed

`task_updated` `task` Task information changed

`message_added` `message` A conversation message was added

`message_delta` `messageId`, `delta` Incremental message content arrived

`tool_call_started` `toolCall` Tool execution started

`tool_call_finished` `result` Tool execution finished

`approval_requested` `request` User approval is requested

`error` `error` An error is surfaced to the UI

---

`AgentErrorInfo` currently contains a string `code` and a human-readable `message`.

The intent is to let the UI render progress through events without depending on the agent's internal implementation.

## 10. Public agent API

The `Agent` interface describes the public runtime API:

- `status`: read-only current agent status.
- `run(description)`: starts work and resolves to an `AgentTask`.
- `cancel(taskId)`: requests cancellation of a task.
- `respondToApproval(response)`: submits the user's approval decision.
- `onEvent(listener)`: subscribes to agent events and returns an `Unsubscribe` function.

`AgentEventListener` receives an `AgentEvent`. `Unsubscribe` is a function that stops listening to events.

The sample file provides a minimal stub for this interface. It demonstrates type compatibility; it is not a production agent implementation.

## 11. Sample validation

The companion `agent-contracts.samples.ts` file creates representative values for the contracts, including:

- Agent and task statuses.
- A tool call and tool error.
- Successful and failed tool results.
- User, system, assistant, and tool messages.
- A task.
- A tool schema, definition, context, and minimal tool implementation.
- An approval request and response.
- An agent event.
- A minimal `Agent` stub and event listener subscription.

The two files were checked with:

```powershell
npx tsc --noEmit --ignoreConfig --target ES2022 --module commonjs --strict .\agent-contracts.ts .\agent-contracts.samples.ts
```

The command completed without reporting TypeScript errors. This confirms that these files type-check together under the supplied compiler options. It does not prove runtime safety or production behavior.

## 12. Design-review findings and future considerations

The following items were identified during the Day 6 review. They are recorded for future design and implementation work; they are not all required to be implemented in this session.

---

Finding Current observation Planned consideration

---

Destructive-operation Risk levels and approval Ensure destructive approval fields exist operations cannot bypass required approval

Approval bound to Request references a Ensure approval applies arguments `toolCallId` and has a only to the exact tool summary name and arguments presented to the user

Runtime argument Tool arguments are typed as Validate incoming data validation `Record<string, unknown>` against the registered tool schema before execution

Nested JSON Schema Current property schema is Consider recursive limited object-property support if complex tool inputs require it

`ToolContext` Context currently includes Review which execution boundaries task ID, abort signal, and context tools should workspace path receive and restrict access to what is necessary

Agent API lifecycle Public methods are defined Review cancellation, concurrent tasks, errors, and event-subscription lifecycle when designing the runtime

---

### Security principle to carry forward

TypeScript contracts provide compile-time guarantees, not runtime validation. LLM-generated arguments and tool results must be treated as data that requires appropriate validation and policy checks before sensitive operations are performed.

## 13. Day 6 completion criteria

- [x] Understand interfaces and type aliases.
- [x] Define the five initial contracts: `AgentMessage`, `AgentTask`, `ToolCall`, `ToolResult`, and `AgentStatus`.
- [x] Extend the draft with supporting contracts for tools, approvals, events, and the agent API.
- [x] Create sample objects and a minimal implementation.
- [x] Run strict TypeScript validation on both files.
- [x] Complete the Day 6 knowledge check.
- [x] Record final learning notes and update the session tracker.

## 14. Outcome

Day 6 establishes a first draft of the TypeScript contracts for the Fetch Client AI Agent. The draft separates conversation messages, task lifecycle, tool invocation, tool outcomes, approvals, UI events, and the public agent API.

These contracts are a starting point for subsequent design and implementation. They should evolve only when later sessions establish concrete runtime, integration, and security requirements.
