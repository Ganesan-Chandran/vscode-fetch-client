import './index.css';
import { createRoot } from 'react-dom/client';
import { StateAndRouterProvider } from './store/stateAndRouterProvider';
import { store } from './store/appStore';
import App from './App';
import React from 'react';

const root = createRoot(document.getElementById('root')!);

root.render(
	<StateAndRouterProvider store={store}>
		<App />
	</StateAndRouterProvider>
);
