import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import Layout from './components/layout/Layout'

// Auth
import Login         from './pages/Login'
import ResetPassword from './pages/ResetPassword'

// Páginas principales
import Dashboard     from './pages/Dashboard'
import Kanban        from './pages/Kanban'
import Registros     from './pages/Registros'
import Reportes      from './pages/Reportes'
import Usuarios      from './pages/Usuarios'
import Configuracion from './pages/Configuracion'

// ── Aislamiento ──────────────────────────────────────────────
import Aislamiento     from './pages/encuestas/Aislamiento'
import AislamientoForm from './pages/encuestas/AislamientoForm'

// ── Higiene de Manos ─────────────────────────────────────────
import HigieneManos    from './pages/encuestas/HigieneManos'
import HigieneManosForn from './pages/encuestas/HigieneManosForn'

// ── Luminometría ─────────────────────────────────────────────
import Luminometria    from './pages/encuestas/Luminometria'
import LuminometriaForm from './pages/encuestas/LuminometriaForm'

// ── Ronda de Cirugía ─────────────────────────────────────────
import RondaCirugia    from './pages/encuestas/RondaCirugia'
import RondaCirugiaForm from './pages/encuestas/RondaCirugiaForm'

// ── Seguimiento Dispositivos (hub + 3 módulos) ───────────────
import SeguimientoDispositivos    from './pages/encuestas/SeguimientoDispositivos'
import AccesoVenoso               from './pages/encuestas/AccesoVenoso'
import AccesoVenosoForm           from './pages/encuestas/AccesoVenosoForm'
import CateterVesical             from './pages/encuestas/CateterVesical'
import CateterVesicalForm         from './pages/encuestas/CateterVesicalForm'
import PrevencionNeumonia         from './pages/encuestas/PrevencionNeumonia'
import PrevencionNeumoniaForm     from './pages/encuestas/PrevencionNeumoniaForm'

// ── Dashboards ───────────────────────────────────────────────
import AislamentoDashboard   from './pages/dashboards/AislamentoDashboard'
import HigieneDashboard      from './pages/dashboards/HigieneDashboard'
import LuminometriaDashboard from './pages/dashboards/LuminometriaDashboard'
import RondaDashboard        from './pages/dashboards/RondaDashboard'
import DispositivosDashboard from './pages/dashboards/DispositivosDashboard'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          {/* Públicas */}
          <Route path="/login"          element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protegidas */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Aislamiento */}
            <Route path="/encuestas/aislamiento"            element={<Aislamiento />} />
            <Route path="/encuestas/aislamiento/nuevo"      element={<AislamientoForm />} />
            <Route path="/encuestas/aislamiento/:id/editar" element={<AislamientoForm />} />
            <Route path="/encuestas/aislamiento/dashboard"  element={<AislamentoDashboard />} />

            {/* Higiene de Manos */}
            <Route path="/encuestas/higiene-manos"            element={<HigieneManos />} />
            <Route path="/encuestas/higiene-manos/nuevo"      element={<HigieneManosForn />} />
            <Route path="/encuestas/higiene-manos/:id/editar" element={<HigieneManosForn />} />
            <Route path="/encuestas/higiene-manos/dashboard"  element={<HigieneDashboard />} />

            {/* Luminometría */}
            <Route path="/encuestas/luminometria"            element={<Luminometria />} />
            <Route path="/encuestas/luminometria/nuevo"      element={<LuminometriaForm />} />
            <Route path="/encuestas/luminometria/:id/editar" element={<LuminometriaForm />} />
            <Route path="/encuestas/luminometria/dashboard"  element={<LuminometriaDashboard />} />

            {/* Ronda de Cirugía */}
            <Route path="/encuestas/ronda-cirugia"            element={<RondaCirugia />} />
            <Route path="/encuestas/ronda-cirugia/nuevo"      element={<RondaCirugiaForm />} />
            <Route path="/encuestas/ronda-cirugia/:id/editar" element={<RondaCirugiaForm />} />
            <Route path="/encuestas/ronda-cirugia/dashboard"  element={<RondaDashboard />} />

            {/* Seguimiento Dispositivos — hub + dashboard */}
            <Route path="/encuestas/seguimiento-dispositivos"           element={<SeguimientoDispositivos />} />
            <Route path="/encuestas/seguimiento-dispositivos/dashboard" element={<DispositivosDashboard />} />

            {/* Acceso Venoso Periférico */}
            <Route path="/encuestas/acceso-venoso"            element={<AccesoVenoso />} />
            <Route path="/encuestas/acceso-venoso/nuevo"      element={<AccesoVenosoForm />} />
            <Route path="/encuestas/acceso-venoso/:id/editar" element={<AccesoVenosoForm />} />

            {/* Catéter Vesical */}
            <Route path="/encuestas/cateter-vesical"            element={<CateterVesical />} />
            <Route path="/encuestas/cateter-vesical/nuevo"      element={<CateterVesicalForm />} />
            <Route path="/encuestas/cateter-vesical/:id/editar" element={<CateterVesicalForm />} />

            {/* Prevención de Neumonía */}
            <Route path="/encuestas/prevencion-neumonia"            element={<PrevencionNeumonia />} />
            <Route path="/encuestas/prevencion-neumonia/nuevo"      element={<PrevencionNeumoniaForm />} />
            <Route path="/encuestas/prevencion-neumonia/:id/editar" element={<PrevencionNeumoniaForm />} />

            {/* Resto */}
            <Route path="/kanban"        element={<Kanban />} />
            <Route path="/registros"     element={<Registros />} />
            <Route path="/reportes"      element={<Reportes />} />
            <Route path="/usuarios"      element={<Usuarios />} />
            <Route path="/configuracion" element={<Configuracion />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
