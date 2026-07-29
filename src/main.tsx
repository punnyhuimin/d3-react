import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/pages/App';
import { applyStoredTheme } from '@/lib/theme';
import '@/styles/tokens.css';

// Ahead of the first render, so a pinned theme never flashes the other one on load.
applyStoredTheme();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
