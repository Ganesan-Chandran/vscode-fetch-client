# Fetch Client

<div>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/icons/fetch-client.png?raw=true" width="120" height="120">
  <br/>
</div>

## What is Fetch Client ?

**`"Don't leave from VSCode, Stay with it`** - For Rest API testing. 😎

Fetch Client is Visual Studio Code extension which is used to test the Rest API.

## Why Fetch Client ?

* Open Source
* Lightweight
* UI Customization and support VSCode Themes.
* Test Rest API request with GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS methods.
* Run curl requests.
* Various authorization mechcanisms such as Basic Auth, Bearer Token, API Key and AWS Signature.
* Various post body which are Form, Form-Encoded, Raw (Json, Plain Text, XML), Binary File and GraphQL.
* Syntax highlight for Response data.
* Tree view for JSON and XML responses and HTML preview for HTML responses.
* History, Collection, Environment Variable is supported.
* Test the API request and response data without any scripts/code.
* Generate code snippet for various languages.
* Save response and test results as File.
* Export/Import the Fetch Client's collections and environment variables.
* Add documentation/feedback for each request.
* Set the environment variable data from the response.
* Manage the Cookies.

## 📦 How to Install ?

  * Install via VSCode Extensions 
    * Open VSCode Extensions panel using `Ctrl+Shift+X` shortcut.
    * Type `Fetch Client` in Search bar.
    * Select the `Fetch Client` and install the extension.
    <div align="center">
      <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/fetch-client-search.png?raw=true"/>
      <br/>
    </div>

## 💡 How to use ?

* Click the `Fetch Client` icon on the activity bar (left side of the VSCode) or use the `Ctl+Alt+N` shortcut.
* On the Fetch Client `Quick Access` bar, click the `New Request` button to test the Rest API.
* Select the `Http method` and enter the `URL` and other parameters such as query parameters, headers, auth details, request body (if required) and click the `Send` button.
* The response data will be displayed in the `Response` section. We can view the response data in the Tree view format for `JSON` and `XML` responses and HTML preview for `HTML` responses.
* All existing requests are available in the `History` section in the Quick Access Bar.
<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Horizonal_Accordian_Split.gif?raw=true"/>
  <br/>
  <sup><b>Fetch Client v1.0.0</b></sup>
</div>

## 🔗 Features

