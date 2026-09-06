import React from 'react'
import { Calendar, RotateCcw } from 'lucide-react'
import { getLocalDateString } from '@/shared/utils/date'
import { formatDate } from '@/shared/utils/format'
import { Button } from '@/shared/components/ui/Button'

export interface DateRangeFilterProps {
  dateFrom?: string
  dateTo?: string
  onChange: (range: { dateFrom: string; dateTo: string; isSingleDate?: boolean }) => void
  onReset?: () => void
  className?: string
  showPeriodPresets?: boolean
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateFrom = '',
  dateTo = '',
  onChange,
  onReset,
  className = '',
  showPeriodPresets = true,
}) => {
  const todayStr = getLocalDateString()

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrom = e.target.value
    // Si 'Hasta' está vacío o es menor que 'Desde', igualar 'Hasta' a 'Desde'
    const newTo = dateTo && dateTo >= newFrom ? dateTo : newFrom
    onChange({ dateFrom: newFrom, dateTo: newTo })
  }

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTo = e.target.value
    // Si 'Desde' está vacío, igualar 'Desde' a 'Hasta'
    const newFrom = dateFrom && dateFrom <= newTo ? dateFrom : newTo
    onChange({ dateFrom: newFrom, dateTo: newTo })
  }

  const handleSetToday = () => {
    onChange({ dateFrom: todayStr, dateTo: todayStr, isSingleDate: true })
  }

  const handleSetThisMonth = () => {
    const now = new Date()
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    onChange({ dateFrom: firstDay, dateTo: todayStr })
  }

  const handleSetAllHistory = () => {
    onChange({ dateFrom: '', dateTo: '' })
  }

  const isToday = dateFrom === todayStr && dateTo === todayStr
  const isAllHistory = !dateFrom && !dateTo

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {/* Campo Desde */}
        <div className="relative min-w-[135px] flex-1 sm:flex-initial">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Desde
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateFrom}
              onChange={handleFromChange}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Campo Hasta */}
        <div className="relative min-w-[135px] flex-1 sm:flex-initial">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Hasta
          </label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={handleToChange}
              className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium cursor-pointer"
            />
          </div>
        </div>

        {/* Atajos Rápidos */}
        {showPeriodPresets && (
          <div className="flex items-end gap-1.5 pt-4">
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer shadow-2xs ${
                isToday
                  ? 'bg-[#004594] text-white border-[#004594]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Hoy
            </button>

            <button
              type="button"
              onClick={handleSetThisMonth}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              Este Mes
            </button>

            <button
              type="button"
              onClick={handleSetAllHistory}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer shadow-2xs ${
                isAllHistory
                  ? 'bg-[#004594] text-white border-[#004594]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Todo el Historial
            </button>

            {onReset && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs h-7.5 px-2.5"
                leftIcon={<RotateCcw className="h-3 w-3" />}
              >
                Limpiar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Indicador de Período Activo */}
      <div className="text-2xs font-semibold">
        {dateFrom && dateTo && dateFrom === dateTo ? (
          <span className="font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 inline-flex items-center gap-1.5">
            📅 Fecha: <strong className="text-slate-900 font-mono">{formatDate(dateFrom)}</strong> {dateFrom === todayStr ? '(Hoy)' : ''}
          </span>
        ) : dateFrom && dateTo ? (
          <span className="font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full inline-flex items-center gap-1.5">
            📅 Período: <strong className="font-mono text-blue-950">{formatDate(dateFrom)}</strong> al{' '}
            <strong className="font-mono text-blue-950">{formatDate(dateTo)}</strong>
          </span>
        ) : dateFrom ? (
          <span className="font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            📅 Desde: <strong className="font-mono text-blue-950">{formatDate(dateFrom)}</strong> en adelante
          </span>
        ) : dateTo ? (
          <span className="font-bold text-blue-900 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
            📅 Hasta: <strong className="font-mono text-blue-950">{formatDate(dateTo)}</strong>
          </span>
        ) : (
          <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
            📂 Mostrando acumulado de todo el historial
          </span>
        )}
      </div>
    </div>
  )
}
