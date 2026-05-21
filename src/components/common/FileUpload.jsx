import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Paperclip, X, Upload, FileText, Loader2 } from 'lucide-react'

/**
 * FileUpload — carga múltiples archivos a Supabase Storage (bucket: adjuntos)
 *
 * Props:
 *   value:      string[]   — URLs actuales (para modo edición)
 *   onChange:   (urls: string[]) => void
 *   folder:     string     — subcarpeta dentro del bucket (ej. 'aislamiento')
 *   disabled?:  boolean
 */
export default function FileUpload({ value = [], onChange, folder = 'general', disabled = false }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const inputRef = useRef(null)

  async function handleFiles(files) {
    if (!files || files.length === 0) return
    setError('')
    setUploading(true)
    const newUrls = []

    for (const file of Array.from(files)) {
      const ext  = file.name.split('.').pop()
      const name = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('adjuntos')
        .upload(name, file, { upsert: false })

      if (uploadError) {
        setError(`Error al subir ${file.name}: ${uploadError.message}`)
        continue
      }

      const { data } = supabase.storage.from('adjuntos').getPublicUrl(name)
      newUrls.push(data.publicUrl)
    }

    onChange([...value, ...newUrls])
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function removeFile(url) {
    onChange(value.filter(u => u !== url))
  }

  function fileName(url) {
    try { return decodeURIComponent(url.split('/').pop().replace(/^\d+_[a-z0-9]+\./, 'archivo.')) }
    catch { return url.split('/').pop() }
  }

  return (
    <div className="space-y-2">
      {/* Zona de carga */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors
          ${disabled ? 'border-slate-200 bg-slate-50 cursor-not-allowed'
          : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer'}`}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        {uploading
          ? <div className="flex items-center justify-center gap-2 text-indigo-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Subiendo archivos...</span>
            </div>
          : <div className="flex items-center justify-center gap-2 text-slate-500">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Haz clic para adjuntar archivos (múltiples)</span>
            </div>
        }
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled || uploading}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Error */}
      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Lista de archivos adjuntos */}
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((url, i) => (
            <li key={i}
              className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <a href={url} target="_blank" rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline truncate"
                  onClick={e => e.stopPropagation()}>
                  {fileName(url)}
                </a>
              </div>
              {!disabled && (
                <button type="button" onClick={() => removeFile(url)}
                  className="p-0.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors shrink-0">
                  <X className="w-3 h-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
