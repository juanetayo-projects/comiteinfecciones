import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { FileBarChart2, Filter, X, ChevronDown, ChevronUp } from 'lucide-react'
import ExportButtons from '../components/common/ExportButtons'

// ── Período ──────────────────────────────────────────────────────
const MESES = [
  { v:'01',l:'Enero'     },{ v:'02',l:'Febrero'   },{ v:'03',l:'Marzo'      },
  { v:'04',l:'Abril'     },{ v:'05',l:'Mayo'       },{ v:'06',l:'Junio'      },
  { v:'07',l:'Julio'     },{ v:'08',l:'Agosto'     },{ v:'09',l:'Septiembre' },
  { v:'10',l:'Octubre'   },{ v:'11',l:'Noviembre'  },{ v:'12',l:'Diciembre'  },
]
const ANIOS = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i))

// ── Utility: filtrar por período ──────────────────────────────────
function filterByPeriod(rows, dateField, anio, mes) {
  return rows.filter(r => {
    const d = r[dateField]
    if (!d) return true
    const ds = typeof d === 'string' ? d : new Date(d).toISOString()
    if (anio && !ds.startsWith(anio)) return false
    if (mes  && !ds.startsWith(`${anio}-${mes}`)) return false
    return true
  })
}

// ── Utility: resumen de cumplimiento genérico ────────────────────
function buildSummary(rows, key, resultKey) {
  const map = {}
  rows.forEach(r => {
    const name = r[key] || 'Sin datos'
    if (!map[name]) map[name] = { nombre: name, cumple: 0, noCumple: 0 }
    if (r[resultKey] === 'CUMPLE') map[name].cumple++
    else map[name].noCumple++
  })
  return Object.values(map).map(r => ({
    ...r,
    total: r.cumple + r.noCumple,
    pct: Math.round((r.cumple / (r.cumple + r.noCumple)) * 100) || 0,
  })).sort((a, b) => b.total - a.total)
}

// ── Utility: luminometría (incluye RLU) ───────────────────────────
function buildSummaryRLU(rows, key) {
  const map = {}
  rows.forEach(r => {
    const name = r[key] || 'Sin datos'
    if (!map[name]) map[name] = { nombre: name, cumple: 0, noCumple: 0, totalRLU: 0, count: 0 }
    if (r.rango === 'CUMPLE') map[name].cumple++
    else map[name].noCumple++
    map[name].totalRLU += Number(r.resultado) || 0
    map[name].count++
  })
  return Object.values(map).map(r => ({
    ...r,
    total: r.cumple + r.noCumple,
    pct:    r.count > 0 ? Math.round((r.cumple / r.count) * 100) : 0,
    promRLU: r.count > 0 ? Math.round(r.totalRLU / r.count) : 0,
  })).sort((a, b) => b.total - a.total)
}

// ── Utility: ronda (profilaxis con NO APLICA) ─────────────────────
function buildSummaryProfilaxis(rows, key) {
  const map = {}
  rows.forEach(r => {
    const name = r[key] || 'Sin datos'
    if (!map[name]) map[name] = { nombre: name, cumple: 0, noCumple: 0, noAplica: 0 }
    const v = r.cumplimiento_profilaxis || 'SIN DATO'
    if      (v === 'CUMPLE')    map[name].cumple++
    else if (v === 'NO APLICA') map[name].noAplica++
    else                         map[name].noCumple++
  })
  return Object.values(map).map(r => ({
    ...r,
    total: r.cumple + r.noCumple + r.noAplica,
    pct: (r.cumple + r.noCumple + r.noAplica) > 0
      ? Math.round((r.cumple / (r.cumple + r.noCumple + r.noAplica)) * 100) : 0,
  })).sort((a, b) => b.total - a.total)
}

