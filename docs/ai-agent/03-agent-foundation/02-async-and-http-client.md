# Day 7 — Async Programming and Typed HTTP Calls

**Phase:** Phase 1 — TypeScript Foundations **Session:** Day 7 **Topic:** Async Programming and API Calls **Estimated Duration:** 60 minutes **Status:** Completed after implementation, testing and knowledge check

---

## 1. Learning Objectives

The objective of this session is to understand asynchronous programming in TypeScript and build a reusable, type-safe HTTP client.

By the end of this session, we should understand:

- Synchronous and asynchronous execution.
- Promises and `async/await`.
- HTTP requests using the Fetch API.
- HTTP request timeout and cancellation.
- Network errors versus HTTP errors.
- Type-safe success and failure responses.
- Unit testing asynchronous HTTP operations.
- Why the HTTP client should remain independent of the AI Agent.

## 2. Synchronous vs Asynchronous Programming

### Synchronous execution

Synchronous operations execute one after another. Each operation must finish before the next operation begins.

```typescript
console.log("Start");

const result = calculateValue();

console.log(result);
console.log("End");
```

### Asynchronous execution

Asynchronous operations allow JavaScript to continue executing while waiting for an operation such as an HTTP request.

```typescript
console.log("Start");

const response = await fetch("https://example.com");

console.log("Response received");
console.log("End");
```

An HTTP request may take hundreds of milliseconds or several seconds. Asynchronous programming prevents the application from having to block while waiting for the response.

**Important:** `async/await` makes asynchronous code easier to read, but it does not make the underlying operation synchronous.

## 3. Promises

A Promise represents the eventual completion or failure of an asynchronous operation.

A Promise can be in one of three states:

| State     | Description                      |
| --------- | -------------------------------- |
| Pending   | Operation is still running       |
| Fulfilled | Operation completed successfully |
| Rejected  | Operation failed                 |

Example:

```typescript
function getUser(): Promise<string> {
  return new Promise((resolve) => {
  setTimeout(() => {
    resolve("User loaded");
  }, 1000);
  });
}
```

Using `async/await`:

```typescript
async function loadUser(): Promise<void> {
  const result = await getUser();

  console.log(result);
}
```

## 4. Fetch API

The Fetch API is a built-in browser and modern Node.js API for making HTTP requests.

Example:

```typescript
const response = await fetch("https://jsonplaceholder.typicode.com/users/1");

const data = await response.json();

console.log(data);
```

### Important HTTP behaviour

A common mistake is assuming that Fetch rejects its Promise whenever the server returns an HTTP error.

That is not correct.

For example:

| HTTP response             | Fetch behaviour   |
| ------------------------- | ----------------- |
| 200 OK                    | Promise fulfilled |
| 201 Created               | Promise fulfilled |
| 400 Bad Request           | Promise fulfilled |
| 401 Unauthorized          | Promise fulfilled |
| 404 Not Found             | Promise fulfilled |
| 500 Internal Server Error | Promise fulfilled |
| Network failure           | Promise rejected  |

Therefore, we must check:

```typescript
if (!response.ok) {
  // Handle HTTP error
}
```

This distinction is important when building a reliable API client.

## 5. HTTP Client Design

Instead of calling `fetch()` directly from different parts of the application, we created a reusable HTTP client.

### Project structure

```text
src/
└── core/
    └── http/
        ├── http-client.ts
        ├── http-client.types.ts
        └── index.ts

__tests__/
└── http-client.test.ts
```

### Design goals

The HTTP client should:

1. Support common HTTP methods.
2. Support configurable request headers and bodies.
3. Provide a configurable timeout.
4. Support caller-initiated cancellation.
5. Distinguish network errors from HTTP errors.
6. Handle invalid JSON responses.
7. Return strongly typed results.
8. Avoid throwing expected operational errors to callers.
9. Remain independent of the AI Agent and LLM providers.

## 6. Result Type Pattern

We introduced a discriminated union to represent success and failure.

```typescript
export type Result<T, E> = { success: true; data: T } | { success: false; error: E };
```

