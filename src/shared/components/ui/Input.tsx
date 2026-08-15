import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

// ─── Tipos e Interfaces ─────────────────────────────────────────────────────────

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Etiqueta superior del campo */
  label?: string
  /** Mensaje de error (cambia el borde a estado destructivo) */
  error?: string
  /** Texto descriptivo de ayuda debajo del campo */
  helperText?: string
  /** Icono o elemento visual a la izquierda */
  leftIcon?: ReactNode
  /** Icono o elemento visual a la derecha (ej. botón de ver contraseña) */
  rightIcon?: ReactNode
  /** Contenedor adicional para clases personalizadas en el wrapper externo */
  containerClassName?: string
}

// ─── Componente Input ───────────────────────────────────────────────────────────

/**
 * Componente Input Oficial del Design System Bricklar v1.
 * Soporta etiquetas, mensajes de error, texto de ayuda, iconos integrados y accesibilidad ARIA completa.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Correo electrónico"
 *   type="email"
 *   placeholder="usuario@bricklar.com"
 *   error={errors.email?.message}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      id: customId,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputId = customId || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const isInvalid = Boolean(error)

    return (
      <div className={cn('w-full space-y-1.5', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block text-sm font-semibold text-foreground',
              disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            {label}
          </label>
        )}

        {/* Wrapper con iconos */}
        <div className="relative flex items-center">
          {leftIcon && (
            <div
              className="pointer-events-none absolute left-3 flex items-center justify-center text-foreground-subtle"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={isInvalid}
            aria-describedby={
              isInvalid ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              // Base de entrada
              'w-full bg-surface text-foreground placeholder:text-foreground-subtle text-sm transition-all duration-150 ease-in-out',
              // Dimensiones estándar (40px desktop, 44px touch)
              'h-10 rounded-lg border px-3 py-2 touch-target',
              // Relleno si hay iconos
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              // Estado normal vs error
              isInvalid
                ? 'border-destructive text-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive'
                : 'border-slate-300 hover:border-slate-400 focus-visible:border-accent focus-visible:ring-accent/20',
              // Anillo de enfoque accesible
              'focus-visible:outline-none focus-visible:ring-2',
              // Estado deshabilitado
              'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 disabled:border-slate-200',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 flex items-center justify-center text-foreground-subtle">
              {rightIcon}
            </div>
          )}
        </div>

        {/* Mensaje de Error */}
        {error && (
          <p id={errorId} className="text-xs font-medium text-destructive animate-fade-in">
            {error}
          </p>
        )}

        {/* Texto de Ayuda (si no hay error) */}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-foreground-muted">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
