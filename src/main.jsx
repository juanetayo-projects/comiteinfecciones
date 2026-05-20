import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ── Supabase × HashRouter compatibility ──────────────────────────────────────
// Supabase recovery emails append tokens as URL hash fragments:
//   https://…/comiteinfecciones/#access_token=xxx&type=recovery
// HashRouter TAMBIÉN usa el hash para el routing, por lo que "traga" los tokens
// antes de que Supabase pueda leerlos.
// Solución: detectar los tokens ANTES de que React renderice, guardarlos en
// sessionStorage y reescribir el hash a la ruta correcta.
const rawHash = window.location.hash   // ej: "#access_token=xxx&type=recovery"
if (rawHash.includes('access_token=') && rawHash.includes('type=recovery')) {
  sessionStorage.setItem('supabase_recovery_hash', rawHash.slice(1)) // sin el #
  window.location.hash = '#/reset-password'
}
// ─────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
