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

export type MetricCardAccent =
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'purple'
  | 'violet'
  | 'blue'
  | 'amber'
  | 'emerald'
  | 'rose'

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Título del indicador */
  title: string
  /** Valor numérico principal o monto formateado */
  value: ReactNode
  /** Icono representativo a la derecha */
  icon?: ReactNode
  /** Texto descriptivo o tendencia */
  subtitle?: ReactNode
  /** Color de fondo y borde pastel */
  accentColor?: MetricCardAccent
  /** Añade elevación e interacción hover si la tarjeta es clickable */
  isHoverable?: boolean
}

const PASTEL_THEMES: Record<
  string,
  {
    card: string
    iconBg: string
    title: string
    subtitle: string
  }
> = {
  primary: {
    card: 'bg-[#F5F8FE] border-blue-200/80 hover:border-blue-400/80 shadow-2xs',
    iconBg: 'bg-[#004594]/10 text-[#004594]',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-blue-700/90',
  },
  blue: {
    card: 'bg-[#F5F8FE] border-blue-200/80 hover:border-blue-400/80 shadow-2xs',
    iconBg: 'bg-[#004594]/10 text-[#004594]',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-blue-700/90',
  },
  accent: {
    card: 'bg-[#F5F8FE] border-blue-200/80 hover:border-blue-400/80 shadow-2xs',
    iconBg: 'bg-blue-600/10 text-blue-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-blue-700/90',
  },
  success: {
    card: 'bg-[#F3F9F6] border-emerald-200/80 hover:border-emerald-400/80 shadow-2xs',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-emerald-700/90',
  },
  emerald: {
    card: 'bg-[#F3F9F6] border-emerald-200/80 hover:border-emerald-400/80 shadow-2xs',
    iconBg: 'bg-emerald-500/10 text-emerald-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-emerald-700/90',
  },
  warning: {
    card: 'bg-[#FCFAF4] border-amber-200/80 hover:border-amber-400/80 shadow-2xs',
    iconBg: 'bg-amber-500/10 text-amber-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-amber-700/90',
  },
  amber: {
    card: 'bg-[#FCFAF4] border-amber-200/80 hover:border-amber-400/80 shadow-2xs',
    iconBg: 'bg-amber-500/10 text-amber-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-amber-700/90',
  },
  destructive: {
    card: 'bg-[#FFF5F5] border-rose-200/80 hover:border-rose-400/80 shadow-2xs',
    iconBg: 'bg-rose-500/10 text-rose-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-rose-700/90',
  },
  rose: {
    card: 'bg-[#FFF5F5] border-rose-200/80 hover:border-rose-400/80 shadow-2xs',
    iconBg: 'bg-rose-500/10 text-rose-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-rose-700/90',
  },
  purple: {
    card: 'bg-[#FAF8FE] border-purple-200/80 hover:border-purple-400/80 shadow-2xs',
    iconBg: 'bg-purple-500/10 text-purple-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-purple-700/90',
  },
  violet: {
    card: 'bg-[#FAF8FE] border-purple-200/80 hover:border-purple-400/80 shadow-2xs',
    iconBg: 'bg-purple-500/10 text-purple-600',
    title: 'text-[#0A2540]/80',
    subtitle: 'text-purple-700/90',
  },
}

export const MetricCard = forwardRef<HTMLDivElement, MetricCardProps>(
  ({ title, value, icon, subtitle, accentColor = 'primary', isHoverable, className, ...props }, ref) => {
    const theme = PASTEL_THEMES[accentColor] || PASTEL_THEMES.primary

    return (
      <div
        ref={ref}
        className={cn(
          'p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between space-y-3 group',
          theme.card,
          isHoverable && 'hover:shadow-card-hover cursor-pointer hover:scale-[1.01]',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-xs font-extrabold uppercase tracking-wider', theme.title)}>
            {title}
          </span>
          {icon && (
            <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105', theme.iconBg)}>
              {icon}
            </div>
          )}
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-[#0A2540]">
            {value}
          </div>
          {subtitle && (
            <div className={cn('mt-1 text-xs font-semibold leading-tight', theme.subtitle)}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    )
  }
)
MetricCard.displayName = 'MetricCard'
