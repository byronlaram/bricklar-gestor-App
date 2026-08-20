import { useQuery } from '@tanstack/react-query'
import {
  getCourierPendingBalances,
  getAllCouriersPendingBalances,
  type CourierPendingBalancesSummary,
} from '../services/settlementsService'

export function useCourierPendingBalances(courierId?: string, beforeDate?: string) {
  return useQuery<CourierPendingBalancesSummary>({
    queryKey: ['courier_pending_balances', courierId, beforeDate],
    queryFn: () => {
      if (!courierId) {
        return Promise.resolve({
          courierId: '',
          totalPendingCash: 0,
          hasPendingBalances: false,
          unclosedWorkdaysCount: 0,
          breakdown: [],
        })
      }
      return getCourierPendingBalances(courierId, beforeDate)
    },
    enabled: !!courierId,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Refrescar cada minuto
  })
}

export function useAllCouriersPendingBalances(branchId?: string, beforeDate?: string) {
  return useQuery<CourierPendingBalancesSummary[]>({
    queryKey: ['all_couriers_pending_balances', branchId, beforeDate],
    queryFn: () => getAllCouriersPendingBalances(branchId, beforeDate),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}
