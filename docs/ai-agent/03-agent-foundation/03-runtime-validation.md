# Session 08: Runtime Validation

## 1. Objective

Validate untrusted JSON at runtime so the value the application uses matches the expected type and structure.

The input in this session is an API request definition returned by an external source, such as an LLM.

Schema validation proves that the input follows the expected structure. It does not prove that the request is safe to execute.

Safety checks happen separately, in the Security Manager.

## 2. Runtime Validation Flow

External sources such as LLMs commonly return JSON as text.

The application must first parse the JSON and then validate the resulting JavaScript value.

```text
External Source (LLM)
        |
        v
JSON Response (string)
        |
        v
JSON Parsing
        |
        +---- Invalid JSON ----> Reject
        |
        v
JavaScript Value (unknown)
        |
        v
Zod Runtime Validation
        |
        +---- Invalid Structure ----> Reject
        |
        v
Validated AgentRequest
        |
        v
Security Manager
        |
        +---- Unsafe / Unauthorized ----> Reject
        |
        v
Request Execution
```

Important distinctions:

- JSON parsing verifies that the text contains valid JSON.
- Runtime validation verifies that the parsed value follows the expected schema.
- Security validation verifies whether the operation is safe and permitted.

These are three separate responsibilities.

## 3. Implementation

**File:** `src/ai-agent/core/http/validators/agent-request.validator.ts`

```typescript
import { z } from "zod";

export const AgentRequestSchema = z
  .object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  url: z
    .string()
    .url()
    .refine((u) => /^https?:\/\//i.test(u), {
    message: "URL must use http or https",
    }),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.unknown().optional(),
  })
  .strict();

export type AgentRequest = z.infer<typeof AgentRequestSchema>;

/**
  * Validates an unknown JavaScript value against AgentRequestSchema.
  * Throws when validation fails.
  */
export function parseAgentRequest(raw: unknown): AgentRequest {
  const result = AgentRequestSchema.safeParse(raw);

  if (!result.success) {
  const details = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");

  throw new Error(`Invalid AgentRequest: ${details}`);
  }

  return result.data;
}

/**
  * Parses external JSON text and validates the resulting value.
  */
export function parseAgentRequestJson(json: string): AgentRequest {
  let raw: unknown;

  try {
  raw = JSON.parse(json) as unknown;
  } catch {
  throw new Error("Invalid AgentRequest JSON: malformed JSON");
  }

  return parseAgentRequest(raw);
}
```

### Notes on the implementation

1. `unknown` is used because external input cannot be trusted before validation.
2. `z.infer` derives the TypeScript type directly from the schema.
3. `safeParse()` returns validation results without throwing automatically.
4. `parseAgentRequest` throws on invalid input, so it can be passed as a `parse` hook.
5. `parseAgentRequestJson` handles JSON parsing separately before invoking schema validation.
6. `.strict()` rejects unexpected properties.
7. The HTTP/HTTPS check is a schema-level guard.
8. Blocking localhost, private network addresses and other unsafe destinations belongs in the Security Manager (SEC-06, SEC-10).

**Zod version consideration:**

The example uses `.url()` on a string schema. Check the installed Zod version. Zod 4 also provides `z.url()` as the top-level URL validator.

## 4. Test Cases

Expected results are defined before running the tests.

If a test fails, change the code or the expectation only with a documented reason. Do not change expectations simply to make tests pass.

| ID   | Scenario                         | Input summary            | Expected                  |
| ---- | -------------------------------- | ------------------------ | ------------------------- |
| TC01 | Valid GET                        | `method: GET`, URL only  | PASS                      |
| TC02 | Valid POST with headers and body | Object body              | PASS                      |
| TC03 | Invalid method                   | `INVALID`                | FAIL                      |
| TC04 | Invalid URL                      | `not-a-valid-url`        | FAIL                      |
| TC05 | Headers as string                | String instead of object | FAIL                      |
| TC06 | Unexpected property              | `unknownProperty: true`  | FAIL                      |
| TC07 | JavaScript URL                   | `javascript:alert(1)`    | FAIL                      |
| TC08 | File URL                         | `file:///etc/passwd`     | FAIL                      |
| TC09 | Lowercase method                 | `get`                    | FAIL                      |
| TC10 | Empty URL                        | `""`                     | FAIL                      |
| TC11 | Non-string header value          | `{ "X-Retry": 3 }`       | FAIL                      |
| TC12 | Top-level null                   | `null`                   | FAIL                      |
| TC13 | Top-level string                 | `"text"`                 | FAIL                      |
| TC14 | Top-level array                  | `[]`                     | FAIL                      |
| TC15 | String body                      | `body: "raw text"`       | PASS                      |
| TC16 | Localhost URL                    | `http://localhost:3000`  | PASS at schema level      |
| TC17 | Missing required URL             | `method: GET` only       | FAIL                      |
| TC18 | Malformed JSON text              | Incomplete JSON string   | FAIL at JSON parsing      |
| TC19 | Validation error details         | Invalid method           | Error identifies `method` |

