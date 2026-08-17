import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSettlements,
  getSettlementById,
  getSettlementByWorkday,
  submitSettlement,
  approveSettlement,
  adminForceSettlement,
  getCashMovements,
  createCashMovement,
  getDailyClosure,
} from '../services/settlementsService'
import type {
  SettlementFilters,
  CreateMovementPayload,
  ApproveSettlementPayload,
  AdminForceSettlementPayload,
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
    queryFn: () => getDailyClosure(branchId, date!),
    enabled: !!date,
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
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
    },
  })

  const approveMutation = useMutation({
    mutationFn: (payload: ApproveSettlementPayload) => approveSettlement(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['settlement', data.id] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.invalidateQueries({ queryKey: ['daily-closure'] })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
    },
  })

  const forceSettlementMutation = useMutation({
    mutationFn: (payload: AdminForceSettlementPayload) => adminForceSettlement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.invalidateQueries({ queryKey: ['daily-closure'] })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
    },
  })

  const addMovementMutation = useMutation({
    mutationFn: (payload: CreateMovementPayload) => createCashMovement(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements', data.workday_id] })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement', data.workday_id] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
    },
  })

  return {
    submitSettlement: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,

    approveSettlement: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    approveError: approveMutation.error,

    forceSettlement: forceSettlementMutation.mutateAsync,
    isForcingSettlement: forceSettlementMutation.isPending,
    forceSettlementError: forceSettlementMutation.error,

    addMovement: addMovementMutation.mutateAsync,
    isAddingMovement: addMovementMutation.isPending,
    movementError: addMovementMutation.error,
  }
}

