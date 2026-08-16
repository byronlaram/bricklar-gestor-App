import { Search, X, Calendar } from 'lucide-react'
import type { TaskFilters as FilterType } from '../types/task.types'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '@/shared/types'
import type { TaskStatus, TaskType, TaskPriority } from '@/shared/types'
import { Card, Button, Input } from '@/shared/components/ui'

interface TaskFiltersProps {
  filters: FilterType
  onFilterChange: (filters: FilterType) => void
  couriers?: { id: string; full_name: string; display_name: string | null }[]
  branches?: { id: string; name: string; code: string }[]
}

export function TaskFilters({ filters, onFilterChange, couriers = [], branches = [] }: TaskFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, search: e.target.value, page: 1 })
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, status: e.target.value as TaskStatus | '', page: 1 })
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, task_type: e.target.value as TaskType | '', page: 1 })
  }

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, priority: e.target.value as TaskPriority | '', page: 1 })
  }

  const handleCourierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ ...filters, courier_id: e.target.value, page: 1 })
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, date: e.target.value, page: 1 })
  }

  const handleClearFilters = () => {
    onFilterChange({
      branch_id: filters.branch_id,
      page: 1,
      page_size: filters.page_size,
    })
  }

  const hasActiveFilters =
    !!filters.search ||
    !!filters.status ||
    !!filters.task_type ||
    !!filters.priority ||
    !!filters.courier_id ||
    !!filters.date

  return (
    <Card className="p-4 space-y-3 bg-white border-slate-200 shadow-2xs">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Buscador General */}
        <div className="flex-1">
          <Input
            placeholder="Buscar por título, código o cliente..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
          />
        </div>

        {/* Selector de Fecha */}
        <div className="relative w-full sm:w-44">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="date"
            value={filters.date || ''}
            onChange={handleDateChange}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs"
          />
        </div>

        {/* Botón Limpiar */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 shrink-0"
            leftIcon={<X className="h-3.5 w-3.5" />}
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      {/* Selectores Secundarios */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100">
        {/* Sucursal */}
        {branches.length > 0 && (
          <div>
            <select
              value={filters.branch_id || ''}
              onChange={(e) => onFilterChange({ ...filters, branch_id: e.target.value, page: 1 })}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-bold"
              aria-label="Filtrar por sucursal"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  🏢 {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Estado */}
        <div>
          <select
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-800 shadow-2xs font-medium"
          >
            <option value="">Todos los estados</option>
            {Object.entries(TASK_STATUS_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <select
            value={filters.task_type || ''}
            onChange={handleTypeChange}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-800 shadow-2xs font-medium"
          >
            <option value="">Todos los tipos</option>
            {Object.entries(TASK_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Prioridad */}
        <div>
          <select
            value={filters.priority || ''}
            onChange={handlePriorityChange}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-800 shadow-2xs font-medium"
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(TASK_PRIORITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Estado de Aprobación */}
        <div>
          <select
            value={filters.approval_status || ''}
            onChange={(e) => onFilterChange({ ...filters, approval_status: e.target.value as any, page: 1 })}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-800 shadow-2xs font-bold text-amber-700"
          >
            <option value="">Todas las aprobaciones</option>
            <option value="pending">⏳ Pendientes de Aprobación</option>
            <option value="approved">✅ Aprobadas</option>
            <option value="rejected">❌ Rechazadas</option>
          </select>
        </div>

        {/* Motorizado */}
        <div>
          <select
            value={filters.courier_id || ''}
            onChange={handleCourierChange}
            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-800 shadow-2xs font-medium"
          >
            <option value="">Todos los motorizados</option>
            {couriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name || c.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  )
}
