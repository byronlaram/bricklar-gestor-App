import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getActiveWorkday,
  startWorkday,
  endWorkday,
  getWorkdays,
} from '../services/workdaysService'
import type {
  StartWorkdayPayload,
  EndWorkdayPayload,
  WorkdayFilters,
} from '../types/workdays.types'
import { broadcastSyncEvent } from '@/shared/lib/realtimeSync'

export function useActiveWorkday(userId?: string) {
  return useQuery({
    queryKey: ['active-workday', userId],
    queryFn: () => getActiveWorkday(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

export function useWorkdays(filters: WorkdayFilters = {}) {
  return useQuery({
    queryKey: ['workdays', filters],
    queryFn: () => getWorkdays(filters),
    staleTime: 1000 * 30,
  })
}

export function useWorkdayMutations() {
  const queryClient = useQueryClient()

  const startMutation = useMutation({
    mutationFn: (payload: StartWorkdayPayload) => startWorkday(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['active-workday', data.courier_id] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      broadcastSyncEvent('workdays', 'update', {
        entityId: data.id,
        assignedCourierId: data.courier_id,
      })
    },
  })

  const endMutation = useMutation({
    mutationFn: (payload: EndWorkdayPayload) => endWorkday(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['active-workday', data.courier_id] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      broadcastSyncEvent('workdays', 'update', {
        entityId: data.id,
        assignedCourierId: data.courier_id,
      })
    },
  })

  return {
    startWorkday: startMutation.mutateAsync,
    isStarting: startMutation.isPending,
    startError: startMutation.error,

    endWorkday: endMutation.mutateAsync,
    isEnding: endMutation.isPending,
    endError: endMutation.error,
  }
}
