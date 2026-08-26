import {
  forwardRef,
  useEffect,
  type HTMLAttributes,
  type ReactNode,
  type MouseEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

// ─── Tipos e Interfaces ─────────────────────────────────────────────────────────

export interface ModalProps {
  /** Estado de visibilidad del modal */
  isOpen: boolean
  /** Función ejecutada para cerrar el modal */
  onClose: () => void
  /** Contenido del modal */
  children: ReactNode
  /** Cierra el modal al hacer clic en el fondo gris atenuado */
  closeOnBackdropClick?: boolean
  /** Cierra el modal al presionar la tecla Escape */
  closeOnEscape?: boolean
}

// ─── Componente Modal Principal ─────────────────────────────────────────────────

/**
 * Componente Modal Oficial del Design System Bricklar v1.
 * Renderiza una ventana emergente accesible mediante un Portal de React,
 * con soporte para tecla ESC, bloqueo de scroll del body y animación limpia.
 *
 * @example
 * ```tsx
 * <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
 *   <ModalContent>
 *     <ModalHeader>
 *       <ModalTitle>Título del Modal</ModalTitle>
 *     </ModalHeader>
 *     <ModalBody>Contenido...</ModalBody>
 *     <ModalFooter>
 *       <Button onClick={() => setIsOpen(false)}>Cerrar</Button>
 *     </ModalFooter>
 *   </ModalContent>
 * </Modal>
 * ```
 */
export function Modal({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}: ModalProps) {
  // Manejar tecla ESC para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && closeOnEscape) {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, closeOnEscape])

  if (!isOpen) return null

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose()
    }
  }

  return createPortal(
    <div
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      className={cn(
        'fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6',
        'bg-slate-950/60 backdrop-blur-xs animate-fade-in'
      )}
    >
      {children}
    </div>,
    document.body
  )
}

// ─── Modal Content ──────────────────────────────────────────────────────────────

export interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Tamaño del contenedor modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] h-[95vh]',
}

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  ({ size = 'md', className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative w-full bg-surface text-card-foreground rounded-xl border border-border shadow-modal overflow-hidden animate-scale-up flex flex-col max-h-[90vh]',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
ModalContent.displayName = 'ModalContent'

// ─── Modal Header ───────────────────────────────────────────────────────────────

export interface ModalHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Muestra botón X para cerrar en la esquina superior derecha */
  showCloseButton?: boolean
  /** Callback executado al pulsar la X */
  onClose?: () => void
}

export const ModalHeader = forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ showCloseButton = true, onClose, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between p-5 border-b border-border/50 bg-surface shrink-0',
        className
      )}
      {...props}
    >
      <div className="flex flex-col space-y-1">{children}</div>
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
          className="rounded-lg p-1.5 text-foreground-subtle hover:bg-slate-100 hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
)
ModalHeader.displayName = 'ModalHeader'

// ─── Modal Title ────────────────────────────────────────────────────────────────

export const ModalTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)}
      {...props}
    >
      {children}
    </h2>
  )
)
ModalTitle.displayName = 'ModalTitle'

// ─── Modal Description ──────────────────────────────────────────────────────────

export const ModalDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
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
ModalDescription.displayName = 'ModalDescription'

// ─── Modal Body ─────────────────────────────────────────────────────────────────

export const ModalBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-6 space-y-4 overflow-y-auto flex-1 min-h-0', className)}
      {...props}
    >
      {children}
    </div>
  )
)
ModalBody.displayName = 'ModalBody'

// ─── Modal Footer ───────────────────────────────────────────────────────────────

export const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-end gap-3 p-4 border-t border-border/50 bg-slate-50/50 shrink-0',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
)
ModalFooter.displayName = 'ModalFooter'
