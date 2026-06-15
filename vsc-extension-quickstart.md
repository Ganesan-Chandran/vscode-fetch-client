![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-red.svg)

## What is Fetch Client?

**REST API testing without leaving VS Code** 🚀

Fetch Client is a lightweight VS Code extension designed for testing REST APIs directly within your editor. Perfect for developers who want to stay productive without switching between multiple tools.

## Why Fetch Client?

✅ **100% Open Source** - Complete transparency and community-driven development

✅ **Lightweight & Fast** - Minimal resource usage, instant response times

✅ **Theme Support** - Fully customizable UI that respects your VS Code theme

✅ **No Backend Required** - All data stored locally on your machine (Privacy-first)

✅ **Developer-Friendly** - Intuitive interface with powerful features

✅ **Team Collaboration** - Save collections in your workspace for version control

## 📦 Prerequisites

- **VS Code**: v1.90 or higher
- **Node.js**: Required only for local development (v22+)

## 🚀 Quick Start

1. **Install**: Open VS Code → Extensions (`Ctrl+Shift+X`) → Search "Fetch Client" → Click Install
2. **Open**: Click the Fetch Client icon in the Activity Bar or press `Ctrl+Alt+N`
3. **Create Request**: Click "New Request" in the Quick Access bar
4. **Test API**: Enter your URL, select HTTP method, and click "Send"
5. **View Response**: See formatted response with syntax highlighting and tree view

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Horizonal_Accordian_Split.gif?raw=true" alt="Fetch Client Extension Demo" width="600"/>
  <br/>
  <sup><b>Fetch Client in Action</b></sup>
</div>

## 📋 Feature Overview

Fetch Client supports comprehensive REST API testing with:

| Feature Category | Capabilities |
|---|---|
| **HTTP Methods** | GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS |
| **Authentication** | Basic Auth, Bearer Token, API Key, AWS Signature, OAuth 2.0 |
| **Request Body** | Form, Form-Encoded, Raw (JSON/Text/XML), Binary, GraphQL |
| **Response Handling** | JSON/XML Tree View, HTML Preview, Syntax Highlighting |
| **Testing** | Response code, body, time, headers, and JSON properties |
| **Collections** | Organize, import/export, run all requests, team sharing |
| **Environment** | Global, collection-level, and request-level variables |
| **Developer Tools** | Code snippet generation (9+ languages), cURL import, logs, cookies |

## 🔗 Full Feature Documentation

