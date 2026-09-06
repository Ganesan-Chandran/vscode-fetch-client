# Fetch Client

<div>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/icons/fetch-client.png?raw=true" alt="Fetch Client Icon" width="120" height="120">
  <br/>
</div>

**Fetch Client** is an open-source API testing toolkit consisting of a **VS Code extension** and a **cross-platform CLI**.

![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red.svg)
[![Visual Studio MarketplaceInstalls](https://vsmarketplacebadges.dev/installs-short/GanesanChandran.fetch-client.svg)](https://marketplace.visualstudio.com/items?itemName=GanesanChandran.fetch-client)
[![Visual Studio Version](https://vsmarketplacebadges.dev/version-short/GanesanChandran.fetch-client.svg)](https://marketplace.visualstudio.com/items?itemName=GanesanChandran.fetch-client)

<div>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/fetch-client-intro.gif?raw=true" alt="Fetch Client">
  <br/>
</div>

## 🚀 VS Code Extension

The Fetch Client extension lets you build, test, organize, and debug REST APIs without leaving VS Code. It stores all data locally and provides a fast, native experience for API development.

## ✨ Key Features

- 🚀 Lightweight and fast
- 🌙 Native VS Code theme support
- 🔒 Privacy first - all data is stored locally
- 🌐 Full REST API support (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- 🔐 Multiple authentication methods (Basic, Bearer Token, API Key, OAuth 2.0, AWS Signature)
- 📦 Support for JSON, XML, Form Data, URL Encoded, Binary, and GraphQL requests
- 🌍 Global, Collection, Request, and Environment variables
- 🔄 Dynamic variables and expression support
- 🧪 Built-in visual API testing (no scripting required)
- ✅ API Quality Check with security and best-practice validation
- ⚙️ Pre-requests with conditional execution
- 🎭 Built-in Mock Server for developing and testing APIs
- 📁 Collections, folders, request history, and cookie management
- ▶️ Run individual requests, folders, or entire collections
- 🔁 Data-driven testing using JSON, CSV, and Excel
- 🎲 Fake data generation for Data-driven testing
- ⚡ Performance testing with concurrent users and detailed metrics
- ⏰ Schedule and automate API requests
- 🔑 AWS Secrets Manager integration
- 🔒 TLS/mTLS client certificate support (PEM & PFX)
- 📥 Import from Fetch Client, Postman, Thunder Client, Insomnia, cURL, and OpenAPI
- 📤 Export collections to Fetch Client and Postman
- 📄 Export test and performance results as JSON, CSV, HTML, and XML
- 💻 Generate code snippets in multiple programming languages
- ⚡ Import and run cURL commands instantly
- 📊 Beautiful response viewer with Tree, Raw, HTML Preview, Headers, and Cookies
- 🔍 Search and filter requests, collections, and variables
- 🖥️ Cross-platform support (Windows, macOS, and Linux)
- 🆓 Free and open source

## Download

https://marketplace.visualstudio.com/items?itemName=GanesanChandran.fetch-client

## 🖥️ CLI

The Fetch Client CLI brings your API collections to the command line. It uses the same data as the VS Code extension, making it easy to automate API testing, execute collections, and integrate with CI/CD pipelines.

### Features

- 🖥️ Cross-platform (Windows, macOS, and Linux)
- ▶️ Run requests, folders, collections, all collections, or exported collections
- 📦 Execute exported collections without requiring the Fetch Client database
- ⚡ Performance testing with configurable virtual users and load models
- 📊 Data-driven testing using CSV or JSON data files
- 🧪 Execute API tests and validate responses
- ✅ API Quality Check with security and best-practice validation
- 🔗 Automatically execute Pre-Requests
- ⚙️ Configure and override variable sets
- 🔄 Import and execute raw cURL commands
- 📄 Generate JSON, XML, HTML, CSV, and NUnit reports
- 🤖 CI/CD friendly with appropriate exit codes
- 🚀 Lightweight with no additional server or services required

You don't need separate collections for your IDE and your automation. The CLI works directly with your existing Fetch Client database. The CLI and the VS Code extension share the same database. Any change you make in one shows up in the other right away.

### \***\* NEW FEATURE \*\***

Running an exported collection is completely self-contained.

- ✅ No Fetch Client database required
- ✅ No VS Code extension required
- ✅ Perfect for CI/CD pipelines
- ✅ Easy to share with teammates
- ✅ Great for running APIs on build agents or remote machines

## Download

https://www.npmjs.com/package/@fetch-client/cli

## Documentation

Complete guides, examples, and CLI documentation are available on the documentation site.

https://fetchclient.github.io/

## 🖥️ Running the extension locally for development

- Clone the [vscode-fetch-client](https://github.com/Ganesan-Chandran/vscode-fetch-client) repo.
- Run `npm install` command to install dependencies.
- Press `F5` to open an extension development window with `fetch-client` extension loaded.

## 🔒 Privacy

- Fetch client **`DOES NOT`** collect any your personal or request data.
- Fetch client has no back-end storage and all your data are stored **`LOCALLY`** on your computer.

## 📝 Changelog

See the [release notes](https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/CHANGELOG.md) for the full set of changes.

## ✒️ Author

[Ganesan Chandran](https://ganesan-chandran.github.io/)

## 📜 License

See the [license](https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/LICENSE) details.

## 👍 Contribution

Feel free to submit a pull request if you find any bugs or new feature (To see a list of active issues/feature request,
visit the [Issues section](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues)). Please make sure all commits are properly documented.
