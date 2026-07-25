# Fetch Client CLI

> Run, test, and automate your Fetch Client requests directly from the terminal.

Fetch Client CLI is the official command-line interface for the [**Fetch Client**](https://marketplace.visualstudio.com/items?itemName=GanesanChandran.fetch-client) VS Code extension. It allows you to execute requests, collections, and folders without opening VS Code, making it ideal for automation, CI/CD pipelines, and scripting.

## ❓ Why use Fetch Client CLI?

Many development workflows need API testing outside an IDE. Fetch Client CLI lets you:

- 🖥️ Cross-platform (Windows, macOS, and Linux)
- ▶️ Run requests, folders, collections, all collections, or exported collections
- 📦 Execute exported collections without requiring the Fetch Client database
- ⚡ Performance testing with configurable virtual users and load models
- 📊 Data-driven testing using CSV or JSON data files
- 🧪 Execute API tests and validate responses
- 📦 Execute exported collections without requiring the Fetch Client database
- 🔗 Automatically execute Pre-Requests
- ⚙️ Configure and override variable sets
- 🔄 Import and execute raw cURL commands
- 📄 Generate JSON, XML, HTML, CSV, and NUnit reports
- 🤖 CI/CD friendly with appropriate exit codes
- 🚀 Lightweight with no additional server or services required

You don't need separate collections for your IDE and your automation. The CLI works directly with your existing Fetch Client database. The CLI and the VS Code extension share the same database. Any change you make in one shows up in the other right away.

**NEW FEATURE**

Running an exported collection is completely self-contained.

- ✅ No Fetch Client database required
- ✅ No VS Code extension required
- ✅ Perfect for CI/CD pipelines
- ✅ Easy to share with teammates
- ✅ Great for running APIs on build agents or remote machines


## ✨ Key Features

| Feature | What it does |
| ------- | ------------ |
| **Run Requests** | Runs a single request |
| **Run Folders** | Runs every request inside a folder |
| **Run Collections** | Runs an entire collection |
| **Run Exported Collections** | Executes requests directly from exported collection JSON files |
| **Variables** | Use global, collection, and environment variables |
| **Pre-Requests** | Runs dependent (PreFetch) requests automatically before the main request |
| **Tests** | Validates API responses using test assertions |
| **Performance Testing** | Load test requests, folders, and collections with configurable virtual users |
| **Data-Driven Testing** | Execute requests repeatedly using CSV or JSON data files |
| **Report Export** | Export reports in JSON, CSV, HTML, XML, and NUnit formats |
| **cURL Support** | Execute raw cURL commands directly from the CLI |
| **CI/CD Support** | Works with GitHub Actions, Azure DevOps, Jenkins, GitLab CI, and more |
| **Cross Platform** | Runs on Windows, macOS, and Linux |

## ⚙️ How It Works

The CLI reads the same database as the VS Code extension. This means you can switch between the two anytime - nothing needs to be copied or re-created.

```text
                    +----------------------+
                    |    Fetch Client       |
                    |  VS Code Extension    |
                    +----------+-----------+
                               |
                     Shared Database Files
                               |
            +------------------+------------------+
            |                                     |
+-----------v-----------+              +----------v-----------+
|   Fetch Client CLI     |              |   VS Code Extension   |
|                        |              |                       |
| Run Requests           |              | Create Requests       |
| Run Collections        |              | Edit Requests         |
| Run Performance Tests  |              | Manage Variables      |
| Generate Reports       |              | Organize Collections  |
+------------------------+              +-----------------------+

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

Complete documentation is available at [Fetch Client CLI](https://fetchclient.github.io/docs/cli/introduction)

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
