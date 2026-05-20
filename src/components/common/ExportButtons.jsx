import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportToExcel, exportToPDF } from '../../lib/exportUtils'

export default function ExportButtons({ data, columns, filename, title, subtitle }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => exportToExcel(data, columns, filename)}
        className="btn-secondary text-xs gap-1.5"
      >
        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
        Excel
      </button>
      <button
        onClick={() => exportToPDF(data, columns, filename, title, subtitle)}
        className="btn-secondary text-xs gap-1.5"
      >
        <FileText className="w-3.5 h-3.5 text-red-600" />
        PDF
      </button>
    </div>
  )
}
