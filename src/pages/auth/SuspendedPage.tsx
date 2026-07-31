import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { ShieldOff, LogOut } from 'lucide-react'

export default function SuspendedPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldOff size={32} className="text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Cuenta suspendida</h1>
      <p className="mt-3 max-w-sm text-sm text-foreground-muted">
        Tu cuenta ha sido suspendida temporalmente. Contacta al administrador
        del sistema para obtener más información y restablecer tu acceso.
      </p>
      <button
        onClick={handleSignOut}
        className="mt-6 flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-hover hover:text-foreground"
      >
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </div>
  )
}
