import type { TaskStatus } from '@/shared/types'
import { TASK_STATUS_LABELS } from '@/shared/types'
import { cn } from '@/shared/utils/cn'
import {
  Clock,
  UserCheck,
  Navigation,
  Loader2,
  CheckCircle2,
  XCircle,
  CalendarDays,
  Ban,
  Archive,
} from 'lucide-react'

interface TaskStatusBadgeProps {
  status: TaskStatus
  className?: string
  showIcon?: boolean
}

const STATUS_CONFIG: Record<
  TaskStatus,
  { bg: string; text: string; border: string; icon: React.ElementType }
> = {
  pending: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    icon: Clock,
  },
  assigned: {
    bg: 'bg-sky-500/10 dark:bg-sky-500/20',
    text: 'text-sky-700 dark:text-sky-400',
    border: 'border-sky-500/30',
    icon: UserCheck,
  },
  en_route: {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-500/30',
    icon: Navigation,
  },
  in_progress: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-500/30',
    icon: Loader2,
  },
  completed: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  not_completed: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500/30',
    icon: XCircle,
  },
  rescheduled: {
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-500/30',
    icon: CalendarDays,
  },
  cancelled: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-700 dark:text-slate-400',
    border: 'border-slate-500/30',
    icon: Ban,
  },
  archived: {
    bg: 'bg-zinc-500/10 dark:bg-zinc-500/20',
    text: 'text-zinc-700 dark:text-zinc-400',
    border: 'border-zinc-500/30',
    icon: Archive,
  },
}

export function TaskStatusBadge({ status, className, showIcon = true }: TaskStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  const Icon = config.icon
  const label = TASK_STATUS_LABELS[status] || status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {showIcon && <Icon className={cn('h-3.5 w-3.5', status === 'in_progress' && 'animate-spin')} />}
      {label}
    </span>
  )
}
