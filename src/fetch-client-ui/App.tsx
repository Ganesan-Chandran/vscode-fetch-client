import * as React from "react";
import { ErrorBoundary } from 'react-error-boundary';
import "./App.css";
import RunAll from "./components/Collection/runAll";

const SideBar = React.lazy(() => import('./components/SideBar'));
const MainUI = React.lazy(() => import('./components/MainUI'));
const AddToCollection = React.lazy(() => import('./components/Collection/addTo'));
const CopyTo = React.lazy(() => import('./components/Collection/copyTo'));
const Variables = React.lazy(() => import('./components/Variables'));
const AttachVariable = React.lazy(() => import('./components/Collection/attachVariable'));

function ErrorFallback({ error }) {
  const errorData = " Name : " + error.name + "\n\n" + " Message : " + error.message + "\n\n" + " Stack : " + error.stack;

  function onButtonClick() {

  }

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
        <a href="https://google.com" className="request-send-button issue-raise-button" onClick={onButtonClick}>
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
  } else {
    return <MainUI />;
  }
}

export default App;
