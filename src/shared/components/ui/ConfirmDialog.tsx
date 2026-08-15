import { forwardRef, type ReactNode } from 'react'
import { AlertTriangle, ShieldAlert } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './Modal'
import { Button, type ButtonVariant } from './Button'

export interface ConfirmDialogProps {
  /** Estado de visibilidad */
  isOpen: boolean
  /** Callback para cancelar / cerrar */
  onClose: () => void
  /** Callback para confirmar la acción */
  onConfirm: () => void
  /** Título del diálogo de confirmación */
  title: string
  /** Explicación clara de las consecuencias */
  description: string
  /** Texto del botón de confirmación */
  confirmText?: string
  /** Texto del botón de cancelación */
  cancelText?: string
  /** Variante visual del botón de confirmación */
  variant?: ButtonVariant
  /** Estado de carga durante la ejecución asíncrona */
  isLoading?: boolean
  /** Icono personalizado */
  icon?: ReactNode
}

/**
 * Diálogo de Confirmación de Alta Seguridad del Design System Bricklar.
 * Utilizado para prevenir toques accidentales en operaciones operacionales o financieras destructivas.
 */
export const ConfirmDialog = forwardRef<HTMLDivElement, ConfirmDialogProps>(
  (
    {
      isOpen,
      onClose,
      onConfirm,
      title,
      description,
      confirmText = 'Confirmar',
      cancelText = 'Cancelar',
      variant = 'destructive',
      isLoading = false,
      icon,
    },
    ref
  ) => {
    const isDestructive = variant === 'destructive'

    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent ref={ref} size="sm">
          <ModalHeader showCloseButton={!isLoading} onClose={onClose}>
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {icon || (isDestructive ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />)}
              </div>
              <ModalTitle>{title}</ModalTitle>
            </div>
          </ModalHeader>

          <ModalBody>
            <ModalDescription className="text-sm text-foreground-muted leading-relaxed">
              {description}
            </ModalDescription>
          </ModalBody>

          <ModalFooter>
            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant={variant}
              size="md"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmText}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }
)

ConfirmDialog.displayName = 'ConfirmDialog'