* [UI Customization](#uicustomization)
* [HTTP Methods](#httpmethods)
* [Query Parameter](#queryparams)
* [Authorization](#auth)
* [Headers](#headers)
* [Request Body](#reqbody)
* [Test](#test)
* [Set Environment Variable](#setvar)
* [Response Data](#resdata)
* [Test Results](#testresults)
* [Notes](#notes)
* [Code Snippet](#codesnippet)
* [Request Cancel](#reqcancel)
* [Quick Access](#quickaccess)
    * [History](#history)
    * [Collection](#collection)
    * [Environment Variable](#envvar)
* [Run All requests](#runall)
* [Manage Cookies](#managecookies)
* [Run/Import Curl Request](#runcurl)

<a name="uicustomization"></a>
### 1) UI Customization

We can customize the UI in different modes.
  * Horizontal mode
      * Accordian View
      * Split View
  * Vertical mode
      * Split View

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Horizonal_Accordian_Split.gif?raw=true"/>
  <br/>
  <sup><b>Horizontal mode - Accordian View</b></sup>
  <br/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Horizonal_Split.gif?raw=true"/>
  <br/>
  <sup><b>Horizontal mode - Split View</b></sup>
  <br/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Vertical_Split.gif?raw=true"/>
  <br/>
  <sup><b>Vertical mode - Split View</b></sup>
</div>

<a name="httpmethods"></a>
### 2) Different HTTP Methods

Fetch client supports to test the Rest API request with various HTTP methods such as GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS.

<a name="queryparams"></a>
### 3) Query Parameter

Fetch client supports to test the Rest API request with query parameter.

<a name="auth"></a>
### 4) Authorization
Fetch client supports below authorization methods for Rest API testing.
* Basic Auth
* Bearer Token
* API Key
* AWS Signature

<a name="headers"></a>
### 5) Headers

We can add the headers for API testing. Fetch Client gives the suggestion on various headers and corresponding values in the header section.
<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/header-suggestion.png?raw=true"/>
  <br/>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/header-value-suggestion.png?raw=true"/>
</div>

<a name="reqbody"></a>
### 6) Request Body

  * Fetch client supports below request body.
    * Form
    * Form-Encoded
    * Raw ( JSON, Plain Text, XML )
    * Binary File
    * GraphQL
  * `Content-Type` header will be automatically added based on binary file type.

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/raw-content-type-suggestion.png?raw=true"/>
</div>

<a name="test"></a>
### 7) Test

  * We can test the API request and response data without any scripts/code in the Fetch client. 
  * It supports to test the below data,
    * Response Code
    * Response Body
    * Response Time
    * Content-Type
    * Content-Length
    * Content-Encoding
    * Specific Response Header value
    * Specific JSON property value in the JSON response

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/Test.gif?raw=true"/>
  <br/>
  <sup><b>Fetch Client - Test Case/Test Results</b></sup>
</div>

<a name="setvar"></a>
### 8) Set Environment Variable

* Fetch client supports the set the environment variable data from the response, headers and cookies.

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/setvar.png?raw=true"/>
  <br/>
</div>

<a name="resdata"></a>
### 9) Response Data

* Fetch client supports Syntax highlight for Response data.
* Copy the response data using `Copy` button.
* It supports Tree view for JSON and XML responses and HTML preview for HTML responses.
* Download the response data as file.
* View the status code, response time and size of the response data.
* View response headers.

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/response.png?raw=true"/>
</div>

<a name="testresults"></a>
### 10) Test Results

* Once request is processed, Fetch client executes the test cases and display the test result with expected value and actual value.
* We can download the test results as JSON file.

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/test-result.png?raw=true"/>
</div>

<a name="notes"></a>
### 11) Notes

Notes section is used to add the notes or documentation regarding the request. Fetch client has simple editor to add the documentation.

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/notes.png?raw=true"/>
</div>

<a name="codesnippet"></a>
### 12) Code Snippet

Fetch client supports code snippet generation for various languages. Generate code snippets to send request from another application. Open request view and click icon (right side of the response section) for code snippet generation. The code snippet generation is available for following languages.
  * C
  * C#
  * Go
  * Java
  * JavaScript
  * Node
  * PHP
  * Python
  * Shell

<div align="center">
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/code-snippet.png?raw=true"/>
</div>

<a name="reqcancel"></a>
### 13) Request Cancel

Fetch client provides the feature for cancel the request. If you want to cancel the processing request then click then "Cancel Request" button in the response section.

<a name="quickaccess"></a>
### 14) Quick Access

Fetch client provides the quick access of History, collection and Environment variables in the side bar.
<a name="history"></a>
  * ### History
    * Automatic saving of requests in History.
    * Save the history item to the collections.
    * Delete all history items or specific history item.

<a name="collection"></a>
  * ### Collection
    * Save requests to a collection.
    * Organize the request using the collections.
    * Run all the requests in the collection using `Run All` options and download the results as file.
    * Attach the Environment variable to collections.
    * `Export` the collections as JSON file.
    * `Import` the Fetch Client collections from above exported JSON file. (It is used to share the collections between team members.)
    * Duplicate the collection items.
    ### How to Import Collection
    * Select the `Collection` tab from the sidebar
    * Click Menu icon and Select `Import` option.
    * Now select `Fetch Client` collection file.

<a name="envvar"></a>
  * ### Environment Variable
    * Create and set variables at multiple scopes 
      * Global Level
      * Collection level
      * Request level
    * It is simple key value pair combination.
    * Use environment variables in URL, Query Param, Authorization, Header, Request Body (Form and Form-Encoded), Test sections.
    * `Export` variables as JSON file.
    * `Import` the Fetch Client variables from above exported JSON file.
    * In the input, enter a variable name in the `{{variableName}}` format.
    ### How to Import Variable
    * Select the `Variable` tab from the sidebar
    * Click Menu icon and Select `Import` option.
    * Now select `Fetch Client` variable file.

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/quick-access.gif?raw=true"/>
</div>

<a name="runall"></a>
### 15) Run All requests

* Run all the requests in the collection using "Run All" options and download the results as file.
* Once completed the all request, export the test result as `JSON` or `CSV`.
* If you click the particular request from the table, it will open the corresponding request view.

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/run-all-menu.png?raw=true"/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/run-all.png?raw=true"/>
</div>

<a name="managecookies"></a>
### 16) Manage Cookies
* View/Delete the cookies in the Manage Cookies Page.
* Cookie header will automatically added if cookies are available for that request.
* You can modify the cookies using the `cookie` header.

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/manage-cookies-menu.png?raw=true"/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/manage-cookies.png?raw=true"/>
</div>

<a name="runcurl"></a>
### 17) Run/Import Curl Request

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/import-curl-menu.png?raw=true"/>
  <br/>  
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/import-curl.png?raw=true"/>
  <br/>
  <sup><b>Import Curl Request</b></sup>
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/run-curl.png?raw=true"/>
  <br/>
  <sup><b>Run Curl Request</b></sup>
</div>

## ⌨ Keyboard Shortcuts
* `Ctl+Shift+P` (Open Command Palette)
  * Fetch Client - New Request
* `Ctl+Alt+N` - Open `Fetch Client` View
* `Enter` on url textbox to send request
* `Cmd/Ctrl + s` - Save Request without run

## ⚙️ Configuration

* Open VSCode settings View, then search for `Fetch Client` or click `Extension Settings` in the menu item.

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/extension-settings-menu.png?raw=true"/>
  <br/>
</div>

* Fetch Client has below configurations. 

|Name | Setting | Default | Description |
|-----|---------|------------|------------|
|Layout|fetch-client.layout|Horizontal Split|Layout of Fetch Client|
|Horizontal Layout|fetch-client.horizontalLayout|Accordion Style|Style of Horizontal Split Mode|
|SSL Check|fetch-client.SSLCheck|true|Enable Strict SSL Check for API Request|
|History Limit|fetch-client.historyLimit|25|Number of items to be displayed in the History|
|Time Out|fetch-client.timeOut|5 min|Request Timeout|
|Default Protocol|fetch-client.defaultProtocol|http|Which protocol to add with url (if url has no protocol)|

<div align="center">
  <br/>
  <img src="https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/images/fetch-client-setting.png?raw=true"/>  
</div>

## 🚀 Tech Stack
Fetch Client is created with below tech stacks.
* Extension : [VS Code Extension API](https://code.visualstudio.com/api)
* UI : [React JS](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [JavaScript](https://www.w3schools.com/js/), [CSS](https://www.w3schools.com/css/default.asp)
* Editor : [Monaco Editor](https://microsoft.github.io/monaco-editor/)
* Local DB : [LokiJS](https://techfort.github.io/LokiJS/)
* Code Snippet Generation : [httpsnippet](https://github.com/Kong/httpsnippet/)

## 🖥️ Running the extension locally for development
* Clone the [vscode-fetch-client](https://github.com/Ganesan-Chandran/vscode-fetch-client) repo.
* Run `npm install` command to install dependencies.
* Press `F5` to open a extension developement window with `fetch-client` extension loaded.

## 🔒 Privacy
* Fetch client **`DOES NOT`** collect any your personal or request data.
* Fetch client has no backend storage and all your data are stored **`LOCALLY`** on your computer.

## 📝 Changelog
See the [release notes](https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/CHANGELOG.md) for the full set of changes.

## ✒️ Author
[Ganesan Chandran](https://ganesan-chandran.github.io/)

## 📜 License
See the [license](https://github.com/Ganesan-Chandran/vscode-fetch-client/blob/main/LICENSE) details.

## 👍 Contribution
Feel free to submit a pull request if you find any bugs or new feature (To see a list of active issues/feature request, visit the [Issues section](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues)). Please make sure all commits are properly documented.
