import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

// ─── Componente Card Principal ──────────────────────────────────────────────────

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Añade elevación e interacción hover si la tarjeta es clickable */
  isHoverable?: boolean
}

/**
 * Contenedor Card Principal según el Design System Bricklar.
 * Representa la unidad visual limpia: Fondo blanco sobre canvas gris ultra claro.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ isHoverable = false, className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-surface text-card-foreground rounded-xl border border-border/80 shadow-card transition-all duration-200 ease-in-out overflow-hidden',
          isHoverable && 'hover:border-primary/20 hover:shadow-card-hover cursor-pointer',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
Card.displayName = 'Card'

// ─── Card Header ────────────────────────────────────────────────────────────────

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 p-5 border-b border-border/40', className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardHeader.displayName = 'CardHeader'

// ─── Card Title ─────────────────────────────────────────────────────────────────

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
      {...props}
    >
      {children}
    </h3>
  )
)
CardTitle.displayName = 'CardTitle'

// ─── Card Description ───────────────────────────────────────────────────────────

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-foreground-muted', className)}
      {...props}
    >
      {children}
    </p>
  )
)
CardDescription.displayName = 'CardDescription'

// ─── Card Content ───────────────────────────────────────────────────────────────

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
)
CardContent.displayName = 'CardContent'

// ─── Card Footer ────────────────────────────────────────────────────────────────

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-5 pt-0 border-t border-border/40 bg-slate-50/40', className)}
      {...props}
    >
      {children}
    </div>
  )
)
CardFooter.displayName = 'CardFooter'

// ─── Bento Card Especializada ───────────────────────────────────────────────────

export interface BentoCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Destaca la tarjeta con un gradiente sutil de fondo */
  isHero?: boolean
}

export const BentoCard = forwardRef<HTMLDivElement, BentoCardProps>(
  ({ isHero = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'bento-card flex flex-col justify-between p-5 rounded-xl border border-border/85 bg-surface shadow-card transition-all duration-200 ease-in-out hover:border-primary/20 hover:shadow-card-hover',
        isHero && 'bento-card-hero bg-gradient-to-br from-surface to-primary-50/30 border-primary/15 shadow-bento',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
BentoCard.displayName = 'BentoCard'

// ─── Metric Card Especializada (KPI) ───────────────────────────────────────────

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Título del indicador */
  title: string
  /** Valor numérico principal o monto formateado */
  value: ReactNode
  /** Icono representativo a la derecha */
  icon?: ReactNode
  /** Texto descriptivo o tendencia */
  subtitle?: ReactNode
  /** Color de borde de acento izquierdo */
  accentColor?: 'primary' | 'accent' | 'success' | 'warning' | 'destructive'
  /** Añade elevación e interacción hover si la tarjeta es clickable */
  isHoverable?: boolean
}

const accentBorderMap = {
  primary: 'border-l-4 border-l-[#1c2d5e]',
  accent: 'border-l-4 border-l-indigo-600',
  success: 'border-l-4 border-l-emerald-600',
  warning: 'border-l-4 border-l-amber-500',
  destructive: 'border-l-4 border-l-rose-600',
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, icon, subtitle, accentColor, isHoverable, className, ...props }, ref) => (
    <Card
      ref={ref}
      isHoverable={isHoverable}
      className={cn(
        'p-5 flex flex-col justify-between space-y-3',
        accentColor && accentBorderMap[accentColor],
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
          {title}
        </span>
        {icon && <div className="text-foreground-subtle shrink-0">{icon}</div>}
      </div>
      <div>
        <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
          {value}
        </div>
        {subtitle && <div className="mt-1 text-xs text-foreground-muted">{subtitle}</div>}
      </div>
    </Card>
  )
)
MetricCard.displayName = 'MetricCard'
