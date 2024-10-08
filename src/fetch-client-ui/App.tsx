import * as React from "react";
import { ErrorBoundary } from 'react-error-boundary';
import "./App.css";

const SideBar = React.lazy(() => import('./components/SideBar'));
const MainUI = React.lazy(() => import('./components/MainUI'));
const AddToCollection = React.lazy(() => import('./components/Collection/AddTo/addTo'));
const CopyTo = React.lazy(() => import('./components/Collection/CopyTo/copyTo'));
const Variables = React.lazy(() => import('./components/Variables'));
const AttachVariable = React.lazy(() => import('./components/Collection/AttachVariable/attachVariable'));
const ManageCookies = React.lazy(() => import('./components/Cookies'));
const CollectionSettings = React.lazy(() => import('./components/Collection/Settings/CollectionSettings'));
const RunAll = React.lazy(() => import('./components/Collection/RunAll/runAll'));
const ErrorLog = React.lazy(() => import('./components/ErrorLog/ErrorLog'));
const CurlUI = React.lazy(() => import('./components/Curl'));
const BulkExportUI = React.lazy(() => import('./components/Collection/BulkExport/bulkExport'));
const AutoRequestUI = React.lazy(() => import('./components/AutoRequest'));

function ErrorFallback({ error }) {
	const errorData = " Name : " + error.name + "\n\n" + " Message : " + error.message + "\n\n" + " Stack : " + error.stack;

	return (
		<div className="error-panel">
			<input className="error-something-text-box" type="text" value="💥💥 Something went wrong 💥💥"></input>
			<textarea className="error-header-text-box" value={"Error : " + error.message} readOnly={true}>
			</textarea>
			<div className="error-text-panel">
				<textarea className="error-text-box" value={errorData} readOnly={true}>
				</textarea>
			</div>
			<div className="issue-raise-button-panel">
				<a href="https://github.com/Ganesan-Chandran/vscode-fetch-client/issues/new/choose" className="request-send-button issue-raise-button">
					Raise Issue
				</a>
			</div>
		</div>
	);
}

const App = () => {
	return (
		<div className="app">
			<ErrorBoundary FallbackComponent={ErrorFallback}>
				<React.Suspense fallback={<div>loading...</div>}>
					{renderUI()}
				</React.Suspense>
			</ErrorBoundary>
		</div >
	);
};

function renderUI() {
	if (document.title === 'sideBar') {
		return <SideBar />;
	} else if (document.title.includes('addtocol')) {
		return <AddToCollection />;
	} else if (document.title.includes('copytocol')) {
		return <CopyTo />;
	} else if (document.title.includes('newvar')) {
		return <Variables />;
	} else if (document.title.includes('attachcol')) {
		return <AttachVariable />;
	} else if (document.title.includes('runall')) {
		return <RunAll />;
	} else if (document.title.includes('colsettings')) {
		return <CollectionSettings />;
	} else if (document.title.includes('curlreq')) {
		return <CurlUI />;
	} else if (document.title.includes('managecookies')) {
		return <ManageCookies />;
	} else if (document.title.includes('errorlog')) {
		return <ErrorLog />;
	} else if (document.title.includes('bulkexport')) {
		return <BulkExportUI />;
	} else if (document.title.includes('autorequest')) {
		return <AutoRequestUI />;
	} else {
		return <MainUI />;
	}
}

export default App;
