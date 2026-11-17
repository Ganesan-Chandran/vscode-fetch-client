# 🔒 Security

[![Security Scan](https://github.com/Ganesan-Chandran/vscode-fetch-client/actions/workflows/security.yml/badge.svg)](https://github.com/Ganesan-Chandran/vscode-fetch-client/actions/workflows/security.yml)
[![CodeQL](https://img.shields.io/badge/CodeQL-Enabled-blue?logo=github)](https://github.com/Ganesan-Chandran/vscode-fetch-client/security/code-scanning)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Ganesan-Chandran/vscode-fetch-client/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Ganesan-Chandran/vscode-fetch-client)
[![Known Vulnerabilities](https://snyk.io/test/github/Ganesan-Chandran/vscode-fetch-client/badge.svg)](https://snyk.io/test/github/Ganesan-Chandran/vscode-fetch-client)

We take security seriously. This project is automatically checked for vulnerabilities on every push, every pull request, and weekly.

| Check                      | Tool              | What it covers                 |
| -------------------------- | ----------------- | ------------------------------ |
| Dependency vulnerabilities | Dependabot, Trivy | Known CVEs in libraries        |
| Static code analysis       | Semgrep / CodeQL  | Insecure code patterns         |
| Secret detection           | Gitleaks          | Leaked keys, tokens, passwords |
| Container / IaC scan       | Trivy             | Docker images and config files |

## Security Policy

### Supported Versions

Only the latest version maintained on the `main` branch receives security fixes.

| Version         | Supported |
| --------------- | --------- |
| Latest (`main`) | ✅        |
| Older releases  | ❌        |

### Reporting a Vulnerability

Please **do not open a public GitHub issue** to report security vulnerabilities.

Instead, use GitHub's private vulnerability reporting:

[Report a Security Vulnerability](https://github.com/Ganesan-Chandran/vscode-fetch-client/security/advisories/new)

When reporting a vulnerability, please include:

- A description of the vulnerability.
- Steps to reproduce the issue.
- The potential security impact.
- Any proof of concept or relevant screenshots, if available.

### Response Process

- Security reports will be reviewed privately.
- The issue will be investigated and its severity assessed.
- If confirmed, a security fix will be developed.
- A security update will be released when appropriate.

Please allow reasonable time for investigation and remediation before publicly disclosing the vulnerability.

### Security Scanning

Fetch Client uses automated security tools to improve code and dependency security:

- **GitHub CodeQL:** Source code vulnerability analysis.
- **Trivy:** Dependency vulnerability, secret and configuration scanning.
- **OpenSSF Scorecard:** Repository security practices assessment.
- **Dependabot:** Dependency vulnerability alerts and security updates.

Automated scanning helps identify known security risks but cannot guarantee that the software is completely free of vulnerabilities.
