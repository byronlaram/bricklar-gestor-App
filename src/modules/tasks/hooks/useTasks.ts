import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { getTasks } from '../services/tasksService'
import type { TaskFilters } from '../types/task.types'

export function useTasks(
  filters: TaskFilters = {},
  options: { enabled?: boolean; refetchInterval?: number | false } = {}
) {
  // Si se especifica courier_id en filters pero aún es falsy (esperando profile de auth), pausar query
  const isCourierFilterPending = 'courier_id' in filters && !filters.courier_id
  const isQueryEnabled = options.enabled !== undefined ? options.enabled : !isCourierFilterPending

  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => getTasks(filters),
    enabled: isQueryEnabled,
    staleTime: 1000 * 30, // 30 segundos fresco en memoria
    gcTime: 1000 * 60 * 10, // 10 minutos en memoria caché
    placeholderData: keepPreviousData, // Reutiliza datos previos de inmediato evitando parpadeos de skeletons
    refetchInterval: options.refetchInterval ?? false, // Sin polling innecesario; los WebSockets se encargan de sincronizar
    refetchOnMount: true, // Refresca en segundo plano al montar sin bloquear la interfaz
    refetchOnWindowFocus: false, // No recarga bruscamente al desbloquear el móvil o cambiar de app
    refetchOnReconnect: true,
  })
}
