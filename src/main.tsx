import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppProviders } from './app/providers'
import { AppRouter } from './app/router'
import './index.css'

// Desregistrar cualquier Service Worker antiguo cached en dispositivos móviles durante desarrollo
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  })
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('[App] No se encontró el elemento #root en el DOM.')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </React.StrictMode>
)
