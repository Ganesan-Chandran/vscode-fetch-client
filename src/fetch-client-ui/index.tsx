import React from 'react';
import App from './App';
import './index.css';
import { store } from './store/appStore';
import { StateAndRouterProvider } from './store/stateAndRouterProvider';
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root')!);

root.render(
	<StateAndRouterProvider store={store}>
		{/* <React.StrictMode> */}
		<App />
		{/* </React.StrictMode> */}
	</StateAndRouterProvider>
);
