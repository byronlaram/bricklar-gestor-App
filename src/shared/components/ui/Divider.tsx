import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Orientación de la línea separadora */
  orientation?: 'horizontal' | 'vertical'
  /** Texto u elemento opcional en el centro */
  label?: ReactNode
}

/**
 * Componente Separador Líneo (Divider) del Design System Bricklar.
 */
export const Divider = forwardRef<HTMLDivElement, DividerProps>(
  ({ orientation = 'horizontal', label, className, ...props }, ref) => {
    if (orientation === 'vertical') {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="vertical"
          className={cn('h-full w-px bg-border/80 shrink-0 self-stretch my-auto', className)}
          {...props}
        />
      )
    }

    if (label) {
      return (
        <div
          ref={ref}
          role="separator"
          aria-orientation="horizontal"
          className={cn('flex items-center w-full my-3', className)}
          {...props}
        >
          <div className="flex-1 h-px bg-border/80" />
          <span className="px-3 text-xs font-semibold uppercase tracking-wider text-foreground-subtle shrink-0">
            {label}
          </span>
          <div className="flex-1 h-px bg-border/80" />
        </div>
      )
    }

    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        className={cn('w-full h-px bg-border/80 my-3 shrink-0', className)}
        {...props}
      />
    )
  }
)

Divider.displayName = 'Divider'
