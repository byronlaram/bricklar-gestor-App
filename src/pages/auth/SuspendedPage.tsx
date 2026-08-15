import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/useAuth'
import { Button, Card, Divider } from '@/shared/components/ui'
import { ShieldOff, LogOut, Mail, HelpCircle } from 'lucide-react'

export default function SuspendedPage() {
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-6 sm:p-12 selection:bg-rose-500 selection:text-white">
      {/* ── Top Header Branding ─────────────────────────────────────────── */}
      <header className="max-w-md mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
            B
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block leading-tight">Bricklar Gestor</span>
            <span className="text-2xs text-slate-400 font-medium">Estado de Cuenta</span>
          </div>
        </div>
      </header>

      {/* ── Tarjeta Central Informativa ───────────────────────────────── */}
      <main className="my-auto max-w-md mx-auto w-full space-y-6">
        <Card className="p-6 sm:p-8 shadow-card border-slate-200 bg-white text-center space-y-6 animate-fade-in">
          {/* Icono de Alerta de Suspensión */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
            <ShieldOff className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-rose-600 px-3 py-1 bg-rose-50 rounded-full border border-rose-200 inline-block">
              Acceso Restringido
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cuenta Suspendida
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Hola <strong className="text-slate-900 font-semibold">{profile?.full_name ?? 'Usuario'}</strong>, tu cuenta de acceso a la plataforma ha sido desactivada temporalmente por el administrador del sistema.
            </p>
          </div>

          {/* Caja Informativa de Ayuda */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-semibold text-slate-800">
              <HelpCircle className="h-4 w-4 text-primary shrink-0" />
              <span>¿Cómo solicitar la reactivación?</span>
            </div>
            <p className="leading-relaxed">
              Ponte en contacto con el Administrador General o con el departamento de Operaciones de Bricklar para revisar tu estado de habilitación.
            </p>
            <div className="pt-1 flex items-center gap-2 text-2xs font-semibold text-primary">
              <Mail className="h-3.5 w-3.5" />
              <span>soporte@bricklar.com</span>
            </div>
          </div>

          {/* Botón de Cierre de Sesión (Button de UI Kit) */}
          <div className="pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-center text-slate-700 hover:bg-slate-100"
              leftIcon={<LogOut className="h-4 w-4" />}
              onClick={handleSignOut}
            >
              Cerrar Sesión e Ir al Login
            </Button>
          </div>
        </Card>

        <div className="text-center">
          <Divider />
          <p className="text-2xs text-slate-400 mt-3">
            Bricklar Gestor • Control de Políticas de Seguridad RLS
          </p>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="text-center text-2xs text-slate-400 pt-4 border-t border-slate-200 max-w-md mx-auto w-full">
        &copy; {new Date().getFullYear()} Bricklar Gestor. Todos los derechos reservados.
      </footer>
    </div>
  )
}
