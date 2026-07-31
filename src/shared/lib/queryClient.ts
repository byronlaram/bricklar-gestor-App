import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,        // 2 minutos — datos frescos para operaciones financieras
      gcTime: 1000 * 60 * 10,          // 10 minutos de caché en memoria
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
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: false,
    },
  },
})
