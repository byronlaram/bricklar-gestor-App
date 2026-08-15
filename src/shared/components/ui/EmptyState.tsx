import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { FolderOpen } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Título representativo */
  title: string
  /** Descripción explicativa o motivación */
  description?: string
  /** Icono o ilustración personalizada */
  icon?: ReactNode
  /** Botón de acción opcional */
  action?: ReactNode
}

/**
 * Componente Estado Vacío Oficial del Design System Bricklar.
 * Proporciona retroalimentación limpia cuando una lista o tabla carece de registros.
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ title, description, icon, action, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-border/80 bg-surface/60 space-y-4',
        className
      )}
      {...props}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-foreground-subtle shrink-0">
        {icon || <FolderOpen className="h-7 w-7 stroke-[1.5]" aria-hidden="true" />}
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-base font-semibold text-foreground">{title}</h4>
        {description && (
          <p className="text-xs text-foreground-muted leading-relaxed">{description}</p>
        )}
      </div>

      {action && <div className="pt-2">{action}</div>}
    </div>
  )
)

EmptyState.displayName = 'EmptyState'
