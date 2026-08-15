import { forwardRef, useState, type HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'
export type AvatarStatus = 'online' | 'offline' | 'busy' | 'away'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** URL de la imagen del avatar */
  src?: string | null
  /** Nombre completo para generar iniciales como fallback y texto ALT */
  name: string
  /** Tamaño del avatar */
  size?: AvatarSize
  /** Indicador de estado de presencia */
  status?: AvatarStatus
}

const sizeClasses: Record<AvatarSize, { container: string; font: string; dot: string }> = {
  sm: { container: 'h-8 w-8', font: 'text-xs', dot: 'h-2 w-2 ring-1' },
  md: { container: 'h-10 w-10', font: 'text-sm', dot: 'h-2.5 w-2.5 ring-2' },
  lg: { container: 'h-12 w-12', font: 'text-base', dot: 'h-3 w-3 ring-2' },
  xl: { container: 'h-16 w-16', font: 'text-lg', dot: 'h-4 w-4 ring-2' },
}

const statusClasses: Record<AvatarStatus, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-400',
  busy: 'bg-rose-500',
  away: 'bg-amber-500',
}

function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Componente Avatar Oficial del Design System Bricklar.
 * Muestra la imagen de perfil del usuario o sus iniciales estilizadas con indicador de presencia.
 */
export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, name, size = 'md', status, className, ...props }, ref) => {
    const [imageError, setImageError] = useState(false)
    const dimensions = sizeClasses[size]
    const initials = getInitials(name)

    const showImage = src && !imageError

    return (
      <div ref={ref} className={cn('relative inline-flex shrink-0 select-none', className)} {...props}>
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold border border-primary/20 overflow-hidden shadow-xs',
            dimensions.container,
            dimensions.font
          )}
        >
          {showImage ? (
            <img
              src={src}
              alt={name}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {status && (
          <span
            aria-label={`Estado: ${status}`}
            className={cn(
              'absolute bottom-0 right-0 rounded-full ring-surface',
              dimensions.dot,
              statusClasses[status]
            )}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'
