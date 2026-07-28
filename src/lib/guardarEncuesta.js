import { supabase } from './supabase'

/**
 * Guarda una encuesta (alta o edición) verificando que la operación realmente
 * haya afectado una fila.
 *
 * POR QUÉ EXISTE ESTE HELPER
 * --------------------------
 * `supabase.from(t).update(payload).eq('id', id)` NO devuelve error cuando RLS
 * filtra la fila: simplemente actualiza 0 registros y responde 204. La app
 * interpretaba eso como éxito y navegaba, de modo que el usuario veía
 * "actualizado" sin que nada hubiera cambiado.
 *
 * Añadiendo `.select()` la respuesta trae las filas afectadas, así que podemos
 * distinguir un guardado real de un no-op y avisar al usuario.
 *
 * @param {string} tabla    p.ej. 'encuesta_aislamiento'
 * @param {object} payload  columnas a guardar
 * @param {string} [id]     si viene, es una edición
 * @returns {{ data?: object, error?: string }}
 */
export async function guardarEncuesta(tabla, payload, id) {
  if (id) {
    const { data, error } = await supabase
      .from(tabla)
      .update(payload)
      .eq('id', id)
      .select()

    if (error) return { error: error.message }

    if (!data || data.length === 0) {
      return {
        error: 'No se pudo guardar el cambio: el registro está validado/cerrado ' +
               'o no tienes permisos para editarlo. Si crees que es un error, ' +
               'contacta al administrador.',
      }
    }
    return { data: data[0] }
  }

  const { data, error } = await supabase.from(tabla).insert([payload]).select()
  if (error) return { error: error.message }
  if (!data || data.length === 0) {
    return { error: 'No se pudo crear el registro. Verifica tus permisos.' }
  }
  return { data: data[0] }
}

/** Estados en los que el registro queda en solo lectura. */
export const ESTADOS_BLOQUEADOS = ['validado', 'cerrado']

/** ¿El registro admite edición según su estado y el rol del usuario? */
export function esEditable(estado, rol) {
  if (rol === 'administrador') return true          // puede corregir errores
  return !ESTADOS_BLOQUEADOS.includes(estado)
}
