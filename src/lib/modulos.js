// Registro único de módulos de encuesta: clave (coincide con
// user_profiles.modulos_permitidos y modulo_permisos.modulo), ruta de
// navegación del sidebar y rutas base que pertenecen a ese módulo (algunos
// módulos, como Seguimiento Dispositivos, agrupan varias rutas top-level).
export const MODULOS_ENCUESTA = [
  { key: 'aislamiento',               label: 'Aislamiento',                basePaths: ['/encuestas/aislamiento'] },
  { key: 'higiene_manos',             label: 'Higiene de Manos',           basePaths: ['/encuestas/higiene-manos'] },
  { key: 'luminometria',              label: 'Luminometría',               basePaths: ['/encuestas/luminometria'] },
  { key: 'ronda_cirugia',             label: 'Ronda de Cirugía',           basePaths: ['/encuestas/ronda-cirugia'] },
  { key: 'seguimiento_dispositivos',  label: 'Seguimiento Dispositivos',   basePaths: [
      '/encuestas/seguimiento-dispositivos', '/encuestas/acceso-venoso',
      '/encuestas/cateter-vesical', '/encuestas/prevencion-neumonia',
    ] },
  { key: 'adherencia_fichas',         label: 'Adherencia Fichas Epi.',     basePaths: ['/encuestas/adherencia-fichas'] },
  { key: 'adherencia_prevencion_nav', label: 'Adherencia Prevención NAV',  basePaths: ['/encuestas/adherencia-prevencion-nav'] },
  { key: 'adherencia_prevencion_nc',  label: 'Adherencia Prevención NC',   basePaths: ['/encuestas/adherencia-prevencion-nc'] },
]

export function navPathDeModulo(key) {
  return MODULOS_ENCUESTA.find(m => m.key === key)?.basePaths[0] ?? '/dashboard'
}

// Encuentra el módulo (si existe) al que pertenece una ruta dada.
export function moduloDeRuta(pathname) {
  return MODULOS_ENCUESTA.find(m => m.basePaths.some(p => pathname === p || pathname.startsWith(p + '/')))
}
