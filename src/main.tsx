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

// Service Worker de tiles desativado temporariamente (CSP da Cloudflare bloqueia fetch)
// Desregistrar SW antigo caso exista no navegador do usuário
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
