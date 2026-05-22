import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetches values from the listas_desplegables table for a given category.
 * If the DB has values for that category, they are returned (keeping the form
 * in sync with edits made in Configuración → Listas Desplegables).
 * If the DB has no entries, the `fallback` array is returned instead.
 *
 * @param {string}   categoria  - The category to filter by (e.g. 'servicio', 'objeto')
 * @param {string[]} fallback   - Hardcoded list used when DB returns no items
 */
export function useLista(categoria, fallback = []) {
  const [items, setItems] = useState(fallback)

  useEffect(() => {
    if (!categoria) return
    supabase
      .from('listas_desplegables')
      .select('valor')
      .eq('categoria', categoria)
      .order('valor')
      .then(({ data }) => {
        const vals = (data ?? []).map(r => r.valor).filter(Boolean)
        if (vals.length > 0) setItems(vals)
        // If DB is empty, keep the fallback already in state
      })
  }, [categoria])

  return items
}
