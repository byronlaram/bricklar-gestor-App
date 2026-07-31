import type { TaskStatusHistory, TaskAssignment } from '../types/task.types'
import { TaskStatusBadge } from './TaskStatusBadge'
import { Clock, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface TaskHistoryPanelProps {
  history: TaskStatusHistory[]
  assignments: TaskAssignment[]
}

export function TaskHistoryPanel({ history, assignments }: TaskHistoryPanelProps) {
  // Combinar y ordenar ambos historiales cronológicamente
  type HistoryItem =
    | { type: 'status'; date: Date; data: TaskStatusHistory }
    | { type: 'assignment'; date: Date; data: TaskAssignment }

  const statusItems: HistoryItem[] = history.map((item) => ({
    type: 'status',
    date: new Date(item.created_at),
    data: item,
  }))

  const assignmentItems: HistoryItem[] = assignments.map((item) => ({
    type: 'assignment',
    date: new Date(item.created_at),
    data: item,
  }))

  const combined = [...statusItems, ...assignmentItems].sort(
    (a, b) => b.date.getTime() - a.date.getTime()
  )

  if (combined.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-foreground-muted bg-card border border-border rounded-xl">
        No hay registros de actividad todavía.
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-accent" />
        Historial de Actividad
      </h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
        {combined.map((item, idx) => {
          const dateStr = format(item.date, "dd MMM yyyy, hh:mm a", { locale: es })

          if (item.type === 'status') {
            const h = item.data
            return (
              <div key={`status-${h.id}-${idx}`} className="relative group">
                {/* Bullet */}
                <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-background border-2 border-accent flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {h.from_status && (
                      <>
                        <TaskStatusBadge status={h.from_status} showIcon={false} />
                        <ArrowRight className="h-3 w-3 text-foreground-muted" />
                      </>
                    )}
                    <TaskStatusBadge status={h.to_status} showIcon={true} />
                  </div>

                  <p className="text-xs text-foreground-muted">
                    Por: <span className="font-medium text-foreground">{h.changed_by_profile?.full_name || 'Sistema'}</span>
                  </p>

                  {h.notes && (
                    <p className="text-xs italic bg-muted/40 p-2 rounded-md text-foreground-subtle border border-border/40">
                      "{h.notes}"
                    </p>
                  )}

                  <span className="text-[10px] text-foreground-muted block pt-0.5">{dateStr}</span>
                </div>
              </div>
            )
          }

          if (item.type === 'assignment') {
            const a = item.data
            return (
              <div key={`assign-${a.id}-${idx}`} className="relative group">
                {/* Bullet */}
                <div className="absolute -left-6 top-0.5 h-5 w-5 rounded-full bg-background border-2 border-sky-500 flex items-center justify-center">
                  <User className="h-3 w-3 text-sky-500" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    Motorizado asignado:{' '}
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {a.courier?.display_name || a.courier?.full_name || 'Motorizado'}
                    </span>
                  </p>

                  <p className="text-xs text-foreground-muted">
                    Asignado por: <span className="font-medium text-foreground">{a.assigned_by_profile?.full_name || 'Admin'}</span>
                  </p>

                  {a.reason && (
                    <p className="text-xs italic text-foreground-muted">Motivo: {a.reason}</p>
                  )}

                  <span className="text-[10px] text-foreground-muted block pt-0.5">{dateStr}</span>
                </div>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}
