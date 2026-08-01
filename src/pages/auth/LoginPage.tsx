import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/modules/auth/AuthContext'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
  remember: z.boolean(),
})

type LoginInput = z.infer<typeof loginSchema>

// ─── Componente ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { signIn } = useAuth()
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
      // La redirección la maneja el guard de rutas (PublicOnlyGuard)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Panel izquierdo: branding (solo escritorio) ──────────────── */}
      <div className="relative hidden flex-1 flex-col items-center justify-center overflow-hidden bg-primary-700 lg:flex">
        {/* Patrón de fondo */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />
        {/* Glow decorativo */}
        <div
          className="absolute top-1/4 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />

        {/* Contenido de branding */}
        <div className="relative z-10 max-w-md px-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent shadow-lg shadow-accent/30">
            <span className="text-2xl font-bold text-white">GO</span>
          </div>
          <h1 className="mb-3 text-3xl font-bold text-white">GestorOps</h1>
          <p className="text-base leading-relaxed text-primary-200">
            Plataforma de gestión de entregas, rutas y operaciones financieras
            para equipos de motorizados.
          </p>

          {/* Features */}
          <div className="mt-10 space-y-3 text-left">
            {[
              'Gestión de tareas y rutas en tiempo real',
              'Liquidaciones multimoneda NIO y USD',
              'Control financiero por motorizado y sucursal',
              'Directorio de buses y encomiendas',
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-accent/20">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                </div>
                <span className="text-sm text-primary-200">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer branding */}
        <p className="absolute bottom-6 text-xs text-primary-400">
          Solo para uso interno autorizado
        </p>
      </div>

      {/* ── Panel derecho: formulario ─────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12 sm:px-10 lg:max-w-lg lg:px-16">
        {/* Logo mobile */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-700 shadow">
            <span className="text-lg font-bold text-white">GO</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">GestorOps</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Accede a tu cuenta para continuar
            </p>
          </div>

          {/* Error del servidor */}
          {serverError && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive animate-fade-in"
            >
              <ShieldCheck size={16} className="mt-0.5 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
            aria-label="Formulario de inicio de sesión"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Correo electrónico <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? 'email-error' : undefined}
                className={cn(
                  'w-full rounded-lg border px-4 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle',
                  'bg-surface transition-colors',
                  'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                  errors.email
                    ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                    : 'border-border hover:border-foreground-muted'
                )}
                placeholder="usuario@agencia.com"
                {...register('email')}
              />
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1 text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Contraseña <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-required="true"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className={cn(
                    'w-full rounded-lg border px-4 py-2.5 pr-11 text-sm text-foreground',
                    'bg-surface transition-colors',
                    'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                    errors.password
                      ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                      : 'border-border hover:border-foreground-muted'
                  )}
                  placeholder="••••••••"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-foreground-muted hover:text-foreground"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Recordar sesión + Olvidé contraseña */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground-muted">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/30"
                  {...register('remember')}
                />
                Recordarme
              </label>
              <Link
                to="/recuperar-contrasena"
                className="text-sm font-medium text-accent hover:text-accent-hover hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
                'bg-accent text-sm font-semibold text-white shadow-sm',
                'transition-all duration-150',
                'hover:bg-accent-hover hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none',
                isSubmitting && 'animate-pulse-soft'
              )}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando…
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Nota de seguridad */}
          <p className="mt-8 text-center text-xs text-foreground-subtle">
            Acceso exclusivo para personal autorizado.
            <br />
            El registro público no está habilitado.
          </p>
        </div>
      </div>
    </div>
  )
}
