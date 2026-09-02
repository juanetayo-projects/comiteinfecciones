import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Fetches active doctor names from the dedicated `medicos` table
 * (gestionado en Configuración → Médicos).
 */
export function useMedicos() {
  const [medicos, setMedicos] = useState([])

  useEffect(() => {
    supabase
      .from('medicos')
      .select('nombre')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => setMedicos((data ?? []).map(r => r.nombre)))
  }, [])

  return medicos
}
