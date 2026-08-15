import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

// ─── Tipos y Variantes ──────────────────────────────────────────────────────────

export type BadgeVariant =
  | 'pending'
  | 'assigned'
  | 'en_route'
  | 'completed'
  | 'urgent'
  | 'neutral'

export type BadgeSize = 'sm' | 'md'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Variante semántica de estado */
  variant?: BadgeVariant
  /** Tamaño del badge */
  size?: BadgeSize
  /** Muestra un indicador circular a la izquierda */
  showDot?: boolean
  /** Icono opcional a la izquierda */
  icon?: ReactNode
}

// ─── Mapeo de Clases Semánticas ─────────────────────────────────────────────────

const variantClasses: Record<BadgeVariant, { bg: string; dot: string }> = {
  pending: {
    bg: 'bg-amber-500/12 text-amber-700 border-amber-500/25',
    dot: 'bg-amber-500',
  },
  assigned: {
    bg: 'bg-blue-500/12 text-blue-700 border-blue-500/25',
    dot: 'bg-blue-500',
  },
  en_route: {
    bg: 'bg-purple-500/12 text-purple-700 border-purple-500/25',
    dot: 'bg-purple-500',
  },
  completed: {
    bg: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/25',
    dot: 'bg-emerald-500',
  },
  urgent: {
    bg: 'bg-rose-500/12 text-rose-700 border-rose-500/25',
    dot: 'bg-rose-500',
  },
  neutral: {
    bg: 'bg-slate-500/12 text-slate-700 border-slate-500/25',
    dot: 'bg-slate-500',
  },
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-2xs gap-1',
  md: 'px-2.5 py-0.5 text-xs gap-1.5',
}

// ─── Componente Badge ───────────────────────────────────────────────────────────

/**
 * Componente Badge Semántico Oficial del Design System Bricklar v1.
 * Representa estados de tareas, usuarios y operaciones financieras de forma limpia e inequívoca.
 *
 * @example
 * ```tsx
 * <Badge variant="completed" showDot>Completada</Badge>
 * ```
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'neutral',
      size = 'md',
      showDot = false,
      icon,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const style = variantClasses[variant]

    return (
      <span
        ref={ref}
        className={cn(
          // Base
          'inline-flex items-center font-semibold rounded-full border border-solid leading-none shrink-0 select-none',
          style.bg,
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {showDot && (
          <span
            className={cn('h-1.5 w-1.5 rounded-full shrink-0', style.dot)}
            aria-hidden="true"
          />
        )}
        {icon && <span className="inline-flex shrink-0" aria-hidden="true">{icon}</span>}
        <span>{children}</span>
      </span>
    )
  }
)

Badge.displayName = 'Badge'
