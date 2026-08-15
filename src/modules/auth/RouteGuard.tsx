import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/auth/useAuth'
import type { UserRole } from '@/shared/types'
import { Loader2 } from 'lucide-react'

interface RouteGuardProps {
  children: React.ReactNode
  /** Roles permitidos. Si está vacío, cualquier usuario autenticado puede pasar. */
  allowedRoles?: UserRole[]
  /** Ruta de redirección si no tiene permiso */
  redirectTo?: string
}

export function RouteGuard({
  children,
  allowedRoles = [],
  redirectTo = '/login',
}: RouteGuardProps) {
  const { isAuthenticated, isLoading, role, profile, mustChangePassword } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-foreground-muted">Verificando sesión…</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Cambio obligatorio de contraseña (clave temporal)
  if (mustChangePassword && location.pathname !== '/restablecer-contrasena') {
    return <Navigate to="/restablecer-contrasena" state={{ forcedChange: true }} replace />
  }

  // Cuenta suspendida
  if (profile && !profile.is_active) {
    return <Navigate to="/cuenta-suspendida" replace />
  }

  // Verificar rol si se especificaron roles permitidos
  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    // Redirigir al panel correspondiente sin exponer la ruta protegida
    const fallbackByRole: Record<UserRole, string> = {
      general_admin: '/admin',
      junior_admin: '/admin',
      courier: '/motorizado',
    }
    return <Navigate to={fallbackByRole[role] ?? '/'} replace />
  }

  return <>{children}</>
}

/** Guard para rutas de autenticación (redirige si ya está logueado) */
export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, role } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (isAuthenticated && role) {
    const from = (location.state as { from?: Location })?.from?.pathname
    const destination = from ?? (
      role === 'courier' ? '/motorizado' : '/admin'
    )
    return <Navigate to={destination} replace />
  }

  return <>{children}</>
}
