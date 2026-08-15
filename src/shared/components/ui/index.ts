// ─── Shared UI Components: Design System Bricklar v1 ──────────────────────────
// Exportación centralizada de la Biblioteca Atómica UI (Fase 0A + Fase 0B)

// Componentes Fase 0A (Fundamentales)
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button'
export { Input, type InputProps } from './Input'
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  BentoCard,
  MetricCard,
  type CardProps,
  type BentoCardProps,
  type MetricCardProps,
} from './Card'
export { Badge, type BadgeProps, type BadgeVariant, type BadgeSize } from './Badge'
export {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  type ModalProps,
  type ModalContentProps,
  type ModalHeaderProps,
} from './Modal'

// Componentes Fase 0B (Complementarios)
export { Toast, ToastProvider, type ToastProps } from './Toast'
export { useToast, type ToastItem, type ToastVariant, type ToastContextValue } from './useToast'
export { Skeleton, TableSkeleton, type SkeletonProps, type TableSkeletonProps } from './Skeleton'
export { Spinner, type SpinnerProps, type SpinnerSize, type SpinnerVariant } from './Spinner'
export { EmptyState, type EmptyStateProps } from './EmptyState'
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'
export { Divider, type DividerProps } from './Divider'
export { Avatar, type AvatarProps, type AvatarSize, type AvatarStatus } from './Avatar'
