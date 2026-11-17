# Security Policy

## Supported Versions

Only the latest version maintained on the `main` branch receives security fixes.

| Version | Supported |
|---|---|
| Latest (`main`) | ✅ |
| Older releases | ❌ |

## Reporting a Vulnerability

Please **do not open a public GitHub issue** to report security vulnerabilities.

Instead, use GitHub's private vulnerability reporting:

[Report a Security Vulnerability](https://github.com/Ganesan-Chandran/vscode-fetch-client/security/advisories/new)

When reporting a vulnerability, please include:

- A description of the vulnerability.
- Steps to reproduce the issue.
- The potential security impact.
- Any proof of concept or relevant screenshots, if available.

## Response Process

- Security reports will be reviewed privately.
- The issue will be investigated and its severity assessed.
- If confirmed, a security fix will be developed.
- A security update will be released when appropriate.

Please allow reasonable time for investigation and remediation before publicly disclosing the vulnerability.

## Security Scanning

Fetch Client uses automated security tools to improve code and dependency security:

- **GitHub CodeQL:** Source code vulnerability analysis.
- **Trivy:** Dependency vulnerability, secret and configuration scanning.
- **OpenSSF Scorecard:** Repository security practices assessment.
- **Dependabot:** Dependency vulnerability alerts and security updates.

Automated scanning helps identify known security risks but cannot guarantee that the software is completely free of vulnerabilities.