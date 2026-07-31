import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/lib/queryClient'
import { AuthProvider } from '@/modules/auth/AuthContext'
import type { ReactNode } from 'react'

/**
 * Providers globales de la aplicación.
 * Orden: QueryClient (sin deps de auth) → Auth (usa queryClient internamente).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}
