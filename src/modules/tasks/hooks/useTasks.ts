import { useQuery } from '@tanstack/react-query'
import { getTasks } from '../services/tasksService'
import type { TaskFilters } from '../types/task.types'

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  })
}
