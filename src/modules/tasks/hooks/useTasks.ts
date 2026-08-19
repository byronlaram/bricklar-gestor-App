import { useQuery } from '@tanstack/react-query'
import { getTasks } from '../services/tasksService'
import type { TaskFilters } from '../types/task.types'

export function useTasks(
  filters: TaskFilters = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {}
) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
    enabled: options.enabled ?? true,
    staleTime: 1000 * 5, // 5s fresco
    refetchInterval: options.refetchInterval ?? 1000 * 15, // Polling de respaldo cada 15s
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  })
}
