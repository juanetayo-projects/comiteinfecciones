import { useState } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useAuth } from '../../contexts/AuthContext'
import { MODULOS_ENCUESTA, moduloDeRuta, navPathDeModulo } from '../../lib/modulos'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { rol, tieneAccesoModulo } = useAuth()
  const location = useLocation()

  // Rol de solo-lectura de encuestas: nada fuera de los módulos de encuesta,
  // y dentro de ellos solo listado/dashboard (nunca captura ni edición).
  const soloEncuestas = rol === 'lector_adherencia'
  const modulo = moduloDeRuta(location.pathname)
  const primerModuloPermitido = () =>
    navPathDeModulo(MODULOS_ENCUESTA.find(m => tieneAccesoModulo(m.key))?.key)

  // Ruta de un módulo de encuesta al que este usuario no tiene acceso.
  if (modulo && !tieneAccesoModulo(modulo.key)) {
    return <Navigate to={primerModuloPermitido()} replace />
  }
  if (soloEncuestas) {
    if (!modulo) return <Navigate to={primerModuloPermitido()} replace />
    if (location.pathname.endsWith('/nuevo') || /\/editar$/.test(location.pathname)) {
      return <Navigate to={modulo.basePaths[0]} replace />
    }
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
