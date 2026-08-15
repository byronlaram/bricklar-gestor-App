import { forwardRef, type HTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl'
export type SpinnerVariant = 'primary' | 'accent' | 'white' | 'muted'

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Tamaño del spinner */
  size?: SpinnerSize
  /** Variante cromática */
  variant?: SpinnerVariant
  /** Etiqueta accesible para lectores de pantalla */
  label?: string
}

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

const variantClasses: Record<SpinnerVariant, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  white: 'text-white',
  muted: 'text-foreground-subtle',
}

/**
 * Componente Spinner de carga accesible según el Design System Bricklar.
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'primary',
      label = 'Cargando...',
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      <Loader2
        className={cn('animate-spin shrink-0', sizeClasses[size], variantClasses[variant])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
)

Spinner.displayName = 'Spinner'
