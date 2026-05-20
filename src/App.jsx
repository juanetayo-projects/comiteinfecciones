import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout from './components/layout/Layout'

// Páginas
import Login         from './pages/Login'
import Dashboard     from './pages/Dashboard'
import Kanban        from './pages/Kanban'
import Registros     from './pages/Registros'
import Reportes      from './pages/Reportes'
import Usuarios      from './pages/Usuarios'
import Configuracion from './pages/Configuracion'

// Encuestas
import Aislamiento     from './pages/encuestas/Aislamiento'
import AislamientoForm from './pages/encuestas/AislamientoForm'

// Importaciones lazy para las demás encuestas (se crearán progresivamente)
import HigieneManos            from './pages/encuestas/HigieneManos'
import HigieneManosForn        from './pages/encuestas/HigieneManosForn'
import Luminometria            from './pages/encuestas/Luminometria'
import LuminometriaForm        from './pages/encuestas/LuminometriaForm'
import RondaCirugia            from './pages/encuestas/RondaCirugia'
import RondaCirugiaForm        from './pages/encuestas/RondaCirugiaForm'
import SeguimientoDispositivos from './pages/encuestas/SeguimientoDispositivos'
import SeguimientoDispositivosForm from './pages/encuestas/SeguimientoDispositivosForm'

// Dashboards
import AislamentoDashboard     from './pages/dashboards/AislamentoDashboard'
import HigieneDashboard        from './pages/dashboards/HigieneDashboard'
import LuminometriaDashboard   from './pages/dashboards/LuminometriaDashboard'
import RondaDashboard          from './pages/dashboards/RondaDashboard'
import DispositivosDashboard   from './pages/dashboards/DispositivosDashboard'

export default function App() {
  return (
    <AuthProvider>
      {/* HashRouter: compatible con GitHub Pages sin configuración adicional */}
      <HashRouter>
        <Routes>
          {/* Pública */}
          <Route path="/login" element={<Login />} />

          {/* Protegidas */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Aislamiento */}
            <Route path="/encuestas/aislamiento"              element={<Aislamiento />} />
            <Route path="/encuestas/aislamiento/nuevo"        element={<AislamientoForm />} />
            <Route path="/encuestas/aislamiento/:id/editar"   element={<AislamientoForm />} />
            <Route path="/encuestas/aislamiento/dashboard"    element={<AislamentoDashboard />} />

            {/* Higiene de Manos */}
            <Route path="/encuestas/higiene-manos"            element={<HigieneManos />} />
            <Route path="/encuestas/higiene-manos/nuevo"      element={<HigieneManosForn />} />
            <Route path="/encuestas/higiene-manos/:id/editar" element={<HigieneManosForn />} />
            <Route path="/encuestas/higiene-manos/dashboard"  element={<HigieneDashboard />} />

            {/* Luminometría */}
            <Route path="/encuestas/luminometria"             element={<Luminometria />} />
            <Route path="/encuestas/luminometria/nuevo"       element={<LuminometriaForm />} />
            <Route path="/encuestas/luminometria/:id/editar"  element={<LuminometriaForm />} />
            <Route path="/encuestas/luminometria/dashboard"   element={<LuminometriaDashboard />} />

            {/* Ronda de Cirugía */}
            <Route path="/encuestas/ronda-cirugia"            element={<RondaCirugia />} />
            <Route path="/encuestas/ronda-cirugia/nuevo"      element={<RondaCirugiaForm />} />
            <Route path="/encuestas/ronda-cirugia/:id/editar" element={<RondaCirugiaForm />} />
            <Route path="/encuestas/ronda-cirugia/dashboard"  element={<RondaDashboard />} />

            {/* Seguimiento Dispositivos */}
            <Route path="/encuestas/seguimiento-dispositivos"            element={<SeguimientoDispositivos />} />
            <Route path="/encuestas/seguimiento-dispositivos/nuevo"      element={<SeguimientoDispositivosForm />} />
            <Route path="/encuestas/seguimiento-dispositivos/:id/editar" element={<SeguimientoDispositivosForm />} />
            <Route path="/encuestas/seguimiento-dispositivos/dashboard"  element={<DispositivosDashboard />} />

            {/* Resto */}
            <Route path="/kanban"       element={<Kanban />} />
            <Route path="/registros"    element={<Registros />} />
            <Route path="/reportes"     element={<Reportes />} />
            <Route path="/usuarios"     element={<Usuarios />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