// ── Utility: dispositivos (criterios booleanos) ───────────────────
const AVP_KEYS = ['criterio_1_rotulo','criterio_2_fijacion','criterio_3_mantenimiento','criterio_4_pertinencia','criterio_5_educacion']
const CV_KEYS  = ['criterio_1_fijacion','criterio_2_posicion_bolsa','criterio_3_rotulacion','criterio_4_indicacion','criterio_5_flujo_continuo','criterio_6_lista_chequeo_sonda']
const PN_KEYS  = ['criterio_1_cabecera','criterio_2_higiene_oral','criterio_3_implementos','criterio_4_lista_chequeo_nav']

function calcAdherenciaDisp(rows, keys) {
  if (!rows.length) return 0
  const total  = rows.length * keys.length
  const cumple = rows.reduce((acc, r) => acc + keys.filter(k => r[k] === true).length, 0)
  return total > 0 ? Math.round((cumple / total) * 100) : 0
}

function buildSummaryDisp(rows, criterioKeys) {
  const map = {}
  rows.forEach(r => {
    const ub = r.ubicacion_cama || 'Sin ubicación'
    if (!map[ub]) map[ub] = { nombre: ub, registros: 0, cumpleCrit: 0, totalCrit: 0 }
    map[ub].registros++
    criterioKeys.forEach(k => {
      map[ub].totalCrit++
      if (r[k] === true) map[ub].cumpleCrit++
    })
  })
  return Object.values(map).map(r => ({
    ...r,
    pct: r.totalCrit > 0 ? Math.round((r.cumpleCrit / r.totalCrit) * 100) : 0,
  })).sort((a, b) => b.registros - a.registros)
}

// ── Utility: higiene (por servicio → por perfil) ──────────────────
function buildSummaryHigiene(rows) {
  const svcs = [...new Set(rows.map(r => r.servicio_evaluado || 'Sin servicio'))].sort()
  return svcs.map(servicio => {
    const filas = rows.filter(r => (r.servicio_evaluado || 'Sin servicio') === servicio)
    const pMap = {}
    filas.forEach(r => {
      const p = r.perfil_colaborador || 'Sin perfil'
      if (!pMap[p]) pMap[p] = { nombre: p, total: 0, cumple: 0, noCumple: 0, sumTotal: 0 }
      pMap[p].total++
      pMap[p].sumTotal += r.sumatoria_cumplimiento ?? 0
      if (r.resultado_cumplimiento === 'CUMPLE') pMap[p].cumple++
      else pMap[p].noCumple++
    })
    const perfiles = Object.values(pMap).map(p => ({
      ...p,
      promSuma: p.total > 0 ? (p.sumTotal / p.total).toFixed(1) : '0',
      pct: Math.round((p.cumple / p.total) * 100) || 0,
    })).sort((a, b) => a.nombre.localeCompare(b.nombre))
    return { servicio, totalRegistros: filas.length, perfiles }
  })
}

// ── UI: encabezado de sección ────────────────────────────────────
function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-slate-700 border-l-4 border-indigo-400 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

// ── UI: KPI de porcentaje ────────────────────────────────────────
function KpiPct({ label, value, sub, color }) {
  const cls = {
    blue:    'bg-blue-50   text-blue-700   border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber:   'bg-amber-50  text-amber-700  border-amber-100',
    purple:  'bg-purple-50 text-purple-700 border-purple-100',
    indigo:  'bg-indigo-50 text-indigo-700 border-indigo-100',
    cyan:    'bg-cyan-50   text-cyan-700   border-cyan-100',
    violet:  'bg-violet-50 text-violet-700 border-violet-100',
  }[color] ?? 'bg-slate-50 text-slate-700 border-slate-100'
  return (
    <div className={`card border p-2.5 text-center ${cls}`}>
      <p className={`text-2xl font-bold leading-tight ${value >= 80 ? '' : 'text-red-600'}`}>{value}%</p>
      <p className="text-[11px] font-medium mt-0.5 leading-tight">{label}</p>
      {sub && <p className="text-[10px] opacity-60">{sub}</p>}
    </div>
  )
}

