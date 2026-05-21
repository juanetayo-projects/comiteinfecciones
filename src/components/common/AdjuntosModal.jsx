import { Paperclip, X, ExternalLink, FileText, Image, FileSpreadsheet } from 'lucide-react'

function fileIcon(url) {
  const ext = url.split('.').pop().toLowerCase()
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return Image
  if (['xls','xlsx','csv'].includes(ext)) return FileSpreadsheet
  return FileText
}

function fileName(url, index) {
  try {
    const raw  = decodeURIComponent(url.split('/').pop())
    // formato: timestamp_randomhex.ext  → mostrar "Adjunto N.ext"
    const ext  = raw.split('.').pop()
    return `Adjunto ${index + 1}.${ext}`
  } catch {
    return `Adjunto ${index + 1}`
  }
}

/**
 * AdjuntosModal
 * @param {string[]} adjuntos  - array de URLs (null = no mostrar)
 * @param {Function} onClose   - callback para cerrar
 */
export default function AdjuntosModal({ adjuntos, onClose }) {
  if (adjuntos === null) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
            <Paperclip className="w-4 h-4 text-blue-500" />
            Documentos Adjuntos
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        {adjuntos.length === 0 ? (
          <div className="text-center py-6">
            <Paperclip className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Sin documentos adjuntos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {adjuntos.map((url, i) => {
              const Icon = fileIcon(url)
              return (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200
                             hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-slate-700 truncate flex-1">
                    {fileName(url, i)}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition-colors" />
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
