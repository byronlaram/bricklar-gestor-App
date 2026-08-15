import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/shared/utils/cn'

// ─── Componente Skeleton Base ───────────────────────────────────────────────────

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Forma circular para avatares o iconos */
  isCircle?: boolean
}

/**
 * Componente Skeleton (Shimmer Loading) del Design System Bricklar v1.
 * Simula la carga progresiva de texto, tarjetas e imágenes reduciendo la ansiedad percibida.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ isCircle = false, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'animate-pulse bg-slate-200/80 shrink-0',
        isCircle ? 'rounded-full' : 'rounded-md',
        className
      )}
      {...props}
    />
  )
)
Skeleton.displayName = 'Skeleton'

// ─── Componente TableSkeleton ───────────────────────────────────────────────────

export interface TableSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Cantidad de filas a renderizar (por defecto 5) */
  rows?: number
  /** Cantidad de columnas a renderizar (por defecto 4) */
  columns?: number
}

/**
 * Skeleton especializado para tablas SaaS.
 */
export const TableSkeleton = forwardRef<HTMLDivElement, TableSkeletonProps>(
  ({ rows = 5, columns = 4, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('w-full border border-border/80 rounded-xl overflow-hidden bg-surface', className)}
      {...props}
    >
      {/* Table Header Skeleton */}
      <div className="bg-slate-50 border-b border-border/60 p-4 flex items-center gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 flex-1 rounded" />
        ))}
      </div>
      {/* Table Rows Skeleton */}
      <div className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`tr-${r}`} className="p-4 flex items-center gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={`td-${r}-${c}`}
                className={cn('h-4 rounded', c === 0 ? 'w-1/3' : 'flex-1')}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
)
TableSkeleton.displayName = 'TableSkeleton'
