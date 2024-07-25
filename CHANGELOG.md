# Change Log

All notable changes to the "Fetch Client" extension will be documented in this file.

## v1.5.2 - July, 2024
### 🐛 Bug Fixes
- New request fix

### Requirements
- Minimum required version of VSCode is v1.75.0
- Minimum Node version is 18.20.3

## v1.5.1 - July, 2024
### 🐛 Bug Fixes
- Fix the db file name

### Requirements
- Minimum required version of VSCode is v1.75.0
- Minimum Node version is 18.20.3

## v1.5.0 - July, 2024
### 🎉 New Features
- Import Postman environment ([#7](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/7))
- Save all requests data into custom workspace([#10](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/10))
- Set the response limit as configurable([#11](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/11))

### 🐛 Bug Fixes
- import from Curl ([#5](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/5)).
- POST method not properly set just after creating new Http Request in a collection ([#8](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/8))
- Bug fix in RunAll section
- Bug fix in filter search in collection section in the sidebar

### Requirements
- Minimum required version of VSCode is v1.75.0
- Minimum Node version is 18.20.3

## v1.4.0 - July, 2024
### 🎉 New Features
- Import Postman collection (Postman Collection v2.1).
- OAuth2 added for request authorization.
- Pre-requests(Pre-Fetch) and conditions are added for Request execution.
- Tests and Variables are moved to PostFetch section.
- Types genreation added for JSON response.
- Added auto refresh in the request tabs when variables are modified.
- Added log for request and response in the output window.
- Added "View Log" button in the sidebar panel to open the log output window.
- Display the variables value when hovering over them.
- Import .env file in the Variable section.
- System variables are added to generate random dynamic data.
- The item in side bar will be focused when changing the request tab.
- Added show more option for larger response in the test case output.
- Added isJson(), regex, notContains options in the test.
- Added support for nested variables.
- "New Request" shortcut icon added in the Collection/Folder.
- Word wrap option added for response section.

### 🐛 Bug Fixes
- import from Curl ([#5](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/5)).
- Clicking on collection item opens a new window every time instead of switching to existing window ([#6](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/6))
- import/export postman collections and environment ([#7](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/7))


### Requirements
- Minimum required version of VSCode is v1.75.0

## v1.3.0 - September, 2022
### 🎉 New Features
- Added the settings in the "Run All" Collection.
- Support for multiple iterations in "Run All" Collection.
- Can add delay between requests and iterations.
- Run the requests in sequential or parallel mode for multiple iterations.

### 🐛 Bug Fixes

- import from Curl ([#5](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/5)).
- Not able to Duplicate the item in the folder.

## v1.2.0 - July, 2022
### 🎉 New Features
- Support nested folder to the Collection.
- Run curl request (Under collection in the side bar).
- Import curl request (Under collection in the side bar) ([#5](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/5)).
- Support settings(Auth) for collection and folders.
- "Inherit auth from parent" option added in the Auth section.
- Support Reorder and disable the request in the "Run All" Collection.
- File option added in Form in the request body.
- Full screen mode is added for resonse section.

### 🐛 Bug Fixes

- Bearer Token as a variable does not work due to max length restriction ([#4](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/4)).

## v1.1.0 - June, 2022
### 🎉 New Features
- Folder added to the Collection.
- Set environment variable from json response, headers and cookies.
- Support AWS Signature auth type.
- Support Cookies and Manage cookies feature ([#1](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/1)) added. 
- Support Copy and Paste the item between Collection/Folder.
- Support Variables highlight ([#3](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/3)).
- New test case options (Length and Type) are added.
- Content-Type header will be added automatically based on request body type.
- Support `ctrl+s` to save request.
- Right click for context menu in Sidebar (History, Collection and Variable).
- Menu items added (Manage Cookies, View Error Log and Extension Settings)

### 🐛 Bug Fixes

\-

### Requirements
- Minimum required version of VSCode is v1.65.0

## v1.0.0 - May, 2022
### 🎉 New Features
- UI Customization and support VSCode Themes.
- Test Rest API request with GET, POST, PUT, PATCH, DELETE, HEAD and OPTIONS methods.
- Various authentications which are Basic Auth, Bearer Token and API Key.
- Various post body which are Form, Form-Encoded, Raw (Json, Plain Text, XML), Binary File and GraphQL.
- Syntax highlight for Response data.
- Tree view for JSON and XML responses and HTML preview for HTML responses.
- History, Collection, Enivronment Variable are supported.
- Test the API request and response data without any scripts/code.
- Generate code snippet for various languages.
- Save response and test results as File.
- Export/Import the Fecth Client's collections and environment variables.
- Add documentation/feedback for each request. 

### 🐛 Bug Fixes

\-