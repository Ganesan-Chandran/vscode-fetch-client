import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';
import { getAppStore } from './store/appStore';
import { StateAndRouterProvider } from './store/stateAndRouterProvider';

const store = getAppStore();

ReactDOM.render(
	<StateAndRouterProvider store={store}>
		<React.StrictMode>
			<App />
		</React.StrictMode>
	</StateAndRouterProvider>,
	document.getElementById('root')
);
