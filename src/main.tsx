// main.tsx - Ponto de entrada da aplicação

import React from 'react'
import ReactDOM from 'react-dom/client'
import { initSentry } from './lib/sentry'
import App from './App.tsx'
import './index.css'

// Inicializar Sentry antes de qualquer coisa
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Registrar Service Worker para cache de tiles do mapa
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-tiles.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}