This gives callers an explicit way to handle both outcomes.

Example:

```typescript
const result = await get<User>("https://example.com/users/1");

if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### Why use Result instead of throwing errors?

- Success and failure are explicitly represented.
- Callers must consider both outcomes.
- Error handling becomes predictable.
- It is easier to test.
- It avoids relying on exceptions for normal operational failures.

Configuration errors may still throw exceptions. For example, an invalid timeout is a programming/configuration problem rather than an HTTP operation failure.

## 7. HTTP Error Types

We introduced separate error types to distinguish different failure scenarios.

| Error type | Meaning                                      |
| ---------- | -------------------------------------------- |
| `http`     | Server returned a non-success HTTP status    |
| `network`  | Request failed due to a network issue        |
| `timeout`  | Request exceeded the configured timeout      |
| `aborted`  | Caller cancelled the request                 |
| `parse`    | Response parsing or custom parsing failed    |
| `request`  | Request construction or serialization failed |

### Why distinguish these errors?

Consider an AI Agent calling an external API.

Different errors require different handling:

- HTTP 401: Authentication issue.
- HTTP 404: Resource not found.
- Network failure: Connectivity issue.
- Timeout: Request took too long.
- Aborted: User cancelled the operation.
- Parse error: Response could not be interpreted.

The agent should not treat every failure as the same problem.

## 8. Request Timeout

An HTTP request should not wait indefinitely.

We used `AbortController` to implement timeout handling.

```typescript
const controller = new AbortController();

const timer = setTimeout(() => {
  controller.abort();
}, timeoutMs);

try {
  const response = await fetch(url, {
  signal: controller.signal,
  });
} finally {
  clearTimeout(timer);
}
```

Our implementation keeps the timeout active while reading the response body, not just while waiting for response headers.

This is important because a server might send headers but take a long time to finish transmitting the body.

We also validate timeout values and clean up timers.

## 9. Request Cancellation

The caller can cancel an HTTP request using an `AbortSignal`.

Example:

```typescript
const controller = new AbortController();

const result = await get<User>("https://example.com/users/1", {
  signal: controller.signal,
});

// Cancel the request when required.
controller.abort();
```

Cancellation is useful in the AI Agent when:

- The user cancels an operation.
- An agent task is no longer needed.
- A parent workflow is terminated.
- A request exceeds the allowed execution time.

Our implementation uses an internal `AbortController` so that timeout cancellation and caller cancellation can be handled independently.

## 10. Request Body Types

We introduced an explicit request body union.

Supported body types:

- JSON
- Text
- FormData

Example:

```typescript
jsonBody({
  name: "Fetch Client",
  version: "1.0",
});

textBody("Hello");

