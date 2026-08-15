import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/modules/auth/useAuth'
import { Button, Input, Card, Divider, useToast } from '@/shared/components/ui'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  PackageCheck,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react'

// ─── Schema de Validación Zod ──────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Introduce un correo electrónico válido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  remember: z.boolean(),
})

type LoginInput = z.infer<typeof loginSchema>

// ─── Pantalla de Login Rediseñada (Fase 1A) ───────────────────────────────────
export default function LoginPage() {
  const { signIn } = useAuth()
  const toast = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    try {
      await signIn(data.email, data.password)
      toast.success('Sesión iniciada', 'Redirigiendo a tu panel de control...')
    } catch (err) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : 'Credenciales incorrectas. Verifica tu correo y contraseña.'
      setServerError(errorMsg)
      toast.error('Error de autenticación', errorMsg)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-accent selection:text-white">
      {/* ── Panel Izquierdo: Branding & Identidad (Escritorio) ─────────── */}
      <div className="relative hidden flex-1 flex-col items-center justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        {/* Patrón Grid Elegante en Fondo */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        {/* Resplandor Celeste Sutil (Accent Glow) */}
        <div
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        {/* Top Header Branding */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-xl shadow-md">
              B
            </div>
            <div>
              <span className="text-base font-bold tracking-tight block leading-tight">Bricklar</span>
              <span className="text-2xs text-slate-400 font-medium uppercase tracking-wider">Gestor Operativo</span>
            </div>
          </div>
          <span className="text-2xs font-semibold px-3 py-1 bg-white/10 text-slate-300 rounded-full backdrop-blur-xs border border-white/10">
            v1.0 SaaS
          </span>
        </div>

        {/* Cuerpo Central de Propuesta de Valor */}
        <div className="relative z-10 max-w-lg space-y-6 text-left my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold border border-accent/25">
            <ShieldCheck className="h-3.5 w-3.5" />
            Acceso Seguro RLS & Token JWT
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            Control integral de entregas, rutas y finanzas operativas.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Plataforma corporativa diseñada para optimizar el despacho de tareas, monitoreo de sucursales y liquidación de caja en tiempo real.
          </p>

          <div className="pt-4 grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1.5">
              <span className="text-xs font-semibold text-accent flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4" /> Despacho Móvil
              </span>
              <p className="text-2xs text-slate-300">Asignación inteligente para motorizados en ruta.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-1.5">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Balances Precisos
              </span>
              <p className="text-2xs text-slate-300">Auditoría automática de ingresos y gastos.</p>
            </div>
          </div>
        </div>

        {/* Footer Legal branding */}
        <div className="relative z-10 w-full flex items-center justify-between text-2xs text-slate-400 border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} Bricklar Gestor. Todos los derechos reservados.</span>
          <span>Uso Interno Autorizado</span>
        </div>
      </div>

      {/* ── Panel Derecho: Formulario de Autenticación ─────────────────── */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Header móvil */}
        <div className="flex items-center justify-between lg:hidden mb-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-lg">
              B
            </div>
            <span className="text-base font-bold text-slate-900">Bricklar Gestor</span>
          </div>
        </div>

        <div className="my-auto space-y-8 w-full max-w-md mx-auto">
          {/* Encabezado del Formulario */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Iniciar Sesión
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Introduce tus credenciales autorizadas para ingresar a la plataforma.
            </p>
          </div>

          {/* Tarjeta del Formulario */}
          <Card className="p-6 sm:p-8 shadow-card border-slate-200 bg-white space-y-6">
            {/* Banner de error de servidor si aplica */}
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 animate-fade-in"
              >
                <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Error al Iniciar Sesión</span>
                  <p>{serverError}</p>
                </div>
              </div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="space-y-5"
              aria-label="Formulario de inicio de sesión"
            >
              {/* Campo Correo Electrónico */}
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="usuario@bricklar.com"
                autoComplete="email"
                autoFocus
                leftIcon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              {/* Campo Contraseña con Toggle */}
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                leftIcon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                {...register('password')}
              />

              {/* Checkbox Recordarme + Enlace Olvidé contraseña */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent/20 cursor-pointer"
                    {...register('remember')}
                  />
                  <span>Recordarme</span>
                </label>

                <Link
                  to="/recuperar-contrasena"
                  className="text-xs font-semibold text-accent hover:text-sky-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              {/* Botón de Submit Principal (Button del UI Kit) */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full justify-center shadow-md font-bold text-sm"
                isLoading={isSubmitting}
                rightIcon={!isSubmitting ? <ArrowRight className="h-4 w-4" /> : undefined}
              >
                {isSubmitting ? 'Verificando credenciales...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Card>

          {/* Nota de Seguridad */}
          <div className="text-center space-y-2">
            <Divider />
            <p className="text-2xs text-slate-400 leading-relaxed">
              Acceso restringido únicamente a usuarios registrados y autorizados.
              <br />
              Todas las operaciones son auditadas conforme a las políticas de seguridad RLS.
            </p>
          </div>
        </div>

        {/* Footer simple para pantalla móvil */}
        <div className="text-center text-2xs text-slate-400 pt-6 border-t border-slate-100 lg:hidden">
          &copy; {new Date().getFullYear()} Bricklar Gestor. Todos los derechos reservados.
        </div>
      </div>
    </div>
  )
}
