import { useQuery } from '@tanstack/react-query'
import { getCouriersForBranch } from '../services/tasksService'

export function useCouriers(branchId?: string) {
  return useQuery({
    queryKey: ['couriers', branchId || 'all'],
    queryFn: () => getCouriersForBranch(branchId && branchId !== 'all' ? branchId : undefined),
    staleTime: 1000 * 60 * 5, // 5 minutos en memoria para transiciones instantáneas
    gcTime: 1000 * 60 * 15,
  })
}
