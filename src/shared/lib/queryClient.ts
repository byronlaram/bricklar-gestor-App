import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,        // 3 minutos — navegación instantánea entre pantallas sin bloqueos
      gcTime: 1000 * 60 * 15,         // 15 minutos de caché en memoria
      retry: (failureCount, error) => {
        // No reintentar errores de autorización (401, 403)
        if (
          error instanceof Error &&
          (error.message.includes('401') ||
            error.message.includes('403') ||
            error.message.includes('not authorized') ||
            error.message.includes('JWT'))
        ) {
          return false
        }
        return failureCount < 2
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      refetchOnWindowFocus: false,     // Evita ráfagas de peticiones al tocar pantallas o cambiar pestañas en móviles
      refetchOnReconnect: 'always',    // Solo recargar si realmente se perdió y recuperó la conexión a internet
    },
    mutations: {
      retry: false,
    },
  },
})

