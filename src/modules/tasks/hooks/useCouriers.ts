import { useQuery } from '@tanstack/react-query'
import { getCouriersForBranch } from '../services/tasksService'

export function useCouriers(branchId?: string) {
  return useQuery({
    queryKey: ['couriers', branchId],
    queryFn: () => getCouriersForBranch(branchId!),
    enabled: !!branchId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}
