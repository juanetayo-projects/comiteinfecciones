import { useEffect, useMemo, useRef, useState } from 'react'

function normalize(s) {
  return (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
}

/**
 * Select con campo de búsqueda para listas largas (cientos de opciones).
 * No usa react-hook-form `register`: se controla con `value` + `onChange`.
 */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  disabled = false,
  id,
}) {
  const [open, setOpen]     = useState(false)
  const [query, setQuery]   = useState('')
  const rootRef  = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = useMemo(() => {
    if (!query.trim()) return options
    const q = normalize(query)
    return options.filter(o => normalize(o).includes(q))
  }, [options, query])

  function selectOption(opt) {
    onChange(opt)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        ref={inputRef}
        type="text"
        className="input cursor-pointer"
        disabled={disabled}
        placeholder={placeholder}
        value={open ? query : (value || '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={e => { setOpen(true); setQuery(e.target.value) }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur() }
          if (e.key === 'Enter' && filtered.length === 1) { e.preventDefault(); selectOption(filtered[0]) }
        }}
        autoComplete="off"
      />
      {value && !open && !disabled && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => onChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
          title="Limpiar"
        >
          ✕
        </button>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-white/70 bg-neu-surface shadow-neu-lg py-1">
          {filtered.length === 0 ? (
            <p className="px-3.5 py-2 text-sm text-slate-400">Sin coincidencias</p>
          ) : (
            filtered.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => selectOption(opt)}
                className={`block w-full text-left px-3.5 py-1.5 text-sm hover:bg-brand-50 transition-colors ${
                  opt === value ? 'text-brand-700 font-semibold' : 'text-slate-700'}`}
              >
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
