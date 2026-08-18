import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../contexts/AuthContext'

// Rutas a las que puede entrar el rol "lector_adherencia" (solo lectura de
// un único módulo). Cualquier otra ruta protegida lo redirige de vuelta.
const RUTAS_LECTOR_ADHERENCIA = [
  '/encuestas/adherencia-fichas',
  '/encuestas/adherencia-fichas/dashboard',
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { rol } = useAuth()
  const location = useLocation()

  if (rol === 'lector_adherencia' && !RUTAS_LECTOR_ADHERENCIA.includes(location.pathname)) {
    return <Navigate to="/encuestas/adherencia-fichas" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neu-page">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
