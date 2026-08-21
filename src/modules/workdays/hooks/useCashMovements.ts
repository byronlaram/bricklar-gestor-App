import { useQuery } from '@tanstack/react-query'
import {
  getCashMovements,
  type DetailedCashMovement,
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
