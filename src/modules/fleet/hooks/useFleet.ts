import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getVehicles,
  saveVehicle,
  deleteVehicle,
  getMaintenanceRecords,
  addMaintenanceRecord,
} from '../services/fleetService'
import type { Vehicle, MaintenanceRecord } from '../types/fleet.types'

export const FLEET_QUERY_KEYS = {
  vehicles: (branchId?: string) => ['fleet-vehicles', branchId ?? 'all'],
  maintenanceRecords: (vehicleId?: string) => ['fleet-maintenance-records', vehicleId ?? 'all'],
}

export function useVehicles(branchId?: string) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.vehicles(branchId),
    queryFn: () => getVehicles(branchId),
    staleTime: 1000 * 60 * 2, // 2 minutos
  })
}

export function useMaintenanceRecords(vehicleId?: string) {
  return useQuery({
    queryKey: FLEET_QUERY_KEYS.maintenanceRecords(vehicleId),
    queryFn: () => getMaintenanceRecords(vehicleId),
    staleTime: 1000 * 60 * 2,
  })
}

export function useVehicleMutations() {
  const queryClient = useQueryClient()

  const saveVehicleMutation = useMutation({
    mutationFn: (payload: Partial<Vehicle>) => saveVehicle(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] })
    },
  })

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] })
    },
  })

  const addMaintenanceMutation = useMutation({
    mutationFn: (payload: Omit<MaintenanceRecord, 'id' | 'created_at'>) =>
      addMaintenanceRecord(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['fleet-maintenance-records'] })
    },
  })

  return {
    saveVehicle: saveVehicleMutation.mutateAsync,
    isSavingVehicle: saveVehicleMutation.isPending,
    deleteVehicle: deleteVehicleMutation.mutateAsync,
    isDeletingVehicle: deleteVehicleMutation.isPending,
    addMaintenance: addMaintenanceMutation.mutateAsync,
    isAddingMaintenance: addMaintenanceMutation.isPending,
  }
}
