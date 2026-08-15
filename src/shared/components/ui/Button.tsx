import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

// ─── Tipos y Variantes ──────────────────────────────────────────────────────────

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'confirm'
  | 'warning'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'touch-hero'

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Variante visual según el Design System Bricklar (SaaS Premium) */
  variant?: ButtonVariant
  /** Tamaño del botón */
  size?: ButtonSize
  /** Muestra estado de carga deshabilitando la interacción */
  isLoading?: boolean
  /** Icono a la izquierda del texto */
  leftIcon?: ReactNode
  /** Icono a la derecha del texto */
  rightIcon?: ReactNode
}

// ─── Mapeo de Clases por Variante ───────────────────────────────────────────────

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#1c2d5e] text-white shadow-xs hover:bg-[#16234b] active:scale-[0.98] disabled:bg-[#1c2d5e]/50',
  secondary:
    'bg-white text-[#1c2d5e] border border-[#1c2d5e] shadow-xs hover:bg-indigo-50 active:scale-[0.98] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200',
  confirm:
    'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:scale-[0.98] disabled:bg-emerald-600/50',
  warning:
    'bg-amber-600 text-white shadow-xs hover:bg-amber-700 active:scale-[0.98] disabled:bg-amber-600/50',
  destructive:
    'bg-rose-600 text-white shadow-xs hover:bg-rose-700 active:scale-[0.98] disabled:bg-rose-600/50',
  outline:
    'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 active:bg-slate-100 disabled:bg-white disabled:text-slate-400 disabled:border-slate-200',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 disabled:text-slate-300',
  'touch-hero':
    'min-h-[48px] w-full bg-[#1c2d5e] text-white font-bold text-base rounded-2xl shadow-md hover:bg-[#16234b] active:scale-[0.98] disabled:bg-[#1c2d5e]/50 touch-target',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-2xl',
  icon: 'h-10 w-10 p-0 justify-center rounded-xl',
}

// ─── Componente Button ──────────────────────────────────────────────────────────

/**
 * Componente Botón Oficial del Design System Bricklar v2 (SaaS Premium).
 * Soporta Azul Índigo institucional, variantes confirm/warning/destructive y animaciones.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={cn(
          // Base compartida
          'inline-flex items-center justify-center font-bold transition-all duration-150 ease-in-out select-none cursor-pointer',
          // Accesibilidad focus visible
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2',
          // Deshabilitado
          'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
          // Variante y Tamaño
          variantClasses[variant],
          variant !== 'touch-hero' && sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
        ) : (
          leftIcon && <span className="inline-flex shrink-0" aria-hidden="true">{leftIcon}</span>
        )}

        {children && <span>{children}</span>}

        {!isLoading && rightIcon && (
          <span className="inline-flex shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
