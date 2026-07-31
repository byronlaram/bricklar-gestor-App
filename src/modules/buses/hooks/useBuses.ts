import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBusRoutes, createBusRoute, updateBusRoute, deleteBusRoute } from '../services/busesService'
import type { CreateBusRoutePayload, UpdateBusRoutePayload } from '../types/buses.types'

export function useBusRoutes() {
  return useQuery({
    queryKey: ['bus_routes'],
    queryFn: () => getBusRoutes(),
    staleTime: 1000 * 60 * 10,
  })
}

export function useBusMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (payload: CreateBusRoutePayload) => createBusRoute(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bus_routes'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBusRoutePayload }) =>
      updateBusRoute(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bus_routes'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBusRoute(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bus_routes'] }),
  })

  return {
    createBusRoute: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateBusRoute: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    deleteBusRoute: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
