import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCashMovements,
  voidCashMovement,
  type DetailedCashMovement,
  type VoidCashMovementPayload,
} from '../services/workdaysService'

export interface CashMovementsFilter {
  branch_id?: string
  date?: string
  workday_id?: string
  courier_id?: string
}

export function useCashMovements(filters: CashMovementsFilter = {}) {
  return useQuery<DetailedCashMovement[]>({
    queryKey: ['cash_movements', filters],
    queryFn: () => getCashMovements(filters),
    staleTime: 1000 * 15,
  })
}

export function useVoidCashMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: VoidCashMovementPayload) => voidCashMovement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash_movements'] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['all_couriers_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['courier_pending_balances'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

