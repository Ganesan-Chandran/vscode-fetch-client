<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD033 -->
<pre>
vscode-fetch-client
|-- .github
|   |-- ISSUE_TEMPLATE
|   |   |-- bug_report.md
|   -   \-feature_request.md
|   |-- workflows
|   |   |-- package.yaml
|   -   \-publish.yaml
|   |-- dependabot.yaml
|   \-PULL_REQUEST_TEMPLATE.md
|-- docs
|   |-- ai-agent
|   |   |-- 00-product
|   -   |   \-ai-agent-product-goal.md
|   |   |-- 01-foundations
|   -   |   \-llm-basics.md
|   -   \-02-architecture
|   |       |-- 01_conceptual-architecture.md
|   -       \-02_existing-architecture-notes.md
|   \-features
|       \-GitSync.md
|-- icons
|   |-- bin.svg
|   |-- code.svg
|   |-- collapse.svg
|   |-- dots.svg
|   |-- edit.svg
|   |-- expand.svg
|   |-- fetch-client.png
|   |-- fetch-client.svg
|   |-- info.svg
|   |-- menu.svg
|   |-- plus.svg
|   \-settings.svg
|-- images
|   |-- activity-bar.png
|   |-- code-snippet.png
|   |-- collection-menu.png
|   |-- extension-settings-menu.png
|   |-- fetch-client-intro.gif
|   |-- fetch-client-search.png
|   |-- fetch-client-setting.png
|   |-- header-suggestion.png
|   |-- header-value-suggestion.png
|   |-- Horizonal_Accordian_Split.gif
|   |-- Horizonal_Split.gif
|   |-- import-col-menu.png
|   |-- import-curl.png
|   |-- import-curl-menu.png
|   |-- logs.png
|   |-- logs-settings.png
|   |-- manage-cookies.png
|   |-- manage-cookies-menu.png
|   |-- notes.png
|   |-- prerequests.png
|   |-- quick-access.gif
|   |-- quick-access.png
|   |-- raw-content-type-suggestion.png
|   |-- response.png
|   |-- run-all.png
|   |-- run-all-menu.png
|   |-- run-all-settings.png
|   |-- run-curl.png
|   |-- setvar.png
|   |-- systemvariables.png
|   |-- Test.gif
|   |-- test-menu.png
|   |-- test-result.png
|   |-- Vertical_Split.gif
|   |-- workspace.png
|   \-workspace1.png
|-- src
|   |-- fetch-client-cli
|   |   |-- commands
|   |   |   |-- check.ts
|   |   |   |-- ddTest.ts
|   |   |   |-- helper.ts
|   |   |   |-- list.ts
|   |   |   |-- lookup.ts
|   |   |   |-- perf.ts
|   |   |   |-- qualityCheck.ts
|   -   |   \-run.ts
|   |   |-- stubs
|   |   |   |-- extension.ts
|   -   |   \-vscode.ts
|   |   |-- types
|   |   |   |-- common.types.ts
|   -   |   \-export.types.ts
|   |   |-- utils
|   |   |   |-- export
|   -   |   |   \-report.ts
|   |   |   |-- performance
|   |   |   |   |-- perfConfig.ts
|   |   |   |   |-- perfReporter.ts
|   -   |   |   \-perfRunner.ts
|   |   |   |-- display.ts
|   -   |   \-logger.ts
|   |   |-- .npmignore
|   |   |-- config.ts
|   |   |-- global.d.ts
|   |   |-- index.ts
|   |   |-- LICENSE
|   |   |-- package.json
|   -   \-README.md
|   |-- fetch-client-core
|   |   |-- consts
|   |   |   |-- auth.consts.ts
|   |   |   |-- codeLang.consts.ts
|   |   |   |-- common.consts.ts
|   |   |   |-- export.consts.ts
|   |   |   |-- headers.consts.ts
|   |   |   |-- import.consts.ts
|   |   |   |-- initialValues.consts.ts
|   |   |   |-- mimetype.consts.ts
|   |   |   |-- prefetch.consts.ts
|   |   |   |-- request.consts.ts
|   |   |   |-- requestBody.consts.ts
|   |   |   |-- requestTypes.consts.ts
|   |   |   |-- response.consts.ts
|   |   |   |-- systemVariables.consts.ts
|   -   |   \-test.consts.ts
|   |   |-- db
|   |   |   |-- autoRequest.repository.ts
|   |   |   |-- autoRequestHistory.repository.ts
|   |   |   |-- collectionDB.repository.ts
|   |   |   |-- cookie.repository.ts
|   |   |   |-- dbHelper.ts
|   |   |   |-- dbManager.ts
|   |   |   |-- dbUtil.ts
|   |   |   |-- history.repository.ts
|   |   |   |-- mainDB.repository.ts
|   |   |   |-- mockServerDB.repository.ts
|   |   |   |-- responseDB.repository.ts
|   -   |   \-variableDB.repository.ts
|   |   |-- helpers
|   |   |   |-- exporters
|   |   |   |   |-- fetchClient
|   -   |   |   |   \-fetchClientExporter_2_0.ts
|   |   |   |   |-- postman
|   -   |   |   |   \-postmanExporter_2_1.ts
|   |   |   |   |-- qualityGate
|   |   |   |   |   |-- qgCsvExporter.ts
|   |   |   |   |   |-- qgHtmlExporter.ts
|   |   |   |   |   |-- qgJsonExporter.ts
|   -   |   |   |   \-qgXmlExporter.ts
|   -   |   |   \-reports
|   |   |   |       |-- csvExporter.ts
|   |   |   |       |-- htmlExporter.ts
|   |   |   |       |-- jsonExporter.ts
|   |   |   |       |-- nunitExporter.ts
|   |   |   |       |-- preFetchSummary.ts
|   |   |   |       |-- reportBuilder.ts
|   |   |   |       |-- transform.ts
|   -   |   |       \-xmlExporter.ts
|   |   |   |-- importers
|   |   |   |   |-- collections
|   |   |   |   |   |-- fetchClient
|   |   |   |   |   |   |-- fetchClient_2_0_Schema.json
|   |   |   |   |   |   |-- fetchClientImporter_1_0.ts
|   |   |   |   |   |   |-- fetchClientImporter_2_0.ts
|   -   |   |   |   |   \-utils.ts
|   |   |   |   |-- insomnia
|   -   |   |   |   \-insomniaImporter.ts
|   |   |   |   |-- openapi
|   -   |   |   |   \-v3
|   |   |   |   |       |-- openApiImporter.ts
|   -   |   |   |       \-utils.ts
|   |   |   |   |-- postman
|   |   |   |   |   |-- postmanImporter_2_1.ts
|   -   |   |   |   \-postmanScript.helper.ts
|   -   |   |   \-thunderClient
|   -   |   |       \-thunderClientImporter_1_2.ts
|   -   |   \-variables
|   |   |       |-- fetchClient
|   -   |       |   \-fcVariableImporter.ts
|   |   |       |-- postman
|   -   |       |   \-postmanVariableImporter.ts
|   -   |       \-thunderClient
|   -   |           \-tcVariableImporter.ts
|   |   |-- logger
|   |   |   |-- constants.ts
|   |   |   |-- logger.ts
|   -   |   \-requestLog.ts
|   |   |-- qualityGate
|   |   |   |-- rules
|   |   |   |   |-- design.rules.ts
|   |   |   |   |-- functional.rules.ts
|   |   |   |   |-- maintainability.rules.ts
|   |   |   |   |-- observability.rules.ts
|   |   |   |   |-- performance.rules.ts
|   |   |   |   |-- security.rules.ts
|   -   |   |   \-testCoverage.rules.ts
|   |   |   |-- qgEngineTypes.ts
|   |   |   |-- qgHelpers.ts
|   |   |   |-- qualityGateEngine.ts
|   -   |   \-ruleRegistry.ts
|   |   |-- validators
|   |   |   |-- fetchClientCollectionValidator.ts
|   -   |   \-fetchClientVariableValidator.ts
|   |   |-- common.helper.ts
|   |   |-- dateTime.helper.ts
|   |   |-- expression.helper.ts
|   |   |-- json.helper.ts
|   |   |-- mockGeneratorHelper.ts
|   |   |-- qualityGateAnalyser.ts
|   |   |-- settings.helper.ts
|   |   |-- systemVariable.helper.ts
|   |   |-- tests.helper.ts
|   |   |-- variable.helper.ts
|   |   |-- variable.server.helper.ts
|   -   \-xml.helper.ts
|   |-- types
|   |   |-- auth.types.ts
|   |   |-- autorequest.types.ts
|   |   |-- cli.types.ts
|   |   |-- common.types.ts
|   |   |-- cookie.types.ts
|   |   |-- export.types.ts
|   |   |-- fetchClient_2_0_types.ts
|   |   |-- insomnia.types.ts
|   |   |-- mockServer.types.ts
|   |   |-- openApi.v3.types.ts
|   |   |-- perfTest.types.ts
|   |   |-- postman_2_1.types.ts
|   |   |-- postman_2_1.variable_types.ts
|   |   |-- prefetch.types.ts
|   |   |-- qualityGate.types.ts
|   |   |-- request.types.ts
|   |   |-- requestBody.types.ts
|   |   |-- response.types.ts
|   |   |-- sidebar.types.ts
|   |   |-- thunderClient_1_2.variable_types.ts
|   |   |-- thunderClient_1_2_types.ts
|   -   \-thunderClient_1_4_types.ts
|   -   \-utils
|       |-- dataDrivenTestService
|       |   |-- dataDriven.types.ts
|       |   |-- dataDrivenExport.ts
|       |   |-- dataDrivenHtmlExporter.ts
|       |   |-- dataDrivenNunitExporter.ts
|       |   |-- dataDrivenParser.ts
|       |   |-- dataDrivenRunner.ts
|       |   |-- dataDrivenVariables.ts
|       -   \-dataDrivenXmlExporter.ts
|       |-- fakeDataService
|       |   |-- fakeData.types.ts
|       |   |-- fakeDataExport.ts
|       |   |-- fakeDataGenerator.ts
|       -   \-fakeDataSchemaParser.ts
|       |-- performanceTestService
|       |   |-- perfEngine.ts
|       |   |-- perfHelper.ts
|       |   |-- perfHtmlExporter.ts
|       -   \-perfXmlExporter.ts
|       |-- preFetchService
|       |   |-- cliPreFetchContextProvider.ts
|       |   |-- dbPreFetchContextProvider.ts
|       |   |-- preFetch.types.ts.ts
|       |   |-- preFetchRunner.ts
|       -   \-qualityGateLiveRunner.ts
|       |-- secretMangerService
|       -   \-awsConnectivityService.ts
|       |-- commonConfig.ts
|       |-- curlToRequest.ts
|       |-- escapeHelpers.ts
|       |-- fetchUtil.ts
|       |-- httpsAgent.ts
|       |-- pubSub.ts
|       \-vscodeConfig.ts
|-- fetch-client-packages
-   \-crypto
|       |-- fc-crypto.ts
|       |-- index.ts
|       \-types.ts
|-- fetch-client-ui
|   |-- components
|   |   |-- AutoRequest
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- Collection
|   |   |   |-- AddTo
|   |   |   |   |-- addTo.tsx
|   -   |   |   \-style.css
|   |   |   |-- AttachVariable
|   -   |   |   \-attachVariable.tsx
|   |   |   |-- BulkExport
|   |   |   |   |-- bulkExport.tsx
|   -   |   |   \-style.css
|   |   |   |-- CopyTo
|   -   |   |   \-copyTo.tsx
|   |   |   |-- ReOrder
|   |   |   |   |-- reorder.tsx
|   -   |   |   \-style.css
|   |   |   |-- RunAll
|   |   |   |   |-- helper.ts
|   |   |   |   |-- runAll.tsx
|   -   |   |   \-runAllSettings.tsx
|   |   |   |-- Settings
|   -   |   |   \-CollectionSettings.tsx
|   |   |   |-- Testing
|   |   |   |   |-- DataDrivenTest.tsx
|   |   |   |   |-- DataDrivenTestSettings.tsx
|   |   |   |   |-- FakeDataGenerator.tsx
|   |   |   |   |-- PerformanceTest.tsx
|   |   |   |   |-- PerformanceTestSettings.tsx
|   |   |   |   |-- ResponseTimeChart.tsx
|   -   |   |   \-style.css
|   |   |   |-- helper.ts
|   -   |   \-style.css
|   |   |-- Common
|   |   |   |-- Autocomplete
|   |   |   |   |-- Autocomplete.tsx
|   -   |   |   \-style.css
|   |   |   |-- CodeGenerator
|   |   |   |   |-- index.tsx
|   -   |   |   \-style.css
|   |   |   |-- Editor
|   |   |   |   |-- EditorProvider.tsx
|   |   |   |   |-- index.tsx
|   |   |   |   |-- style.css
|   -   |   |   \-themeHelper.ts
|   |   |   |-- JsonSchemaGenerator
|   |   |   |   |-- index.tsx
|   -   |   |   \-style.css
|   |   |   |-- Layout
|   |   |   |   |-- panelLayout.tsx
|   -   |   |   \-style.css
|   |   |   |-- Modal
|   |   |   |   |-- index.tsx
|   -   |   |   \-style.css
|   |   |   |-- NotesEditor
|   |   |   |   |-- index.tsx
|   -   |   |   \-style.css
|   |   |   |-- Table
|   |   |   |   |-- ResponseTable.tsx
|   |   |   |   |-- style.css
|   -   |   |   \-Table.tsx
|   |   |   |-- TextEditor
|   |   |   |   |-- style.css
|   -   |   |   \-TextEditor.tsx
|   |   |   |-- TypesGenerator
|   -   |   |   \-index.tsx
|   |   |   |-- ValueEditorModal
|   |   |   |   |-- index.tsx
|   -   |   |   \-style.css
|   |   |   |-- Viewer
|   |   |   |   |-- HTMLViewer.tsx
|   |   |   |   |-- JSONViewer.tsx
|   |   |   |   |-- style.css
|   |   |   |   |-- types.ts
|   -   |   |   \-XMLViewer.tsx
|   |   |   |-- helper.ts
|   |   |   |-- icons.tsx
|   -   |   \-vscodeAPI.ts
|   |   |-- Cookies
|   |   |   |-- redux
|   |   |   |   |-- actions.ts
|   |   |   |   |-- index.ts
|   |   |   |   |-- reducer.ts
|   -   |   |   \-types.ts
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- Curl
|   |   |   |-- helper.ts
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- DevTools
|   |   |   |-- apiTools.tsx
|   |   |   |-- DevTools.tsx
|   |   |   |-- devTools.types.ts
|   |   |   |-- devTools.utils.tsx
|   |   |   |-- encoding.tsx
|   |   |   |-- generators.tsx
|   |   |   |-- index.ts
|   |   |   |-- jsonTools.tsx
|   |   |   |-- registry.tsx
|   |   |   |-- securityTools.tsx
|   |   |   |-- style.css
|   |   |   |-- testingTools.tsx
|   |   |   |-- utils.ts
|   -   |   \-withPanelLayout.tsx
|   |   |-- ErrorLog
|   |   |   |-- ErrorLog.tsx
|   -   |   \-style.css
|   |   |-- MainUI
|   |   |   |-- hooks
|   -   |   |   \-useWindowMessages.ts
|   |   |   |-- redux
|   |   |   |   |-- actions.ts
|   |   |   |   |-- index.ts
|   |   |   |   |-- reducer.ts
|   -   |   |   \-types.ts
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- MockServer
|   |   |   |-- redux
|   |   |   |   |-- actions.ts
|   |   |   |   |-- index.ts
|   |   |   |   |-- reducer.ts
|   -   |   |   \-types.ts
|   |   |   |-- constants.ts
|   |   |   |-- GenerateModal.tsx
|   |   |   |-- index.tsx
|   |   |   |-- RequestLog.tsx
|   |   |   |-- RouteDetail.tsx
|   |   |   |-- RouteList.tsx
|   -   |   \-style.css
|   |   |-- QualityGate
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- RequestUI
|   |   |   |-- OptionsPanel
|   |   |   |   |-- Options
|   |   |   |   |   |-- Auth
|   |   |   |   |   |   |-- aws
|   |   |   |   |   |   |   |-- index.tsx
|   -   |   |   |   |   |   \-style.css
|   |   |   |   |   |   |-- OAuth
|   |   |   |   |   |   |   |-- index.tsx
|   -   |   |   |   |   |   \-style.css
|   |   |   |   |   |   |-- index.tsx
|   -   |   |   |   |   \-style.css
|   |   |   |   |-- Body
|   |   |   |   |   |-- Binary
|   |   |   |   |   |   |-- index.tsx
|   -   |   |   |   |   \-style.css
|   |   |   |   |   |-- FormData
|   -   |   |   |   |   \-index.tsx
|   |   |   |   |   |-- GraphQL
|   |   |   |   |   |   |-- index.tsx
|   -   |   |   |   |   \-style.css
|   |   |   |   |   |-- None
|   |   |   |   |   |   |-- index.tsx
|   -   |   |   |   |   \-style.css
|   |   |   |   |   |-- Raw
|   |   |   |   |   |   |-- Raw.tsx
|   -   |   |   |   |   \-style.css
|   |   |   |   |   |-- UrlEncoded
|   -   |   |   |   |   \-index.tsx
|   |   |   |   |   |-- index.tsx
|   -   |   |   |   \-style.css
|   |   |   |   |-- Headers
|   |   |   |   |   |-- index.tsx
|   |   |   |   |   |-- parentHeaders.tsx
|   -   |   |   |   \-requestHeaders.tsx
|   |   |   |   |-- PostFetch
|   -   |   |   |   \-index.tsx
|   |   |   |   |-- PreFetch
|   |   |   |   |   |-- index.tsx
|   |   |   |   |   |-- preRequest.tsx
|   -   |   |   |   \-style.css
|   |   |   |   |-- QueryParams
|   |   |   |   |   |-- index.tsx
|   -   |   |   |   \-style.css
|   |   |   |   |-- Settings
|   |   |   |   |   |-- index.tsx
|   -   |   |   |   \-style.css
|   -   |   |   \-helper.ts
|   |   |   |-- OptionTab
|   -   |   |   \-index.tsx
|   |   |   |-- consts.ts
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- redux
|   |   |   |-- actions.ts
|   |   |   |-- colReducer.ts
|   |   |   |-- index.ts
|   |   |   |-- reducer.ts
|   |   |   |-- reqSettingsReducer.ts
|   -   |   \-types.ts
|   -   \-RequestPanel
|       |-- common.ts
|       |-- index.tsx
|       \-style.css
|   |-- ResponseUI
|   |   |-- OptionsPanel
|   |   |   |-- Options
|   |   |   |   |-- Cookies
|   |   |   |   |   |-- index.tsx
|   -   |   |   |   \-style.css
|   |   |   |   |-- Headers
|   |   |   |   |   |-- index.tsx
|   -   |   |   |   \-style.css
|   |   |   |   |-- PreFetchResponse
|   |   |   |   |   |-- index.tsx
|   -   |   |   |   \-style.css
|   -   |   |   \-Response
|   |   |   |       |-- index.tsx
|   -   |   |       \-style.css
|   -   |   \-OptionTab
|   |   |       |-- index.tsx
|   -   |       \-style.css
|   |   |-- redux
|   |   |   |-- actions.ts
|   |   |   |-- index.ts
|   |   |   |-- reducer.ts
|   -   |   \-types.ts
|   -   \-ResponsePanel
|       |-- index.tsx
|       \-style.css
|   |-- SideBar
|   |   |-- Collection
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- History
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- MockServers
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- redux
|   |   |   |-- actions.ts
|   |   |   |-- index.ts
|   |   |   |-- reducer.ts
|   -   |   \-types.ts
|   |   |-- Variables
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   |   |-- dropdownMenu.tsx
|   |   |-- index.tsx
|   |   |-- style.css
|   -   \-util.ts
|   |-- TestUI
|   |   |-- TestPanel
|   |   |   |-- index.tsx
|   -   |   \-style.css
|   -   \-TestResult
|       |-- index.tsx
|       \-style.css
|   -   \-Variables
|       |-- redux
|       |   |-- actions.ts
|       |   |-- index.ts
|       |   |-- reducer.ts
|       -   \-types.ts
|       |-- SecretManager
|       |   |-- secretMangerPanel.tsx
|       -   \-style.css
|       |-- index.tsx
|       |-- resToVar.tsx
|       \-style.css
|   |-- reducer
|   -   \-combineReducer.ts
|   |-- store
|   |   |-- appStore.ts
|   |   |-- stateAndRouterProvider.tsx
|   -   \-types.ts
|   |-- App.css
|   |-- App.tsx
|   |-- custom.d.ts
|   |-- index.css
|   |-- index.tsx
|   \-logo.svg
|-- fetch-client-vscode
|   |-- db
|   |   |-- autoRequestDBUtil.ts
|   |   |-- collectionDBUtil.ts
|   |   |-- cookieDBUtil.ts
|   |   |-- historyDBUtil.ts
|   |   |-- mainDBUtil.ts
|   |   |-- mockServerDBUtil.ts
|   |   |-- responseDBUtil.ts
|   |   |-- transferDBConfig.ts
|   -   \-varDBUtil.ts
|   |-- logger
|   -   \-vsCodeLogger.ts
|   |-- utils
|   |   |-- common.utils.ts
|   |   |-- localStorageService.ts
|   |   |-- memoryCache.ts
|   |   |-- mockGenerators.ts
|   |   |-- mockServerRunner.ts
|   -   \-scheduler.ts
|   |-- webviews
|   |   |-- addToCollectionUIProvider.tsx
|   |   |-- autoRequestUIProvider.tsx
|   |   |-- bulkExportUIProvider.tsx
|   |   |-- cookieUIProvider.tsx
|   |   |-- curlUIProvider.tsx
|   |   |-- devToolUIProvider.tsx
|   |   |-- errorLogUIProvider.tsx
|   |   |-- helper.ts
|   |   |-- index.ts
|   |   |-- mainUIProvider.tsx
|   |   |-- mockServerUIProvider.tsx
|   |   |-- qualityGateUIProvider.tsx
|   |   |-- sideBarUIProvider.tsx
|   |   |-- variableUIProvider.tsx
|   -   \-webviewUtils.ts
|   \-oauthAuthorisationService.ts
|   \-extension.ts
|-- .editorconfig
|-- .editorconfig-checker.json
|-- .eslintrc.json
|-- .gitignore
|-- .markdownlint.json
|-- .npmignore
|-- .npmrc
|-- .prettierignore
|-- .prettierrc
|-- .vscodeignore
|-- CHANGELOG.md
|-- dictionary.txt
|-- empty-module.js
|-- eslint.config.mjs
|-- gitattributes
|-- LICENSE
|-- package.json
|-- package-lock.json
|-- README.md
|-- tsconfig.json
|-- vsc-extension-quickstart.md
|-- webpack.cli.config.js
\-webpack.config.js
</pre>
