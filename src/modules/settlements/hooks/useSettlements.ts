import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSettlements,
  getSettlementById,
  getSettlementByWorkday,
  submitSettlement,
  approveSettlement,
  getCashMovements,
  createCashMovement,
  getDailyClosure,
} from '../services/settlementsService'
import type {
  SettlementFilters,
  CreateMovementPayload,
  ApproveSettlementPayload,
} from '../types/settlements.types'

export function useSettlements(filters: SettlementFilters = {}) {
  return useQuery({
    queryKey: ['settlements', filters],
    queryFn: () => getSettlements(filters),
    staleTime: 1000 * 30,
  })
}

export function useSettlement(id?: string) {
  return useQuery({
    queryKey: ['settlement', id],
    queryFn: () => getSettlementById(id!),
    enabled: !!id,
  })
}

export function useWorkdaySettlement(workdayId?: string) {
  return useQuery({
    queryKey: ['workday-settlement', workdayId],
    queryFn: () => getSettlementByWorkday(workdayId!),
    enabled: !!workdayId,
  })
}

export function useCashMovements(workdayId?: string) {
  return useQuery({
    queryKey: ['cash-movements', workdayId],
    queryFn: () => getCashMovements(workdayId!),
    enabled: !!workdayId,
  })
}

export function useDailyClosure(branchId?: string, date?: string) {
  return useQuery({
    queryKey: ['daily-closure', branchId, date],
    queryFn: () => getDailyClosure(branchId!, date!),
    enabled: !!branchId && !!date,
  })
}

export function useSettlementMutations() {
  const queryClient = useQueryClient()

  const submitMutation = useMutation({
    mutationFn: ({ workdayId, notes }: { workdayId: string; notes?: string }) =>
      submitSettlement(workdayId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement', data.workday_id] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (payload: ApproveSettlementPayload) => approveSettlement(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlement', data.id] })
      queryClient.invalidateQueries({ queryKey: ['daily-closure'] })
    },
  })

  const addMovementMutation = useMutation({
    mutationFn: (payload: CreateMovementPayload) => createCashMovement(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements', data.workday_id] })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement', data.workday_id] })
    },
  })

  return {
    submitSettlement: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,

    approveSettlement: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    approveError: approveMutation.error,

    addMovement: addMovementMutation.mutateAsync,
    isAddingMovement: addMovementMutation.isPending,
    movementError: addMovementMutation.error,
  }
}
