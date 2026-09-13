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
    staleTime: 1000 * 5, // 5 segundos de frescura
    gcTime: 1000 * 60 * 10, // 10 minutos en memoria caché
    placeholderData: keepPreviousData, // Reutiliza datos previos de inmediato evitando parpadeos de skeletons
    // Sin polling por defecto: las tareas se sincronizan vía Realtime (useTasksRealtime).
    // Los llamadores que necesiten polling explícito pueden pasar refetchInterval: N.
    refetchInterval: options.refetchInterval !== undefined ? options.refetchInterval : false,
    refetchOnMount: true, // Refresca en segundo plano al montar sin bloquear la interfaz
    // refetchOnWindowFocus se hereda del QueryClient global (false) para evitar
    // ráfagas de peticiones al volver a enfocar la ventana. La sincronización
    // al recuperar el foco ya está cubierta por useTasksRealtime (visibilitychange).
    refetchOnReconnect: true,
  })
}
