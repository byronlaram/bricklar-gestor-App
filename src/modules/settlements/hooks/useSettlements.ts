import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSettlements,
  getSettlementById,
  getSettlementByWorkday,
  submitSettlement,
  approveSettlement,
  rejectSettlement,
  adminForceSettlement,
  getCashMovements,
  createCashMovement,
  getDailyClosure,
  confirmDailyClosure,
} from '../services/settlementsService'
import type {
  SettlementFilters,
  CreateMovementPayload,
  ApproveSettlementPayload,
  RejectSettlementPayload,
  AdminForceSettlementPayload,
  ConfirmDailyClosurePayload,
} from '../types/settlements.types'
import { broadcastSyncEvent } from '@/shared/lib/realtimeSync'

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.refetchQueries({ queryKey: ['settlements'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement'] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
      broadcastSyncEvent('settlements', 'update')
    },
  })

  const approveMutation = useMutation({
    mutationFn: (payload: ApproveSettlementPayload) => approveSettlement(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.refetchQueries({ queryKey: ['settlements'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['settlement', data.id] })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement'] })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['daily-closure'] })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
      broadcastSyncEvent('settlements', 'update', { entityId: data.id })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (payload: RejectSettlementPayload) => rejectSettlement(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.refetchQueries({ queryKey: ['settlements'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['settlement', data.id] })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement'] })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
      broadcastSyncEvent('settlements', 'update', { entityId: data.id })
    },
  })

  const forceSettlementMutation = useMutation({
    mutationFn: (payload: AdminForceSettlementPayload) => adminForceSettlement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.refetchQueries({ queryKey: ['settlements'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement'] })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['daily-closure'] })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
      broadcastSyncEvent('settlements', 'update')
    },
  })

  const confirmDailyClosureMutation = useMutation({
    mutationFn: (params: ConfirmDailyClosurePayload) =>
      confirmDailyClosure(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.refetchQueries({ queryKey: ['settlements'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement'] })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['daily-closure'] })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
      broadcastSyncEvent('settlements', 'update')
    },
  })

  const addMovementMutation = useMutation({
    mutationFn: (payload: CreateMovementPayload) => createCashMovement(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements', data.workday_id] })
      queryClient.invalidateQueries({ queryKey: ['workday-settlement', data.workday_id] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.refetchQueries({ queryKey: ['workdays'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['cash_movements'] })
      queryClient.refetchQueries({ queryKey: ['cash_movements'], type: 'active' })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' })
      broadcastSyncEvent('cash_movements', 'create', { entityId: data.id })
    },
  })

  return {
    submitSettlement: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error,

    approveSettlement: approveMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    approveError: approveMutation.error,

    rejectSettlement: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,
    rejectError: rejectMutation.error,

    forceSettlement: forceSettlementMutation.mutateAsync,
    isForcingSettlement: forceSettlementMutation.isPending,
    forceSettlementError: forceSettlementMutation.error,

    confirmDailyClosure: confirmDailyClosureMutation.mutateAsync,
    isConfirmingDailyClosure: confirmDailyClosureMutation.isPending,
    confirmDailyClosureError: confirmDailyClosureMutation.error,

    addMovement: addMovementMutation.mutateAsync,
    isAddingMovement: addMovementMutation.isPending,
    movementError: addMovementMutation.error,
  }
}

