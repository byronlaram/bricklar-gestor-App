import type { TaskType } from '@/shared/types'
import { TASK_TYPE_LABELS } from '@/shared/types'
import { useTaskTypesConfig } from '../hooks/useTaskTypesConfig'
import { cn } from '@/shared/utils/cn'
import {
  Truck,
  Bus,
  Package,
  ShoppingCart,
  Landmark,
  CreditCard,
  Receipt,
  Fuel,
  FileText,
  HelpCircle,
} from 'lucide-react'

interface TaskTypeBadgeProps {
  type: TaskType
  className?: string
  showIcon?: boolean
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  delivery: Truck,
  bus_shipment: Bus,
  logistics_shipment: Package,
  purchase: ShoppingCart,
  bank_deposit: Landmark,
  credit_payment: CreditCard,
  service_payment: Receipt,
  fuel: Fuel,
  other_errand: FileText,
}

export function TaskTypeBadge({ type, className, showIcon = true }: TaskTypeBadgeProps) {
  const { configs } = useTaskTypesConfig()
  const customConfig = configs[type]
  const Icon = TYPE_ICONS[type] || HelpCircle
  const label = customConfig?.label || TASK_TYPE_LABELS[type] || type

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-muted/60 text-foreground-muted border border-border/50',
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 text-accent" />}
      {label}
    </span>
  )
}