// ── UI: botón de sección colapsable ──────────────────────────────
function SectionBtn({ title, count, badge, open, onToggle }) {
  return (
    <button onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors text-left">
      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${badge}`}>{title.slice(0,2)}</span>
      <span className="font-semibold text-slate-800 flex-1 text-sm">{title}</span>
      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{count} registros</span>
      {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </button>
  )
}

// ── UI: tabla genérica de resumen ────────────────────────────────
function SummaryTable({ rows, cols }) {
  if (!rows.length) return (
    <p className="text-sm text-slate-400 text-center py-4">Sin datos para el período seleccionado</p>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {cols.map(c => (
              <th key={c.key}
                className={`pb-2 font-medium text-slate-600 ${c.center ? 'text-center px-2' : 'text-left pr-4'}`}
                style={c.color ? { color: c.color } : {}}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              {cols.map(c => (
                <td key={c.key} className={`py-2 ${c.center ? 'text-center px-2' : 'pr-4'}`}>
                  {c.render ? c.render(r[c.key], r)
                    : c.pct ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                        ${r[c.key] >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {r[c.key]}%
                      </span>
                    ) : (
                      <span className={c.bold ? 'font-semibold' : ''}>{r[c.key]}</span>
                    )
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Column definitions ───────────────────────────────────────────
const COLS_CUMPLE = [
  { key:'nombre',   label:'Nombre',    center:false, bold:true },
  { key:'cumple',   label:'CUMPLE',    center:true,  color:'#10b981', bold:true,
    render:(v) => <span className="font-semibold text-emerald-600">{v}</span> },
  { key:'noCumple', label:'NO CUMPLE', center:true,  color:'#f87171',
    render:(v) => <span className="font-semibold text-red-500">{v}</span> },
  { key:'total',    label:'Total',     center:true },
  { key:'pct',      label:'% Cumpl.',  center:true,  pct:true },
]
const COLS_RLU = [
  { key:'nombre',   label:'Nombre',    center:false, bold:true },
  { key:'cumple',   label:'CUMPLE',    center:true,  color:'#10b981',
    render:(v) => <span className="font-semibold text-emerald-600">{v}</span> },
  { key:'noCumple', label:'NO CUMPLE', center:true,  color:'#f87171',
    render:(v) => <span className="font-semibold text-red-500">{v}</span> },
  { key:'total',    label:'Total',     center:true },
  { key:'promRLU',  label:'Prom. RLU', center:true,  color:'#f59e0b',
    render:(v) => <span className="font-semibold text-amber-600">{v}</span> },
  { key:'pct',      label:'% Cumpl.',  center:true,  pct:true },
]
const COLS_PROF = [
  { key:'nombre',   label:'Nombre',    center:false, bold:true },
  { key:'cumple',   label:'CUMPLE',    center:true,  color:'#10b981',
    render:(v) => <span className="font-semibold text-emerald-600">{v}</span> },
  { key:'noCumple', label:'NO CUMPLE', center:true,  color:'#f87171',
    render:(v) => <span className="font-semibold text-red-500">{v}</span> },
  { key:'noAplica', label:'NO APLICA', center:true,
    render:(v) => <span className="text-slate-400">{v}</span> },
  { key:'total',    label:'Total',     center:true },
  { key:'pct',      label:'% Cumpl.',  center:true,  pct:true },
]
const COLS_DISP = [
  { key:'nombre',     label:'Ubicación / Cama', center:false, bold:true },
  { key:'registros',  label:'Registros',        center:true },
  { key:'cumpleCrit', label:'Criterios Cumplidos', center:true, color:'#10b981',
    render:(v, r) => <span className="font-semibold text-emerald-600">{v} / {r.totalCrit}</span> },
  { key:'pct',        label:'% Adherencia',     center:true, pct:true },
]
const COLS_HIG = [
  { key:'nombre',   label:'Perfil',      center:false, bold:true },
  { key:'cumple',   label:'CUMPLE',      center:true,  color:'#10b981',
    render:(v) => <span className="font-semibold text-emerald-600">{v}</span> },
  { key:'noCumple', label:'NO CUMPLE',   center:true,  color:'#f87171',
    render:(v) => <span className="font-semibold text-red-500">{v}</span> },
  { key:'total',    label:'Registros',   center:true },
  { key:'promSuma', label:'Prom. Suma',  center:true,  color:'#3b82f6',
    render:(v) => <span className="font-semibold text-blue-600">{v}</span> },
  { key:'pct',      label:'% Cumpl.',    center:true,  pct:true },
]

// ── Component principal ──────────────────────────────────────────
export default function Reportes() {
  const [raw,    setRaw]    = useState(null)
  const [anio,   setAnio]   = useState(String(new Date().getFullYear()))
  const [mes,    setMes]    = useState('')
  const [open,   setOpen]   = useState({})

  useEffect(() => {
    Promise.all([
      supabase.from('encuesta_aislamiento').select('*'),
      supabase.from('encuesta_higiene_manos').select('*'),
      supabase.from('encuesta_luminometria').select('*'),
      supabase.from('encuesta_ronda_cirugia').select('*'),
      supabase.from('encuesta_acceso_venoso').select('*'),
      supabase.from('encuesta_cateter_vesical').select('*'),
      supabase.from('encuesta_prevencion_neumonia').select('*'),
    ]).then(([a, h, l, r, avp, cv, pn]) => {
      setRaw({
        ais: a.data   ?? [],
        hig: h.data   ?? [],
        lum: l.data   ?? [],
        ron: r.data   ?? [],
        avp: avp.data ?? [],
        cv:  cv.data  ?? [],
        pn:  pn.data  ?? [],
      })
    })
  }, [])

  const D = useMemo(() => {
    if (!raw) return null
    const fp = (rows, field) => filterByPeriod(rows, field, anio, mes)
    return {
      ais: fp(raw.ais, 'fecha_registro'),
      hig: fp(raw.hig, 'fecha_evaluacion'),
      lum: fp(raw.lum, 'fecha_registro'),
      ron: fp(raw.ron, 'fecha_registro'),
      avp: fp(raw.avp, 'fecha_registro'),
      cv:  fp(raw.cv,  'fecha_registro'),
      pn:  fp(raw.pn,  'fecha_registro'),
    }
  }, [raw, anio, mes])

  function toggle(key) { setOpen(prev => ({ ...prev, [key]: !prev[key] })) }

  if (!D) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // KPIs globales
  const pctAis = D.ais.length > 0 ? Math.round(D.ais.filter(r => r.adherencia === 'CUMPLE').length / D.ais.length * 100) : 0
  const pctHig = D.hig.length > 0 ? Math.round(D.hig.filter(r => r.resultado_cumplimiento === 'CUMPLE').length / D.hig.length * 100) : 0
  const pctLum = D.lum.length > 0 ? Math.round(D.lum.filter(r => r.rango === 'CUMPLE').length / D.lum.length * 100) : 0
  const pctRon = D.ron.length > 0 ? Math.round(D.ron.filter(r => r.cumplimiento_profilaxis === 'CUMPLE').length / D.ron.length * 100) : 0
  const pctAvp = calcAdherenciaDisp(D.avp, AVP_KEYS)
  const pctCv  = calcAdherenciaDisp(D.cv,  CV_KEYS)
  const pctPn  = calcAdherenciaDisp(D.pn,  PN_KEYS)

  // Summary tables
  const aisServ = buildSummary(D.ais, 'servicio', 'adherencia')
  const aisProf = buildSummary(D.ais, 'profesional', 'adherencia')
  const aisTipo = buildSummary(D.ais, 'tipo_aislamiento', 'adherencia')
  const higServ = buildSummaryHigiene(D.hig)
  const lumServ = buildSummaryRLU(D.lum, 'servicio_evaluado')
  const lumObj  = buildSummaryRLU(D.lum, 'objeto')
  const ronQx   = buildSummaryProfilaxis(D.ron, 'quirofano')
  const ronEsp  = buildSummaryProfilaxis(D.ron, 'especialidad')
  const ronProf = buildSummaryProfilaxis(D.ron, 'profesional')
  const avpLoc  = buildSummaryDisp(D.avp, AVP_KEYS)
  const cvLoc   = buildSummaryDisp(D.cv,  CV_KEYS)
  const pnLoc   = buildSummaryDisp(D.pn,  PN_KEYS)

  const periodoLabel = mes
    ? `${MESES.find(m => m.v === mes)?.l} ${anio}`
    : `Año ${anio}`

  const SECCIONES = [
    {
      key:'ais', title:'Aislamiento', count:D.ais.length,
      badge:'bg-blue-100 text-blue-700',
      content: aisServ.length || aisProf.length || aisTipo.length ? (
        <div className="space-y-4">
          <div className="card p-5"><SH>Por Servicio</SH><SummaryTable rows={aisServ} cols={COLS_CUMPLE} /></div>
          <div className="card p-5"><SH>Por Profesional</SH><SummaryTable rows={aisProf} cols={COLS_CUMPLE} /></div>
          <div className="card p-5"><SH>Por Tipo de Aislamiento</SH><SummaryTable rows={aisTipo} cols={COLS_CUMPLE} /></div>
        </div>
      ) : null,
    },
    {
      key:'hig', title:'Higiene de Manos', count:D.hig.length,
      badge:'bg-emerald-100 text-emerald-700',
      content: higServ.length ? (
        <div className="space-y-4">
          {higServ.map(({ servicio, totalRegistros, perfiles }) => (
            <div key={servicio} className="card p-5">
              <div className="px-3 py-2 bg-slate-700 border-l-4 border-indigo-400 rounded-r-md mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white tracking-wide">{servicio}</h3>
                <span className="text-xs text-white bg-indigo-500 px-2 py-0.5 rounded-full">{totalRegistros} registros</span>
              </div>
              <SummaryTable rows={perfiles} cols={COLS_HIG} />
            </div>
          ))}
        </div>
      ) : null,
    },
    {
      key:'lum', title:'Luminometría', count:D.lum.length,
      badge:'bg-amber-100 text-amber-700',
      content: lumServ.length || lumObj.length ? (
        <div className="space-y-4">
          <div className="card p-5"><SH>Por Servicio</SH><SummaryTable rows={lumServ} cols={COLS_RLU} /></div>
          <div className="card p-5"><SH>Por Objeto / Superficie</SH><SummaryTable rows={lumObj} cols={COLS_RLU} /></div>
        </div>
      ) : null,
    },
    {
      key:'ron', title:'Ronda de Cirugía', count:D.ron.length,
      badge:'bg-purple-100 text-purple-700',
      content: ronQx.length || ronEsp.length || ronProf.length ? (
        <div className="space-y-4">
          <div className="card p-5"><SH>Por Quirófano</SH><SummaryTable rows={ronQx} cols={COLS_PROF} /></div>
          <div className="card p-5"><SH>Por Especialidad</SH><SummaryTable rows={ronEsp} cols={COLS_PROF} /></div>
          <div className="card p-5"><SH>Por Profesional</SH><SummaryTable rows={ronProf} cols={COLS_PROF} /></div>
        </div>
      ) : null,
    },
    {
      key:'avp', title:'Acceso Venoso Periférico (AVP)', count:D.avp.length,
      badge:'bg-indigo-100 text-indigo-700',
      content: avpLoc.length ? (
        <div className="card p-5"><SH>Por Ubicación / Cama</SH><SummaryTable rows={avpLoc} cols={COLS_DISP} /></div>
      ) : null,
    },
    {
      key:'cv', title:'Catéter Vesical', count:D.cv.length,
      badge:'bg-cyan-100 text-cyan-700',
      content: cvLoc.length ? (
        <div className="card p-5"><SH>Por Ubicación / Cama</SH><SummaryTable rows={cvLoc} cols={COLS_DISP} /></div>
      ) : null,
    },
    {
      key:'pn', title:'Prevención Neumonía (NAV)', count:D.pn.length,
      badge:'bg-violet-100 text-violet-700',
      content: pnLoc.length ? (
        <div className="card p-5"><SH>Por Ubicación / Cama</SH><SummaryTable rows={pnLoc} cols={COLS_DISP} /></div>
      ) : null,
    },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
          <FileBarChart2 className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h1 className="page-title">Reporte de Indicadores</h1>
          <p className="page-subtitle">Consolidado de cumplimiento por tipo de encuesta — {periodoLabel}</p>
        </div>
        <div className="ml-auto">
          <ExportButtons
            data={[
              { tipo: 'Aislamiento',              pct: pctAis, registros: D.ais.length },
              { tipo: 'Higiene de Manos',          pct: pctHig, registros: D.hig.length },
              { tipo: 'Luminometría',              pct: pctLum, registros: D.lum.length },
              { tipo: 'Ronda de Cirugía',          pct: pctRon, registros: D.ron.length },
              { tipo: 'Acceso Venoso Periférico',  pct: pctAvp, registros: D.avp.length },
              { tipo: 'Catéter Vesical',           pct: pctCv,  registros: D.cv.length  },
              { tipo: 'Prevención NAV',            pct: pctPn,  registros: D.pn.length  },
            ]}
            columns={[
              { header: 'Tipo de Encuesta',   key: 'tipo'      },
              { header: '% Cumplimiento',     key: 'pct'       },
              { header: 'N° Registros',       key: 'registros' },
            ]}
            filename={`reporte-indicadores-${periodoLabel.replace(' ', '-')}`}
            title="Reporte de Indicadores"
            subtitle={periodoLabel}
          />
        </div>
      </div>

      {/* Filtro de período */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Período</span>
          {mes && (
            <button onClick={() => setMes('')}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors">
              <X className="w-3 h-3" /> Ver año completo
            </button>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Año</label>
            <select className="input text-sm w-28" value={anio} onChange={e => setAnio(e.target.value)}>
              {ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Mes (opcional)</label>
            <select className="input text-sm w-44" value={mes} onChange={e => setMes(e.target.value)}>
              <option value="">Todos los meses</option>
              {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPIs globales */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Indicadores Globales — {periodoLabel}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          <KpiPct label="Aislamiento"    value={pctAis} sub={`${D.ais.length} reg.`} color="blue" />
          <KpiPct label="Hig. Manos"     value={pctHig} sub={`${D.hig.length} reg.`} color="emerald" />
          <KpiPct label="Luminometría"   value={pctLum} sub={`${D.lum.length} reg.`} color="amber" />
          <KpiPct label="Ronda Cirugía"  value={pctRon} sub={`${D.ron.length} reg.`} color="purple" />
          <KpiPct label="Acceso Venoso"  value={pctAvp} sub={`${D.avp.length} reg.`} color="indigo" />
          <KpiPct label="Catéter Vesic." value={pctCv}  sub={`${D.cv.length}  reg.`} color="cyan" />
          <KpiPct label="Prev. NAV"      value={pctPn}  sub={`${D.pn.length}  reg.`} color="violet" />
        </div>
      </div>

      {/* Secciones colapsables */}
      <div className="space-y-3">
        {SECCIONES.map(s => (
          <div key={s.key}>
            <SectionBtn
              title={s.title} count={s.count} badge={s.badge}
              open={!!open[s.key]} onToggle={() => toggle(s.key)}
            />
            {open[s.key] && (
              <div className="mt-2">
                {s.content ?? (
                  <div className="card p-6 text-center text-slate-400 text-sm">
                    Sin registros para el período seleccionado
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
