import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TaskType } from '@/shared/types'
import {
  getTaskTypesSettings,
  saveTaskTypesSettings,
  buildDefaultCustomConfigs,
  type CustomTaskTypeConfig,
  type TaskNature,
} from '../services/taskTypeSettingsService'
import { useAuth } from '@/modules/auth/useAuth'

export const TASK_TYPES_CONFIG_QUERY_KEY = ['task-types-configs']

export function useTaskTypesConfig() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const query = useQuery<Record<TaskType, CustomTaskTypeConfig>>({
    queryKey: TASK_TYPES_CONFIG_QUERY_KEY,
    queryFn: getTaskTypesSettings,
    staleTime: 1000 * 60 * 5, // 5 minutos de caché fresca
  })

  const mutation = useMutation({
    mutationFn: (newConfigs: Record<TaskType, CustomTaskTypeConfig>) =>
      saveTaskTypesSettings(newConfigs, profile?.id),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(TASK_TYPES_CONFIG_QUERY_KEY, variables)
    },
  })

  // Listado filtrado y categorizado
  const configs = query.data || buildDefaultCustomConfigs()
  
  const activeConfigs = Object.entries(configs)
    .filter(([_, cfg]) => cfg.enabled !== false)
    .reduce((acc, [key, cfg]) => {
      acc[key as TaskType] = cfg
      return acc
    }, {} as Record<TaskType, CustomTaskTypeConfig>)

  const incomeTypes = Object.entries(configs).filter(([_, cfg]) => cfg.nature === 'income')
  const expenseTypes = Object.entries(configs).filter(([_, cfg]) => cfg.nature === 'expense')
  const neutralTypes = Object.entries(configs).filter(([_, cfg]) => cfg.nature === 'neutral')

  return {
    configs,
    activeConfigs,
    incomeTypes,
    expenseTypes,
    neutralTypes,
    isLoading: query.isLoading,
    isError: query.isError,
    saveConfigs: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
