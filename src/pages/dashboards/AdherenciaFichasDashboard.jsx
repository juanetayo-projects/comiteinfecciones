import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { ArrowLeft, ClipboardCheck, Filter, X, Check } from 'lucide-react'
import DashboardPdfButton from '../../components/common/DashboardPdfButton'
import DetalleGraficaModal, { COL_ESTADO } from '../../components/common/DetalleGraficaModal'
import { filtrosResumen, formatDate } from '../../lib/utils'
import { PCT_HINT, withPct, useSeriesToggle } from '../../lib/chartLabels'

const MESES_LABEL = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const ANIO_COLORS = { 2022: '#94a3b8', 2023: '#38bdf8', 2024: '#a78bfa', 2025: '#f59e0b', 2026: '#059669' }
const CAUSA_COLOR = '#e11d48'
const SERVICIO_COLOR = '#2f6fe4'
const MEDICO_COLOR = '#7c3aed'
const RESULTADO_COLORS = ['#059669', '#e11d48'] // ADECUADO, CON ERROR

const COL_FECHA_REV = {
  key: 'fecha_revision', header: 'Fecha',
  render: v => <span className="whitespace-nowrap">{formatDate(v)}</span>,
}
const COL_RESULTADO = {
  key: 'resultado', header: 'Resultado',
  render: v => (
    <span className={`badge ${v === 'ADECUADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
      {v}
    </span>
  ),
}
const COLS_DETALLE = [
  COL_FECHA_REV,
  { key: 'servicio',      header: 'Servicio' },
  { key: 'medico',        header: 'Médico' },
  { key: 'codigo_evento', header: 'Código' },
  COL_RESULTADO,
  { key: 'tipo_error',    header: 'Tipo Error', render: v => v || '—' },
  COL_ESTADO,
]

function KpiCard({ label, value, sub, color = 'slate' }) {
  const cls = {
    emerald: 'kpi-tile kpi-emerald',
    red:     'kpi-tile kpi-red',
    indigo:  'kpi-tile kpi-indigo',
    blue:    'kpi-tile kpi-blue',
    slate:   'kpi-tile kpi-slate',
  }[color]
  return (
    <div className={`card p-4 ${cls}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
      {sub && <p className="text-[11px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

const INIT_FILTERS = { anio: '', mes: '', sede: '', servicio: '' }
const FILTER_LABELS = { anio: 'Año', mes: 'Mes', sede: 'Sede', servicio: 'Servicio' }
const MESES_OPTIONS = MESES_LABEL.map((label, i) => ({ value: i + 1, label }))

// Mes actual como AAAAMM: el Total Notificadas manual sólo se admite hasta aquí
function periodoActual() {
  const d = new Date()
  return d.getFullYear() * 100 + d.getMonth() + 1
}

export default function AdherenciaFichasDashboard() {
  const [data,       setData]       = useState([])
  const [resumenHist, setResumenHist] = useState([])
  const [totalesManual, setTotalesManual] = useState([])
  const [edicionTotal, setEdicionTotal] = useState({})   // mes_num -> texto del input
  const [guardandoMes, setGuardandoMes] = useState(null)
  const [errorTotal,   setErrorTotal]   = useState('')
  const { rol } = useAuth()
  const [loading,    setLoading]    = useState(true)
  const [filters,    setFilters]    = useState(INIT_FILTERS)
  const [anioTabla,  setAnioTabla]  = useState(new Date().getFullYear())
  const pdfRef = useRef(null)
  const tglAnios = useSeriesToggle()
  const [detalle, setDetalle] = useState(null)
  const abrirDetalle = (titulo, rows) =>
    setDetalle({ titulo, subtitulo: `${rows.length} registro(s) · según los filtros aplicados`, rows })

  useEffect(() => {
    Promise.all([
      supabase.from('encuesta_adherencia_fichas').select('*').order('fecha_revision', { ascending: false }),
      supabase.from('adherencia_resumen_mensual').select('*'),
      supabase.from('adherencia_total_notificado').select('*'),
    ]).then(([r1, r2, r3]) => {
      setData(r1.data ?? [])
      setResumenHist(r2.data ?? [])
      setTotalesManual(r3.data ?? [])
      setLoading(false)
    })
  }, [])

  const sedes     = useMemo(() => [...new Set(data.map(r => r.sede).filter(Boolean))].sort(), [data])
  const servicios = useMemo(() => [...new Set(data.map(r => r.servicio).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filters.anio && r.anio !== Number(filters.anio)) return false
      if (filters.mes && r.mes_num !== Number(filters.mes)) return false
      if (filters.sede && r.sede !== filters.sede) return false
      if (filters.servicio && r.servicio !== filters.servicio) return false
      return true
    })
  }, [data, filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function clearFilters() { setFilters(INIT_FILTERS) }
  function setF(key, val) { setFilters(prev => ({ ...prev, [key]: val })) }

  // Resumen mensual fusionado (anio + mes_num -> total/adecuado/errores): usa el
  // resumen histórico congelado para los meses previos al lanzamiento de este
  // módulo, y cuenta directo sobre la tabla transaccional para los meses
  // posteriores (que ya tienen el detalle fila a fila de fichas ADECUADAS y
  // CON ERROR). Es la fuente única de la línea año-a-año, la tabla mensual y
  // el KPI de % adherencia global.
  // Si el mes no tiene total histórico pero sí un Total Notificadas ingresado a
  // mano, ese es el denominador: errores = fichas CON ERROR capturadas y
  // adecuado = total - errores (normalmente sólo se capturan las de error).
  const manualMap = useMemo(() => {
    const m = {}
    totalesManual.forEach(r => { m[`${r.anio}-${r.mes_num}`] = r })
    return m
  }, [totalesManual])

  const { mesesMerged, histMap, compMap } = useMemo(() => {
    const histMap = {}
    resumenHist.filter(r => r.total_notificado > 0).forEach(r => {
      histMap[`${r.anio}-${r.mes_num}`] = {
        anio: r.anio, mes_num: r.mes_num,
        total: r.total_notificado, adecuado: r.adecuado, errores: r.errores,
      }
    })
    const compMap = {}
    data.forEach(r => {
      const k = `${r.anio}-${r.mes_num}`
      if (!compMap[k]) compMap[k] = { anio: r.anio, mes_num: r.mes_num, total: 0, adecuado: 0, errores: 0 }
      compMap[k].total++
      if (r.resultado === 'ADECUADO') compMap[k].adecuado++
      else compMap[k].errores++
    })
    const conManual = k => {
      const man = manualMap[k], comp = compMap[k]
      if (!man) return comp
      const errores = comp?.errores ?? 0
      return {
        anio: man.anio, mes_num: man.mes_num, total: man.total_notificado,
        adecuado: Math.max(man.total_notificado - errores, 0), errores,
      }
    }
    const keys = new Set([...Object.keys(histMap), ...Object.keys(compMap), ...Object.keys(manualMap)])
    const mesesMerged = [...keys]
      .map(k => histMap[k] ?? conManual(k))
      .sort((a, b) => a.anio - b.anio || a.mes_num - b.mes_num)
    return { mesesMerged, histMap, compMap }
  }, [data, resumenHist, manualMap])

  const aniosDisponibles = useMemo(
    () => [...new Set(mesesMerged.map(m => m.anio))].sort(),
    [mesesMerged]
  )

  // La línea año-a-año respeta el filtro de Año/Mes: si hay Año elegido, solo
  // se dibuja esa línea; si hay Mes elegido, el eje X se reduce a ese mes.
  const aniosLinea = useMemo(
    () => filters.anio ? aniosDisponibles.filter(a => a === Number(filters.anio)) : aniosDisponibles,
    [aniosDisponibles, filters.anio]
  )
  const mesesLinea = useMemo(
    () => filters.mes
      ? [{ label: MESES_LABEL[Number(filters.mes) - 1], mes_num: Number(filters.mes) }]
      : MESES_LABEL.map((label, i) => ({ label, mes_num: i + 1 })),
    [filters.mes]
  )

  const lineData = useMemo(() => mesesLinea.map(({ label, mes_num }) => {
    const row = { mes: label }
    aniosLinea.forEach(anio => {
      const m = mesesMerged.find(x => x.anio === anio && x.mes_num === mes_num)
      row[anio] = m && m.total > 0 ? Math.round((m.adecuado / m.total) * 100) : null
    })
    return row
  }), [mesesMerged, aniosLinea, mesesLinea])

  // Tabla resumen mensual del año seleccionado
  const tablaAnio = useMemo(() => MESES_LABEL.map((mesLabel, i) => {
    const mes_num = i + 1
    const m = mesesMerged.find(x => x.anio === anioTabla && x.mes_num === mes_num)
    const total = m?.total ?? 0
    const k = `${anioTabla}-${mes_num}`
    // Editable: mes actual o anterior, sin total histórico y sin total manual
    // previo (el administrador puede corregir uno ya ingresado).
    const editable = anioTabla * 100 + mes_num <= periodoActual()
      && !histMap[k]
      && (!manualMap[k] || rol === 'administrador')
    return {
      mes: mesLabel, mes_num, total, adecuado: m?.adecuado ?? 0, errores: m?.errores ?? 0,
      pct: total > 0 ? Math.round((m.adecuado / total) * 100) : null,
      editable, manual: Boolean(manualMap[k]), capturadas: compMap[k]?.total ?? 0,
    }
  }), [mesesMerged, anioTabla, histMap, compMap, manualMap, rol])

  async function guardarTotal(fila) {
    const valor = Number(edicionTotal[fila.mes_num])
    if (!Number.isInteger(valor) || valor <= 0) {
      setErrorTotal(`${fila.mes}: ingresa un número entero mayor que 0`)
      return
    }
    if (valor < fila.capturadas) {
      setErrorTotal(`${fila.mes}: el total no puede ser menor que las ${fila.capturadas} fichas ya registradas`)
      return
    }
    setErrorTotal('')
    setGuardandoMes(fila.mes_num)
    const q = fila.manual
      ? supabase.from('adherencia_total_notificado')
          .update({ total_notificado: valor, updated_at: new Date().toISOString() })
          .eq('anio', anioTabla).eq('mes_num', fila.mes_num)
      : supabase.from('adherencia_total_notificado')
          .insert({ anio: anioTabla, mes_num: fila.mes_num, total_notificado: valor })
    // .select() porque un UPDATE bloqueado por RLS no devuelve error (0 filas)
    const { data: rows, error } = await q.select()
    setGuardandoMes(null)
    if (error || !rows?.length) {
      setErrorTotal(`${fila.mes}: no se pudo guardar${error ? ` (${error.message})` : ' (sin permiso)'}`)
      return
    }
    setTotalesManual(prev => [...prev.filter(r => !(r.anio === anioTabla && r.mes_num === fila.mes_num)), rows[0]])
    setEdicionTotal(prev => { const n = { ...prev }; delete n[fila.mes_num]; return n })
  }

  // KPI de % adherencia global: suma los meses fusionados que coinciden con el
  // Año/Mes elegido. Solo aplica cuando no hay filtro de sede o servicio (el
  // resumen histórico no tiene ese desglose); con esos filtros activos se cae
  // al conteo directo sobre `filtered` más abajo.
  const kpiHistorico = useMemo(() => {
    const rows = mesesMerged.filter(m => {
      if (filters.anio && m.anio !== Number(filters.anio)) return false
      if (filters.mes && m.mes_num !== Number(filters.mes)) return false
      return true
    })
    const total    = rows.reduce((s, m) => s + m.total, 0)
    const adecuado = rows.reduce((s, m) => s + m.adecuado, 0)
    return { total, adecuado, pct: total > 0 ? Math.round((adecuado / total) * 100) : 0 }
  }, [mesesMerged, filters.anio, filters.mes])

  // El selector de la tabla "Resumen Mensual" sigue al filtro Año cuando está activo
  useEffect(() => {
    if (filters.anio) setAnioTabla(Number(filters.anio))
  }, [filters.anio])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total     = filtered.length
  const adecuado  = filtered.filter(r => r.resultado === 'ADECUADO').length
  const conError  = total - adecuado

  // Sin filtro de sede/servicio: el % de adherencia usa el histórico mensual
  // fusionado (más representativo, ya que la mayoría del histórico solo tiene
  // detalle de los casos CON ERROR). Con esos filtros, se muestra el conteo
  // directo sobre lo efectivamente filtrado.
  const usaAdherenciaHistorica = !filters.sede && !filters.servicio
  const pct = usaAdherenciaHistorica
    ? kpiHistorico.pct
    : (total > 0 ? Math.round((adecuado / total) * 100) : 0)

  const pieData = [
    { name: 'ADECUADO', value: adecuado },
    { name: 'CON ERROR', value: conError },
  ].filter(d => d.value > 0)

  const soloErrores = filtered.filter(r => r.resultado === 'CON ERROR')

  const causasData = withPct(Object.values(
    soloErrores.reduce((acc, r) => {
      const k = r.tipo_error || 'Sin especificar'
      if (!acc[k]) acc[k] = { name: k, cantidad: 0 }
      acc[k].cantidad++
      return acc
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad), 'cantidad', soloErrores.length)

  const servicioData = withPct(Object.values(
    soloErrores.reduce((acc, r) => {
      const k = r.servicio || 'Sin especificar'
      if (!acc[k]) acc[k] = { name: k, cantidad: 0 }
      acc[k].cantidad++
      return acc
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad), 'cantidad', soloErrores.length)

  const medicoData = withPct(Object.values(
    soloErrores.reduce((acc, r) => {
      const k = r.medico || 'Sin especificar'
      if (!acc[k]) acc[k] = { name: k, cantidad: 0 }
      acc[k].cantidad++
      return acc
    }, {})
  ).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10), 'cantidad', soloErrores.length)

  return (
    <div ref={pdfRef} className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/encuestas/adherencia-fichas"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Adherencia a Fichas Epidemiológicas</h1>
          <p className="page-subtitle">Correcto diligenciamiento de fichas SIVIGILA</p>
        </div>
        <div className="ml-auto" data-pdf-hide>
          <DashboardPdfButton
            targetRef={pdfRef}
            filename="dashboard_adherencia_fichas"
            title="Dashboard — Adherencia a Fichas Epidemiológicas"
            subtitle="Correcto diligenciamiento de fichas SIVIGILA"
            filtros={filtrosResumen(filters, FILTER_LABELS)}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4" data-pdf-hide>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors">
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
        <div className="filters-row" style={{ '--cols': 4 }}>
          <div>
            <label>Año</label>
            <select className="input" value={filters.anio} onChange={e => setF('anio', e.target.value)}>
              <option value="">Todos</option>
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label>Mes</label>
            <select className="input" value={filters.mes} onChange={e => setF('mes', e.target.value)}>
              <option value="">Todos</option>
              {MESES_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label>Sede</label>
            <select className="input" value={filters.sede} onChange={e => setF('sede', e.target.value)}>
              <option value="">Todas</option>
              {sedes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Servicio</label>
            <select className="input" value={filters.servicio} onChange={e => setF('servicio', e.target.value)}>
              <option value="">Todos</option>
              {servicios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-brand-600 mt-2">{total} de {data.length} registros mostrados</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Fichas Revisadas" value={total}      color="indigo" />
        <KpiCard label="% Adherencia"     value={`${pct}%`}  color={pct >= 90 ? 'emerald' : 'red'}
          sub={usaAdherenciaHistorica ? `${kpiHistorico.total} fichas · histórico + capturado` : `${adecuado} ADECUADO capturadas`} />
        <KpiCard label="Con Error"        value={conError}   color="red" />
        <KpiCard label="Causa Más Frecuente" value={causasData[0]?.name ?? '—'} color="blue"
          sub={causasData[0] ? `${causasData[0].cantidad} caso(s)` : ''} />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* % Adherencia año a año */}
          <div className="card p-5">
            <h3 className="section-title mb-1">% Adherencia Mensual — Comparativo por Año</h3>
            <p className="text-[10px] text-slate-500 mb-2">
              Meses previos al lanzamiento de este módulo usan el resumen histórico migrado del Excel; los
              meses posteriores se calculan directo sobre las fichas registradas.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={lineData} margin={{ top: 10, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip formatter={v => v == null ? 'Sin datos' : `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }} onClick={tglAnios.onLegendClick} formatter={tglAnios.legendFormatter} />
                {aniosLinea.map(anio => (
                  <Line key={anio} type="monotone" dataKey={anio} name={String(anio)}
                    stroke={ANIO_COLORS[anio] ?? '#64748b'} strokeWidth={2}
                    hide={tglAnios.hidden.has(anio)}
                    dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-4">Resultado Global</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value" cursor="pointer"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                    onClick={d => abrirDetalle(`Resultado — ${d.name}`, filtered.filter(r => r.resultado === d.name))}>
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={d.name === 'ADECUADO' ? RESULTADO_COLORS[0] : RESULTADO_COLORS[1]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-1">Causas del Error</h3>
              <p className="text-[10px] text-slate-500 mb-2">Distribución de los hallazgos CON ERROR</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={causasData} layout="vertical" margin={{ top: 5, left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill={CAUSA_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false}
                    onClick={d => abrirDetalle(`Causa — ${d.name}`, soloErrores.filter(r => (r.tipo_error || 'Sin especificar') === d.name))}>
                    <LabelList dataKey="etiqueta" position="right" style={{ fontSize: 10, fill: '#334155' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-1">Hallazgos con Error por Servicio</h3>
              <p className="text-[10px] text-slate-500 mb-2">{PCT_HINT.split('·')[0]}</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={servicioData} margin={{ top: 22, left: -10 }}
                  onClick={(e) => {
                    const cat = e?.activeLabel
                    if (cat) abrirDetalle(`Servicio — ${cat}`, soloErrores.filter(r => (r.servicio || 'Sin especificar') === cat))
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill={SERVICIO_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                    <LabelList dataKey="etiqueta" position="top" style={{ fontSize: 10, fill: '#334155' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-1">Top 10 — Hallazgos por Médico</h3>
              <p className="text-[10px] text-slate-500 mb-2">Profesionales con más fichas CON ERROR</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={medicoData} layout="vertical" margin={{ top: 5, left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 9 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill={MEDICO_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false}
                    onClick={d => abrirDetalle(`Médico — ${d.name}`, soloErrores.filter(r => (r.medico || 'Sin especificar') === d.name))}>
                    <LabelList dataKey="etiqueta" position="right" style={{ fontSize: 10, fill: '#334155' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla resumen mensual por año */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Resumen Mensual</h3>
              <select className="input w-28" value={anioTabla} onChange={e => setAnioTabla(Number(e.target.value))} data-pdf-hide>
                {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {errorTotal && (
              <p className="text-xs text-red-600 mb-2" data-pdf-hide>{errorTotal}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="table-head-brand">
                    <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">Mes</th>
                    <th className="text-center px-2 py-2 font-semibold">Total Notificadas</th>
                    <th className="text-center px-2 py-2 font-semibold text-emerald-300">Adecuado</th>
                    <th className="text-center px-2 py-2 font-semibold text-red-300">Con Error</th>
                    <th className="text-center px-2 py-2 font-semibold rounded-tr-md">% Adherencia</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaAnio.map((m, i) => (
                    <tr key={m.mes} className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''}`}>
                      <td className="px-2.5 py-1.5 text-slate-700 font-medium">{m.mes}</td>
                      <td className="px-2 py-1.5 text-center text-slate-500">
                        {m.editable ? (
                          <div className="flex items-center justify-center gap-1">
                            <input type="number" min="1" step="1" inputMode="numeric"
                              className="input w-20 py-0.5 px-1.5 text-xs text-center"
                              placeholder={m.total ? String(m.total) : '—'}
                              title={m.manual ? 'Total ingresado manualmente' : 'Ingresa el total de fichas notificadas del mes'}
                              value={edicionTotal[m.mes_num] ?? (m.manual ? m.total : '')}
                              onChange={e => setEdicionTotal(p => ({ ...p, [m.mes_num]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') guardarTotal(m) }} />
                            {edicionTotal[m.mes_num] != null && edicionTotal[m.mes_num] !== '' && (
                              <button onClick={() => guardarTotal(m)} disabled={guardandoMes === m.mes_num}
                                className="p-1 rounded-md hover:bg-emerald-50 text-emerald-600" title="Guardar" data-pdf-hide>
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (m.total || '—')}
                      </td>
                      <td className="px-2 py-1.5 text-center font-semibold text-emerald-600">{m.total ? m.adecuado : '—'}</td>
                      <td className="px-2 py-1.5 text-center font-semibold text-red-500">{m.total ? m.errores : '—'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {m.pct != null
                          ? <span className={`inline-block px-1.5 py-0.5 rounded-full font-semibold
                              ${m.pct >= 90 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {m.pct}%
                            </span>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <DetalleGraficaModal
        detalle={detalle}
        columnas={COLS_DETALLE}
        onClose={() => setDetalle(null)}
      />
    </div>
  )
}
