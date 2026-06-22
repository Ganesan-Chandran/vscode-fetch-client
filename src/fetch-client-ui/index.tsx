import './index.css';
import { StateAndRouterProvider } from './store/stateAndRouterProvider';
import { store } from './store/appStore';
import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';

// @ts-ignore
ReactDOM.render(
	<StateAndRouterProvider store={store}>
		<App />
	</StateAndRouterProvider>,
	document.getElementById('root')!
);