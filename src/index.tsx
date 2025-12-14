import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Deployment logging
console.info('🚀 PVARA AI Eval - Starting Application');
console.info('Environment:', process.env.NODE_ENV);
console.info('API URL:', process.env.REACT_APP_API_URL);
console.info('Build timestamp:', new Date().toISOString());

try {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  console.info('✅ Root element found, rendering app...');
  
  // Note: StrictMode removed to prevent double API calls in development
  // StrictMode causes useEffect to run twice, leading to duplicate backend requests
  root.render(
    <App />
  );
  
  console.info('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Failed to render app:', error);
  // Display error on screen
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: monospace;">
      <h1 style="color: red;">Application Failed to Load</h1>
      <pre>${error}</pre>
    </div>
  `;
}
