import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Register Service Worker for PWA support
if ('serviceWorker' in navigator && (import.meta.env.PROD || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'https:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[PWA] Service Worker registration deferred:', err.message);
    });
  });
}
