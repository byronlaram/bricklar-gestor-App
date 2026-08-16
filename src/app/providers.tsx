import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/shared/lib/queryClient'
import { AuthProvider } from '@/modules/auth/AuthContext'
import { ToastProvider } from '@/shared/components/ui'
import { PwaInstallBanner } from '@/shared/components/PwaInstallBanner'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import type { ReactNode } from 'react'

/**
 * Providers globales de la aplicación.
 * Orden: ErrorBoundary → QueryClient → Auth → Toast → PwaInstallBanner.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <PwaInstallBanner />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
