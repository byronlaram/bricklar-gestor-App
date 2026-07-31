import { Search, Filter, X, Calendar } from 'lucide-react'
import type { TaskFilters as FilterType } from '../types/task.types'
import { TASK_STATUS_LABELS, TASK_TYPE_LABELS, TASK_PRIORITY_LABELS } from '@/shared/types'
import type { TaskStatus, TaskType, TaskPriority } from '@/shared/types'

interface TaskFiltersProps {
  filters: FilterType
  onFilterChange: (filters: FilterType) => void
  couriers?: { id: string; full_name: string; display_name: string | null }[]
}

export function TaskFilters({ filters, onFilterChange, couriers = [] }: TaskFiltersProps) {
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
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Buscador general */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar por título, código o cliente..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 transition"
          />
        </div>

        {/* Fecha */}
        <div className="relative w-full sm:w-44">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="date"
            value={filters.date || ''}
            onChange={handleDateChange}
            className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 transition"
          />
        </div>

        {/* Botón limpiar */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg border border-destructive/20 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Selectores Secundarios */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/40">
        {/* Estado */}
        <div>
          <select
            value={filters.status || ''}
            onChange={handleStatusChange}
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
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
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
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
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(TASK_PRIORITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Motorizado */}
        <div>
          <select
            value={filters.courier_id || ''}
            onChange={handleCourierChange}
            className="w-full px-2.5 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
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
    </div>
  )
}