**Important decisions:**

- TC09: HTTP method is case-sensitive. Lowercase methods are rejected.
- TC16: Localhost is allowed at schema level but must be blocked later by the Security Manager according to execution policy.
- TC18: This is a JSON parsing failure, not a Zod schema validation failure.

## 5. Test Code (Vitest)

**File:** `agent-request.validator.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { parseAgentRequest, parseAgentRequestJson } from "./agent-request.validator";

describe("parseAgentRequest", () => {
  it("TC01 accepts a valid GET", () => {
  expect(
    parseAgentRequest({
    method: "GET",
    url: "https://api.example.com/users",
    }),
  ).toMatchObject({ method: "GET" });
  });

  it("TC02 accepts a POST with headers and body", () => {
  expect(() =>
    parseAgentRequest({
    method: "POST",
    url: "https://api.example.com/users",
    headers: { "Content-Type": "application/json" },
    body: { name: "John" },
    }),
  ).not.toThrow();
  });

  it.each([
  ["TC03 invalid method", { method: "INVALID", url: "https://a.com" }],
  ["TC04 invalid URL", { method: "GET", url: "not-a-valid-url" }],
  [
    "TC05 headers as string",
    {
    method: "POST",
    url: "https://a.com",
    headers: "Content-Type: x",
    },
  ],
  [
    "TC06 unexpected property",
    {
    method: "GET",
    url: "https://a.com",
    unknownProperty: true,
    },
  ],
  ["TC07 javascript URL", { method: "GET", url: "javascript:alert(1)" }],
  ["TC08 file URL", { method: "GET", url: "file:///etc/passwd" }],
  ["TC09 lowercase method", { method: "get", url: "https://a.com" }],
  ["TC10 empty URL", { method: "GET", url: "" }],
  [
    "TC11 non-string header value",
    {
    method: "GET",
    url: "https://a.com",
    headers: { "X-Retry": 3 },
    },
  ],
  ["TC12 null", null],
  ["TC13 string", "text"],
  ["TC14 array", []],
  ["TC17 missing URL", { method: "GET" }],
  ])("rejects: %s", (_name, input) => {
  expect(() => parseAgentRequest(input)).toThrow(/Invalid AgentRequest/);
  });

  it("TC15 accepts a string body", () => {
  expect(() =>
    parseAgentRequest({
    method: "POST",
    url: "https://a.com",
    body: "raw text",
    }),
  ).not.toThrow();
  });

  it("TC16 accepts localhost at schema level", () => {
  expect(() =>
    parseAgentRequest({
    method: "GET",
    url: "http://localhost:3000",
    }),
  ).not.toThrow();
  });

  it("TC18 rejects malformed JSON text", () => {
  const malformedJson = '{"method":"GET","url":';

  expect(() => parseAgentRequestJson(malformedJson)).toThrow(/Invalid AgentRequest JSON/);
  });

  it("TC19 error message names the failing field", () => {
  expect(() =>
    parseAgentRequest({
    method: "INVALID",
    url: "https://a.com",
    }),
  ).toThrow(/method/);
  });
});
```

Adjust the import and test runner if the repository uses Jest or Mocha instead of Vitest.

## 6. Decisions and Reasons

| Decision               | Choice                   | Reason                                                                                               |
| ---------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Extra fields           | Reject using `.strict()` | LLM output will later be used for execution. Unknown properties should not silently pass.            |
| URL scheme             | HTTP/HTTPS only          | Rejects unsupported schemes at the schema level.                                                     |
| Method case            | Case-sensitive           | Maintains one canonical HTTP method representation.                                                  |
| Body type              | `unknown`                | Body structure varies by endpoint. Detailed validation can happen later using the endpoint's schema. |
| Private/localhost URLs | Allowed at schema level  | Network safety belongs to the Security Manager.                                                      |
| JSON parsing           | Separate from Zod        | Malformed JSON and structurally invalid JSON are different failure types.                            |
| Validation errors      | Throw descriptive errors | Allows the caller to handle failures consistently through the parsing contract.                      |

### Important architectural consideration

`.strict()` is appropriate for this particular LLM-generated request contract.

However, strict validation is not necessarily appropriate for every external JSON document. For example, an API response may legitimately contain additional fields.

Validation rules should be selected based on the contract and the purpose of the data.

## 7. Key Observations

1. Runtime validation checks actual data against a predefined schema.
2. TypeScript types do not exist at runtime.
3. JSON parsing and runtime schema validation are separate steps.
4. `.strict()` rejects unknown properties.
5. `z.unknown()` accepts any body structure and does not validate its internal contents.
6. A valid schema does not mean a request is safe to execute.
7. Security and authorization are separate checks, enforced outside the schema.
8. Schemas should be designed around the expected contract, not around arbitrary incoming data.