formBody(formData);
```

This makes the intended body format explicit.

For multipart FormData, the HTTP client must not manually set the `Content-Type` header. The runtime needs to generate the multipart boundary.

We also handle JSON serialization failures, including circular references.

## 11. Response Handling

The HTTP client reads the response as text before attempting JSON parsing.

This approach supports:

- JSON responses.
- Plain-text responses.
- Empty responses such as HTTP 204.
- Invalid JSON responses.
- HTTP error responses containing JSON or plain text.

The implementation also documents a response-size limitation. A production HTTP client should consider response-size limits to prevent excessive memory consumption.

## 12. Unit Testing with Vitest

We selected Vitest as the testing framework.

### Why Vitest?

- TypeScript-friendly.
- Supports asynchronous tests.
- Provides built-in mocking.
- Supports fake timers.
- Uses familiar testing APIs.
- Works well for modern TypeScript projects.

### Test location

```text
__tests__/
└── http-client.test.ts
```

### Test coverage

The HTTP client test suite covers these scenarios:

| #   | Test scenario                              |
| --- | ------------------------------------------ |
| 1   | Successful JSON response                   |
| 2   | HTTP error with JSON response body         |
| 3   | HTTP error with plain-text response body   |
| 4   | Invalid JSON success response              |
| 5   | Custom parser throws an error              |
| 6   | Network request rejection                  |
| 7   | Timeout while waiting for response headers |
| 8   | Timeout while reading response body        |
| 9   | Caller signal already aborted              |
| 10  | Caller aborts an in-flight request         |
| 11  | HTTP 204 No Content                        |
| 12  | Invalid timeout values                     |
| 13  | Circular JSON serialization failure        |
| 14  | JSON Content-Type and request body         |
| 15  | FormData multipart Content-Type handling   |
| 16  | Error description for each error type      |

These tests mock `fetch`, so they do not require an actual internet connection.

### Running tests

```bash
pnpm test
```

For watch mode:

```bash
pnpm test:watch
```

For TypeScript type checking:

```bash
pnpm typecheck
```

## 13. Package Configuration

The AI Agent has its own package configuration.

Relevant dependencies:

```json
{
  "devDependencies": {
  "@types/node": "22.19.19",
  "typescript": "7.0.2",
  "vitest": "4.1.12"
  }
}
```

We use pnpm consistently for dependency installation and project commands.

Important project practices:

- Commit `pnpm-lock.yaml`.
- Avoid maintaining multiple package-manager lockfiles.
- Review security advisories.
- Avoid blindly applying breaking dependency upgrades.
- Run tests and type checking after dependency updates.

## 14. Architecture Decision: HTTP Client Independence

The HTTP client belongs in the core layer.

It should not contain:

- LLM-specific logic.
- Agent decision-making logic.
- Prompt construction.
- Tool selection.
- Fetch Client collection or request persistence logic.
- Retry policies specific to agent workflows.

The HTTP client is a generic infrastructure component.

Future agent modules can use it through a provider or adapter layer.

Example:

```text
AI Agent
    |
    v
Provider Adapter
    |
    v
Core HTTP Client
    |
    v
External API / LLM Provider
```

The provider adapter should decide whether retrying is appropriate. The generic HTTP client should not automatically retry requests.

This separation makes the HTTP client reusable and easier to test.

## 15. Key Learnings

By completing Day 7, we covered:

1. How asynchronous operations work in TypeScript.
2. How Promises and `async/await` simplify asynchronous code.
3. How the Fetch API handles HTTP and network failures differently.
4. How to implement timeout and cancellation.
5. How to model operational errors with discriminated unions.
6. How to use `Result<T, E>` for predictable error handling.
7. How to write asynchronous unit tests using Vitest.
8. How to separate generic infrastructure from agent-specific logic.

## 16. Knowledge Check

Answer these questions without referring to the implementation.

**Q1.** What is the difference between a Promise and `async/await`?

**Q2.** Does Fetch reject its Promise when the server returns HTTP 404? Explain.

**Q3.** What is the purpose of `AbortController`?

**Q4.** Why should timeout and caller cancellation be represented separately?

**Q5.** What is a discriminated union?

**Q6.** Why did we introduce `Result<T, E>` instead of throwing errors for every failure?

**Q7.** Why should a generic HTTP client not implement agent-specific retry logic?

**Q8.** Why should we remove the manually specified Content-Type header when sending FormData?

**Q9.** Why do we mock Fetch in unit tests?

**Q10.** Why should the HTTP client remain independent of the LLM provider?

## 17. Completion Checklist

- [x] Understand synchronous and asynchronous execution.
- [x] Understand Promises and `async/await`.
- [x] Implement a typed HTTP client.
- [x] Implement timeout handling.
- [x] Implement caller cancellation.
- [x] Implement typed request body handling.
- [x] Implement HTTP, network, timeout, abort, parse and request errors.
- [x] Create Vitest test cases.
- [x] Execute the complete test suite and confirm all tests pass.
- [x] Execute TypeScript type checking and resolve any errors.
- [x] Complete the Day 7 knowledge check.
- [x] Commit the implementation and documentation to the repository.

---

**Day 7 Deliverable:** A reusable, typed HTTP client with timeout, cancellation, structured error handling and automated unit tests.

**Next session:** Day 8 — TypeScript Generics, Utility Types and Advanced Type Modelling.
