import {
  useState,
  useCallback,
  type ReactNode,
  type HTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { ToastContext, type ToastItem, type ToastVariant } from './useToast'

// ─── Mapeo Visual por Variante ──────────────────────────────────────────────────

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: ReactNode }
> = {
  success: {
    container: 'border-emerald-500/30 bg-emerald-50 text-emerald-900',
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" aria-hidden="true" />,
  },
  error: {
    container: 'border-rose-500/30 bg-rose-50 text-rose-900',
    icon: <XCircle className="h-5 w-5 text-rose-600 shrink-0" aria-hidden="true" />,
  },
  warning: {
    container: 'border-amber-500/30 bg-amber-50 text-amber-900',
    icon: <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" aria-hidden="true" />,
  },
  info: {
    container: 'border-sky-500/30 bg-sky-50 text-sky-900',
    icon: <Info className="h-5 w-5 text-sky-600 shrink-0" aria-hidden="true" />,
  },
}

// ─── Componente Toast Individual ────────────────────────────────────────────────

export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  item: ToastItem
  onDismiss: (id: string) => void
}

export function Toast({ item, onDismiss, className, ...props }: ToastProps) {
  const variant = item.variant || 'info'
  const style = variantStyles[variant]

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 w-full max-w-sm rounded-xl border p-4 shadow-modal transition-all duration-200 ease-in-out animate-slide-in',
        style.container,
        className
      )}
      {...props}
    >
      {style.icon}
      <div className="flex-1 space-y-0.5">
        <h4 className="text-sm font-semibold leading-snug">{item.title}</h4>
        {item.description && (
          <p className="text-xs opacity-90 leading-relaxed">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Cerrar notificación"
        className="rounded-lg p-1 text-slate-500 hover:bg-black/5 hover:text-slate-900 transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── ToastProvider ──────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description, variant = 'info', duration = 3500 }: Omit<ToastItem, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newItem: ToastItem = { id, title, description, variant, duration }

      setToasts((prev) => [...prev, newItem])

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }
    },
    [dismiss]
  )

  const success = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: 'success' }),
    [toast]
  )

  const error = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: 'error' }),
    [toast]
  )

  const warning = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: 'warning' }),
    [toast]
  )

  const info = useCallback(
    (title: string, description?: string) => toast({ title, description, variant: 'info' }),
    [toast]
  )

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info, dismiss }}>
      {children}
      {createPortal(
        <div
          aria-label="Notificaciones"
          className="fixed top-4 right-4 z-[700] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        >
          {toasts.map((item) => (
            <div key={item.id} className="pointer-events-auto">
              <Toast item={item} onDismiss={dismiss} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}
