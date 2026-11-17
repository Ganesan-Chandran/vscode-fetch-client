# LLM Basics – Day 2

## 1. Objective

Understand how LLMs work practically.

## 2. Concepts Learned

- LLM
- Token
- Prompt
- Context Window
- Temperature
- Hallucination
- Structured Output
- LLM vs AI Agent

## 3. Prompt Experiments

### Experiment 1 – Basic Prompt

Record the generated output and observations.

### Experiment 2 – Detailed Prompt

Record the differences.

### Experiment 3 – Context-Based Prompt

Record how context improved or changed results.

## 4. API Test Case Generation

Record:

- Generated test cases
- Missing test cases
- Incorrect assumptions
- Improvements required

## 5. Structured JSON Experiment

Record:

- Was the JSON valid?
- Did it follow the expected structure?
- Were there missing properties?
- Were data types correct?

## 6. LLM Limitations

Document hallucinations, inconsistent output, context limitations, latency and security risks.

## 7. Fetch Client Architecture Implications

- Prompt management
- Context management
- Output validation
- Security validation
- Human approval
- Error handling

## 8. Key Learnings

- Basic LLM terms and its meanings.
- Prompt is very important to quality of the output and expected structure.
- We don't blindly accept the LLM responses. We have to validate the response and do the checks.

## 9. Practical Experiment Observations

### Prompt Quality

- Prompt instructions significantly influence output quality.
- Detailed prompts produce more relevant and complete test cases.
- Providing application-specific context improves the relevance of responses.
- Better prompts can reduce incorrect assumptions and hallucinations, but cannot eliminate them.

### API Test Case Generation

- Basic prompts initially missed important scenarios, including security-related test cases.
- Detailed instructions helped identify additional test scenarios.
- The LLM may make assumptions about API behavior when requirements are incomplete.
- Expected behavior must be verified against actual API specifications.

### Structured JSON Output

- JSON responses can have inconsistent property names and structures.
- Valid JSON does not necessarily mean valid application data.
- A predefined schema is necessary for predictable output.
- Application-side validation is required before processing or saving generated data.

## 10. Key Architectural Decisions

Based on today's experiments:

1. Maintain reusable and versioned prompts.
2. Provide relevant Fetch Client context to the LLM.
3. Define strict JSON schemas for generated data.
4. Validate all LLM responses before processing.
5. Implement security checks independently of the LLM.
6. Require user approval before sensitive operations.
7. Never blindly trust generated responses.

## 11. Key Learning

An LLM is a powerful generation engine, but it is not a source of guaranteed truth.

Fetch Client must control how generated information is validated, secured, executed and stored.