* [UI Customization](#uicustomization)
* [HTTP Methods](#httpmethods)
* [Query Parameters](#queryparams)
* [Authorization](#auth)
* [Headers](#headers)
* [Request Body](#reqbody)
* [Testing](#test)
* [Environment Variables](#setvar)
* [Response Data](#resdata)
* [Test Results](#testresults)
* [Pre-requests](#prerequests)
* [Notes](#notes)
* [Code Snippets](#codesnippet)
* [Quick Access](#quickaccess)
  * [History](#history)
  * [Collections](#collection)
  * [Environment Variables](#envvar)
* [Run All Requests](#runall)
* [Cookie Management](#managecookies)
* [cURL Support](#runcurl)
* [System Variables](#systemvariables)
* [Logs](#logs)
* [Workspace](#workspace)

---

<a name="uicustomization"></a>

### 1) UI Customization

Customize the interface layout to match your workflow:

* **Horizontal Mode**
  * Accordion View - Stacked sections
  * Split View - Side-by-side panels
* **Vertical Mode**
  * Split View - Stacked panels

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Horizonal_Accordian_Split.gif?raw=true" alt="Fetch Client-Horizontal mode(Accordion View)" width="650"/>
  <br/>
  <sup><b>Horizontal Mode - Accordion View</b></sup>
  <br/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Horizonal_Split.gif?raw=true" alt="Fetch Client-Horizontal mode(Split View)" width="650"/>
  <br/>
  <sup><b>Horizontal Mode - Split View</b></sup>
  <br/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Vertical_Split.gif?raw=true" alt="Fetch Client-Vertical mode(Split View)" width="650"/>
  <br/>
  <sup><b>Vertical Mode - Split View</b></sup>
</div>

<a name="httpmethods"></a>

### 2) HTTP Methods

Test REST APIs using all standard HTTP methods:
- **GET** - Retrieve data
- **POST** - Create resources
- **PUT** - Update entire resources
- **PATCH** - Partial updates
- **DELETE** - Remove resources
- **HEAD** - Like GET without response body
- **OPTIONS** - Describe communication options

<a name="queryparams"></a>

### 3) Query Parameters

Add query parameters to your requests with:
- Key-value pair editor
- Automatic URL encoding
- Validation and suggestions

<a name="auth"></a>

### 4) Authorization

Support for multiple authentication mechanisms:

* **Basic Auth** - Username and password
* **Bearer Token** - JWT and token-based auth
* **API Key** - Header or query parameter keys
* **AWS Signature** - AWS authentication
* **OAuth 2.0** - OAuth token flow

<a name="headers"></a>

### 5) Headers

Add custom headers with intelligent features:
- Auto-complete suggestions for common headers
- Header value recommendations
- Easy-to-use key-value editor

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/header-suggestion.png?raw=true" alt="Header search"/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/header-value-suggestion.png?raw=true" alt="Header suggestion"/>
</div>

<a name="reqbody"></a>

### 6) Request Body

Support for multiple content types:

* **Form** - Multipart form data
* **Form-Encoded** - URL-encoded form data
* **Raw** 
  * JSON
  * Plain Text
  * XML
* **Binary File** - Upload files (auto Content-Type detection)
* **GraphQL** - GraphQL query and variables

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/raw-content-type-suggestion.png?raw=true" alt="Body request(Binary format)" width="650"/>
</div>

<a name="test"></a>

### 7) Testing

Create and run tests without writing code:

* **Test Response Properties**
  * Response status code
  * Response body content
  * Response time/performance
  * Content-Type header
  * Content-Length header
  * Content-Encoding header
  * Specific header values
  * Specific JSON property values

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/test-menu.png?raw=true" alt="Visual test editor" width="650"/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Test.gif?raw=true" alt="Visual test case and test results" width="650"/>
  <br/>
  <sup><b>Test Case Creation & Results</b></sup>
</div>

<a name="setvar"></a>

### 8) Environment Variables

Extract and reuse data from responses:

* Set variables from:
  * Response body (JSON properties)
  * Response headers
  * Cookies
* Create variables at multiple scopes:
  * Global level
  * Collection level
  * Request level
* Use `{{variableName}}` syntax anywhere in requests

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/setvar.png?raw=true" alt="assign variables" width="650"/>
</div>

<a name="resdata"></a>

### 9) Response Data

Comprehensive response analysis:

* **Syntax Highlighting** - Color-coded response data
* **Tree View** - Hierarchical view for JSON and XML
* **HTML Preview** - Visual preview for HTML responses
* **Copy Response** - One-click copy to clipboard
* **Download** - Save response as file
* **Response Metadata**
  * Status code
  * Response time
  * Response size
  * Response headers

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/response.png?raw=true" alt="response view" width="650"/>
</div>

<a name="testresults"></a>

### 10) Test Results

Automated test execution and reporting:

* **Detailed Results** - Shows expected vs. actual values
* **Pass/Fail Status** - Clear indication of test outcomes
* **Export Results** - Download as JSON file for documentation

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/test-result.png?raw=true" alt="Test results" width="650"/>
</div>

<a name="prerequests"></a>

### 11) Pre-requests

Run setup requests before main API calls:

* **Multi-level Setup** - Request, folder, or collection level
* **Conditional Execution** - Run pre-requests based on conditions
* **Dependency Management** - Configure pre-request dependencies in settings

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/prerequests.png?raw=true" alt="Pre-requests" width="650"/>
</div>

<a name="notes"></a>

### 12) Notes & Documentation

Add documentation to requests:

* **Request Notes** - Document purpose and usage
* **Simple Editor** - Easy-to-use markdown editor
* **Team Knowledge** - Share context with team members

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/notes.png?raw=true" alt="notes" width="500"/>
</div>

<a name="codesnippet"></a>

### 13) Code Snippets

Generate production-ready code for your requests:

**Supported Languages:**
* C
* C#
* Go
* Java
* JavaScript
* Node.js
* PHP
* Python
* Shell/cURL

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/code-snippet.png?raw=true" alt="code snippet generation"/>
</div>

<a name="quickaccess"></a>

### 15) Quick Access

Sidebar features for fast workflow:

<a name="history"></a>

#### History

* **Auto-Save** - All requests automatically saved to history
* **Quick Reuse** - Click any history item to load it
* **Save to Collection** - Move history items to collections
* **Bulk Delete** - Clear all or specific history items

<a name="collection"></a>

#### Collections

Organize and share API requests:

* **Request Organization** - Create folders and collections
* **Batch Operations** - Run all requests in collection
* **Environment Linking** - Attach variables to collections
* **Export/Import** - Share collections as JSON files
* **Format Support** - Import from Fetch Client, Postman (v2.1), Thunder Client (v1.2)
* **Collection Settings** - Override auth, headers, and pre-requests per collection

**How to Import Collections:**
1. Open Collections tab in sidebar
2. Click menu icon → Select "Import"
3. Choose collection file (Fetch Client/Postman/ThunderClient format)
4. Configure collection-level settings (optional)

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/collection-menu.png?raw=true" alt="Collection menu"/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/import-col-menu.png?raw=true" alt="Import Collection"/>
</div>

<a name="envvar"></a>

#### Environment Variables

Dynamic variable management:

* **Multi-Scope Variables**
  * Global level - Available everywhere
  * Collection level - Scoped to collection
  * Request level - Single request only
* **Encrypted Storage** - Sensitive data protected
* **Usage** - Use `{{variableName}}` in URLs, params, headers, and body
* **Export/Import** - JSON-based file format
* **Format Support** - Fetch Client, Postman (v2.1), Thunder Client (v1.2)

**How to Import Variables:**
1. Open Environment Variables tab in sidebar
2. Click menu icon → Select "Import"
3. Choose variable file
4. Variables automatically available in all requests

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/quick-access.gif?raw=true" alt="Sidebar quick access" width="200"/>
</div>

<a name="runall"></a>

### 16) Run All Requests

Execute entire collections with advanced options:

* **Batch Execution** - Run all collection requests in one go
* **Execution Mode** - Sequential or parallel execution
* **Custom Order** - Reorder request execution sequence
* **Results Export** - Download results as JSON or CSV
* **Request Inspection** - Click any result to view full request details

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/run-all-menu.png?raw=true" alt="Run All menu"/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/run-all.png?raw=true" alt="Run All UI" width="650"/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/run-all-settings.png?raw=true" alt="Run All settings" width="650"/>
</div>

<a name="managecookies"></a>

### 17) Cookie Management

Handle HTTP cookies automatically:

* **View Cookies** - See all stored cookies
* **Delete Cookies** - Remove specific or all cookies
* **Auto-Include** - Cookies automatically added to requests
* **Manual Override** - Edit cookies via Cookie header

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/manage-cookies-menu.png?raw=true" alt="Manage Cookies Menu"/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/manage-cookies.png?raw=true" alt="Manage Cookies UI" width="650"/>
</div>

<a name="runcurl"></a>

### 18) cURL Support

Import and execute cURL commands:

* **cURL Import** - Convert cURL to Fetch Client request
* **Direct Execution** - Run cURL commands directly
* **Format Support** - Works with standard cURL syntax

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/import-curl-menu.png?raw=true" alt="Import Curl Menu" \/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/import-curl.png?raw=true" alt="Import Curl" width="650"/>
  <br/>
  <sup><b>Import cURL Request</b></sup>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/run-curl.png?raw=true" alt="Run Curl Command" width="650"/>
  <br/>
  <sup><b>Execute cURL Request</b></sup>
</div>

<a name="systemvariables"></a>

### 19) System Variables

Generate dynamic test data automatically:

| Variable | Example Output | Description |
|---|---|---|
| `{{#num}}` | 542891 | Random number (1-999999) |
| `{{#num, min, max}}` | 75 | Random number in range |
| `{{#str}}` | AbcXyzDef | Random alphabetic string |
| `{{#strspl}}` | Abc@#$Xyz | String with special chars |
| `{{#strnum}}` | Abc123Xyz | String with numbers |
| `{{#char}}` | A | Single random character |
| `{{#rdate}}` | 05/15/1956 | Random date |
| `{{#date}}` | 12/09/2024 | Today's date |
| `{{#dateISO}}` | 2024-12-09T10:30:00Z | ISO format date |
| `{{#date, 'format'}}` | 09-Dec-2024 | Custom format date |
| `{{#email}}` | abc123@example.com | Random email |
| `{{#guid}}` | 550e8400-e29b-41d4-a716-446655440000 | UUID |
| `{{#bool}}` | true | Random boolean |

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/systemvariables.png?raw=true" alt="System variables" width="650"/>
</div>

<a name="logs"></a>

### 20) Logs

Monitor request/response activity:

* **View Logs** - Click "View Log" button in sidebar
* **Output Window** - Logs displayed in VS Code Output panel
* **Customization** - Configure log level in settings (request only or request+response)

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/logs.png?raw=true" alt="Logs" width="650"/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/logs-settings.png?raw=true" alt="Logs settings" width="650"/>
</div>

<a name="workspace"></a>

### 21) Workspace

Collaborative request management:

* **Save to Workspace** - Store all requests in workspace folder
* **Auto Organization** - Fetch Client creates `fetch-client` folder
* **Team Sharing** - Commit to version control for team access
* **Enable** - Toggle in Fetch Client settings

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/workspace.png?raw=true" alt="Workspace settings" width="650"/>
</div>

> ⚠️ **Important**: Do not manually edit configuration files. Configuration is managed automatically. Manual editing may cause data loss.

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/workspace1.png?raw=true" alt="Workspace settings" width="650"/>
</div>

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+P` → Type "Fetch Client - New Request" | Create new request |
| `Ctrl+Alt+N` | Open Fetch Client view |
| `Enter` (in URL box) | Send request |
| `Cmd/Ctrl + S` | Save request without sending |

## ⚙️ Configuration

### How to Access Settings

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "Fetch Client"
3. Adjust settings as needed

### Available Settings

| Setting | Default | Description |
|---|---|---|
| `fetch-client.layout` | Horizontal Split | Main layout mode (Horizontal/Vertical) |
| `fetch-client.horizontalLayout` | Accordion Style | Horizontal sub-layout (Accordion/Split) |
| `fetch-client.SSLCheck` | true | Enable SSL certificate validation |
| `fetch-client.historyLimit` | 25 | Maximum history items to retain |
| `fetch-client.timeOut` | 5 min | Request timeout duration |
| `fetch-client.defaultProtocol` | http | Default protocol for URLs without one |

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/fetch-client-setting.png?raw=true" alt="Fetch Client settings" width="650"/>
</div>

## 🚀 Tech Stack

Built with modern technologies:

| Component | Technology |
|---|---|
| **Extension** | [VS Code Extension API](https://code.visualstudio.com/api) |
| **UI** | [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [CSS](https://www.w3schools.com/css/) |
| **Editor** | [Monaco Editor](https://microsoft.github.io/monaco-editor/) |
| **Database** | [LokiJS](https://techfort.github.io/LokiJS/) (Local) |
| **Code Generation** | [httpsnippet](https://github.com/Kong/httpsnippet/) |

## 🖥️ Development Setup

### Requirements
* Node.js v14 or higher
* npm or yarn

### Getting Started

```bash
# Clone repository
git clone https://github.com/Ganesan-Chandran/vscode-fetch-client.git
cd vscode-fetch-client

# Install dependencies
npm install

# Start development
# Press F5 in VS Code to launch extension development window
```

## 🔒 Privacy & Security

✅ **No Data Collection** - Fetch Client does NOT collect any personal or request data

✅ **Local Storage Only** - All data stored locally on your computer

✅ **No Backend** - No cloud storage or third-party dependencies

✅ **Open Source** - Complete code transparency for security audit

## ❓ FAQ

### Q: Does Fetch Client cost anything?
**A:** No, Fetch Client is completely free and open source.

### Q: Can I use Fetch Client offline?
**A:** Yes! All features work offline. Only the actual HTTP requests require internet.

### Q: How do I export my requests and collections?
**A:** Use the export feature in the Collections tab to download as JSON. These can be imported into other Fetch Client installations or shared with teammates.

### Q: Is my sensitive data (passwords, API keys) safe?
**A:** Yes. All data is stored locally on your computer, and environment variables are encrypted. Nothing is sent to external servers.

### Q: Can I migrate from Postman/Thunder Client?
**A:** Yes! Fetch Client supports importing collections and environment variables from both Postman (v2.1) and Thunder Client (v1.2).

### Q: Does Fetch Client work with authentication?
**A:** Yes! Supports Basic Auth, Bearer Token, API Key, AWS Signature, and OAuth 2.0.

### Q: Can I run requests in bulk?
**A:** Yes! Use the "Run All" feature to execute entire collections sequentially or in parallel, and export results as JSON or CSV.

### Q: How do I report bugs or request features?
**A:** Visit the [Issues section](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues) to report bugs or request features. Please search first to avoid duplicates.

### Q: Can I use Fetch Client for team collaboration?
**A:** Yes! Save collections in your workspace folder and commit to version control. Your team can then import and use the same collections.

### Q: What HTTP methods are supported?
**A:** GET, POST, PUT, PATCH, DELETE, HEAD, and OPTIONS.

## 📝 Changelog

See the [release notes](https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/CHANGELOG.md) for detailed version history and features.

## ✒️ Author

[Ganesan Chandran](https://ganesan-chandran.github.io/)

## 📜 License

See the [license](https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/LICENSE) details.

## 👍 Contributing

Contributions are welcome! Before submitting a pull request:

1. **Check existing issues** - Browse the [Issues section](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues) for active discussions
2. **Fork & branch** - Create a feature branch for your changes
3. **Document commits** - Write clear, descriptive commit messages
4. **Test thoroughly** - Ensure your changes don't break existing features
5. **Submit PR** - Include a clear description of your changes

### Quick Links
- [Report Bug](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/new?labels=bug)
- [Request Feature](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/new?labels=enhancement)
- [View All Issues](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues)

---

<div align="center">
  Made with ❤️ by <a href="https://ganesan-chandran.github.io/">Ganesan Chandran</a>
  <br/>
  <br/>
  <a href="https://github.com/Ganesan-Chandran/vscode-fetch-client">⭐ Star on GitHub</a> • 
  <a href="https://github.com/Ganesan-Chandran/vscode-fetch-client/issues">📝 Report Issues</a> • 
  <a href="https://github.com/Ganesan-Chandran/vscode-fetch-client/discussions">💬 Discussions</a>
</div>
