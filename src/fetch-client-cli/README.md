# Fetch Client CLI

> Run, test, and automate your Fetch Client requests directly from the terminal.

Fetch Client CLI is the official command-line interface for the **Fetch Client** VS Code extension. It allows you to execute requests, collections, and folders without opening VS Code, making it ideal for automation, CI/CD pipelines, and scripting.

---

## Features

- 🚀 Execute API requests from the terminal
- 📁 Run individual requests, folders, or collections
- 🔄 Run every collection with a single command
- 🌍 Environment and variable support
- 📄 Export test reports
- ✅ Exit codes for CI/CD pipelines
- 🔐 Supports encrypted variables
- ⚡ Fast execution with minimal dependencies
- 🖥️ Cross-platform (Windows, macOS, Linux)

---

## Installation

### npm

```bash
npm install -g @fetch-client/cli
```

Verify the installation:

```bash
fc-cli --version
```

---

## Quick Start

Run a request:

```bash
fc-cli run --req "Get Users"
```

Run a folder:

```bash
fc-cli run --fol "User APIs"
```

Run a collection:

```bash
fc-cli run --col "REST APIs"
```

Run all collections:

```bash
fc-cli run --col --all
```

---

## Documentation

Complete documentation is available at:

https://fetchclient.github.io/docs/cli/introduction

Topics include:

- Installation
- Commands
- Variables
- Reports
- CI/CD Integration
- Examples
- Troubleshooting

---

## VS Code Extension

Create, organize, and test APIs visually using the Fetch Client VS Code extension.

Marketplace:

https://marketplace.visualstudio.com/items?itemName=FetchClient.fetch-client

---

## CI/CD

Fetch Client CLI can be integrated into:

- GitHub Actions
- Azure DevOps
- Jenkins
- GitLab CI

Example:

```yaml
- name: Install Fetch Client CLI
  run: npm install -g @fetch-client/cli

- name: Execute API Tests
  run: fetch-client run --collection "Regression"
```

---

## Requirements

- Node.js 18+
- Fetch Client data directory (created by the Fetch Client VS Code extension)

---

## Support

- Documentation: https://fetchclient.github.io/
- Issues: https://github.com/Ganesan-Chandran/vscode-fetch-client/issues

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a Pull Request

---

## 📜 License

See the [license](https://github.com/Ganesan-Chandran/vscode-fetch-client/src/fetch-client-cli/blob/main/LICENSE) details.

---

## ✒️ Author

[Ganesan Chandran](https://ganesan-chandran.github.io/)
