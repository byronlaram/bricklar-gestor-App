import { useQuery } from '@tanstack/react-query'
import { getTaskById, getTaskStatusHistory, getTaskAssignments } from '../services/tasksService'

export function useTask(id?: string) {
  const taskQuery = useQuery({
    queryKey: ['task', id],
    queryFn: () => getTaskById(id!),
    enabled: !!id,
    staleTime: 1000 * 10, // 10 segundos
    refetchOnMount: true, // Siempre consultar al abrir detalle para asegurar estado verídico
  })

  const historyQuery = useQuery({
    queryKey: ['task-history', id],
    queryFn: () => getTaskStatusHistory(id!),
    enabled: !!id,
    staleTime: 1000 * 10,
    refetchOnMount: true,
  })

  const assignmentsQuery = useQuery({
    queryKey: ['task-assignments', id],
    queryFn: () => getTaskAssignments(id!),
    enabled: !!id,
    staleTime: 1000 * 10,
    refetchOnMount: true,
  })

  return {
    task: taskQuery.data,
    isLoading: taskQuery.isLoading,
    isError: taskQuery.isError,
    error: taskQuery.error,
    refetch: taskQuery.refetch,
    history: historyQuery.data ?? [],
    isLoadingHistory: historyQuery.isLoading,
    assignments: assignmentsQuery.data ?? [],
    isLoadingAssignments: assignmentsQuery.isLoading,
  }
}
