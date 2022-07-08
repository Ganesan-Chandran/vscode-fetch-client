# Change Log

All notable changes to the "Fetch Client" extension will be documented in this file.

## v1.2.0 - July, 2022
### New Features
- Support nested folder to the Collection.
- Run curl request (Under collection in the side bar).
- Import curl request (Under collection in the side bar) ([#5](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/5)).
- Support settings(Auth) for collection and folders.
- "Inherit auth from parent" option added in the Auth section.
- Support Reorder and disable the request in the "Run All" Collection.
- File option added in Form in the request body.
- Full screen mode is added for resonse section.

### Bug Fixes

- Bearer Token as a variable does not work due to max length restriction ([#4](https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/4)).

## v1.1.0 - June, 2022
### New Features
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

### Bug Fixes

\-

### Requirements
- Minimum required version of VSCode is v1.65.0

## v1.0.0 - May, 2022
### New Features
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

### Bug Fixes

\-