# Fetch Client

## What is Fetch Client ?

`"Don't leave from VSCode, Stay in it` - For Rest API testing.

Fetch Client is Visual Studio Code extension which is used to test the Rest API.

## Why Fetch Client ?

* Open Source
* Lightweight
* UI Customization and supports VSCode Themes.
* Test Rest API request with GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS methods.
* Various authentications which are Basic Auth, Bearer Token and API Key.
* Various post body which are Form, Form-Encoded, Raw (Json, Plain Text, XML), Binary File and GraphQL.
* Syntax highlight for Response data.
* Tree view for JSON and XML responses and HTML preview for HTML responses.
* History, Collection, Enivronment Variable are supported.
* Test the API request and response data without any scripts.
* Generate code snippet for various languages.
* Save response and test results as File.
* Export/Import the Fecth Client's collections and environment variables.

## 📦 How to Install ?
  * Install via VSCode Extensions 
    * Open VSCode Extensions panel using `Ctrl+Shift+X` shortcut.
    * Type `Fetch Client` in Search bar.
    * Select the `Fetch Client` and install the extension.

## 💡 How to use ?

### 1) UI Customization

We can customize the UI in different modes.
  * Horizontal mode
      * Accordian View
      * Split View
  * Vertical mode
      * Split View

### 2) Different HTTP Methods

Fetch client supports to test the Rest API request with various HTTP methods such as GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS.

### 3) Query Parameter

Fetch client supports to test the Rest API request with query parameter.

### 4) Authorization
Fetch client supports below authorization methods for Rest API testing.
* Basic Auth
* Bearer Token
* API Key

### 5) Headers

We can add the headers for API testing. Fetch Client gives the suggestion on various headers and corressponding values in the header section.

### 6) Request Body

  * Fetch client supports various request body which are Form, Form-Encoded, Raw (Json, Plain Text, XML), Binary File and GraphQL.
  * Content-Type header will be automatically added for Binary File Type.

### 7) Test

  * We can test the API request and response data without any scripts in the Fetch client. 
  * It support to test below data,
    * Response Code
    * Response Body
    * Response Time
    * Content-Type
    * Content-Length
    * Content-Encoding
    * Specific Header value
    * Specific JSON property value in the JSON response
  
### 8) Response Data

* Fetch client supports Syntax highlight for Response data.
* Copy the response data using 'Copy' button.
* It supports Tree view for JSON and XML responses and HTML preview for HTML responses.
* Download the response data as file.
* View the status code, response time and size of the response data.
* View response headers.

### 9) Test Results

* Once request is processed, Fetch client executes the test cases and display the test result with expected value and actual value.
* We can download the test results as JSON file.

### 10) Notes

Notes section is used to add the notes or documentation regarding the request. Fetch client has simple editor to add the documentation.

### 11) Code snippet

Fetch client supports code snippet generation for various languages. Generate code snippets to send request from another application. Open request view and click icon {} to see Code Snippet generation. The code snippet generation is available for following languages.
  * C
  * C#
  * Go
  * Java
  * JavaScript
  * Node
  * PHP
  * Python
  * Shell

### 11) Request Cancel

Fetch client provides the feature for cancel the request. If you want to cancel the processing request then click then "Cancel Request" button in the response section.

### 12) Quick Access

Fetch client provides the quick access of History, collection and Environment variables in the side bar.
  * ### History
    * Automatic saving of requests in History.
    * Save the history item to the collections.
    * Delete all history items or specific history item.
  
  * ### Collection
    * Save requests to a collection.
    * Organize the request using the collections.
    * Run all the requests in the collection using `Run All` options and download the results as file.
    * Attach the Environment variable to collections.
    * Export the collections as JSON file.
    * Import the Fetch Client collections from above exported JSON file. (It is used to share the collections between team members.)
    * Duplicate the collection items.
    ### How to Import Collection
    * Select the `Collection` tab from the sidebar
    * Click Menu icon and Select `Import` option.
    * Now select `Fetch Client` collection file.

  * ### Environment Variable
    * Create and set variables at multiple scopes 
      * Global Level
      * Collection level
      * Request level
    * It is simple key value pair combination.
    * Use environment variables in URL, Query Param, Authorization, Header, Request Body (Form and Form-Encoded), Test sections.
    * Export variables as JSONs.
    * In the input, enter a variable name in the `{{variableName}}` format.
    ### How to Import Variable
    * Select the `Variable` tab from the sidebar
    * Click Menu icon and Select `Import` option.
    * Now select `Fetch Client` variable file.

### 12) Run All requests

* Run all the requests in the collection using "Run All" options and download the results as file.
* Once completed the all request, export the test result as `JSON` or `CSV`.
* If you click the particular request from the table, it will open the corressponding request view.

## ⌨ Keyboard Shortcuts
* `Ctl+Shift+P`: From Command Palette
  * Fetch Client - New Request
* `Ctl+Alt+N` - Open Fetch Client View
* `Enter` on request url textbox to send request.

## ⚙️ Configuration

* Open VSCode settings View, then search for `Fetch Client`.
* Fetch Client has below configurations. 

|Name | Setting | Default | Description |
|-----|---------|------------|------------|
|Layout|fetch-client.layout|Horizontal Split|Layout of Fetch Client|
|Horizontal Layout|fetch-client.horizontalLayout|Accordion Style|Style of Horizontal Split Mode|
|SSL Check|fetch-client.SSLCheck|true|Enable Strict SSL Check for API Request|
|History Limit|fetch-client.historyLimit|25|Number of items to be displayed in the History|
|Time Out|fetch-client.timeOut|5 min|Request Timeout|
|Default Protocol|fetch-client.defaultProtocol|http|Which protocol to add with url (if url has no protocol)|

## 🔑 Privacy
* Fetch client **DOES NOT** collect any your personal or request data.
* Fetch client has no backend or cloud storage and all your data are stored **LOCALLY** on your computer.


## 📝 Changelog
See the [release notes](https://github.com/Ganesan-Chandran/vscode-json-utility/blob/master/CHANGELOG.md) for the full set of changes.

## ✒️ Author
[Ganesan Chandran](https://ganesan-chandran.github.io/)

## 📜 License
See the [license](https://github.com/Ganesan-Chandran/vscode-json-utility/blob/master/LICENSE) details.

## 👍 Contribution
Feel free to submit a pull request if you find any bugs (To see a list of active issues, visit the [Issues section](https://github.com/Ganesan-Chandran/vscode-json-utility/issues)). Please make sure all commits are properly documented.


