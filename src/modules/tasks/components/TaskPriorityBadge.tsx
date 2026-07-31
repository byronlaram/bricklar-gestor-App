import type { TaskPriority } from '@/shared/types'
import { TASK_PRIORITY_LABELS } from '@/shared/types'
import { cn } from '@/shared/utils/cn'
import { AlertTriangle, AlertCircle, ArrowDown, ArrowUp } from 'lucide-react'

interface TaskPriorityBadgeProps {
  priority: TaskPriority
  className?: string
  showIcon?: boolean
}

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { bg: string; text: string; border: string; icon: React.ElementType }
> = {
  low: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-300 dark:border-slate-700',
    icon: ArrowDown,
  },
  normal: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/30',
    icon: ArrowUp,
  },
  high: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    icon: AlertCircle,
  },
  urgent: {
    bg: 'bg-red-500/15 dark:bg-red-500/25 animate-pulse',
    text: 'text-red-700 dark:text-red-400 font-bold',
    border: 'border-red-500/40',
    icon: AlertTriangle,
  },
}

export function TaskPriorityBadge({ priority, className, showIcon = true }: TaskPriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.normal
  const Icon = config.icon
  const label = TASK_PRIORITY_LABELS[priority] || priority

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  )
}
