import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️  Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Cliente aislado (sin persistir sesión) para signUp() disparado por un admin
// desde el módulo de Usuarios. signUp() autentica al usuario recién creado en
// el cliente que lo ejecuta; usar el cliente `supabase` normal reemplazaría la
// sesión del admin por la del usuario nuevo (lo saca de su propia sesión).
export const supabaseAuthOnly = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})
