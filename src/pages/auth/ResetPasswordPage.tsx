import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabaseClient'
import { Button, Input, Card, Divider, useToast } from '@/shared/components/ui'
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
} from 'lucide-react'

// ─── Schema de Validación Zod ──────────────────────────────────────────────────
const schema = z
  .object({
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
      .regex(/[0-9]/, 'Debe incluir al menos un número'),
    confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

type InputData = z.infer<typeof schema>

// ─── Pantalla de Restablecimiento de Contraseña Rediseñada (Fase 1C) ──────────
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validSession, setValidSession] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session)
      setIsCheckingSession(false)
    })
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<InputData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: InputData) => {
    setError(null)
    const { error: e } = await supabase.auth.updateUser({
      password: data.password,
      data: { must_change_password: false },
    })
    if (e) {
      const msg = 'Error al actualizar la contraseña. El enlace puede haber expirado o la sesión caducado.'
      setError(msg)
      toast.error('Error de actualización', msg)
      return
    }

    // Limpiar la bandera must_change_password en la tabla profiles
    const { data: sessionData } = await supabase.auth.getSession()
    const currentUserId = sessionData?.session?.user?.id
    if (currentUserId) {
      await supabase
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', currentUserId)
    }

    setDone(true)
    toast.success('Contraseña actualizada', 'Tu nueva contraseña ha sido guardada exitosamente.')
    setTimeout(() => navigate('/login', { replace: true }), 2500)
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

        {/* Top Header Branding — Franja Blanca */}
        <div className="relative z-10 w-full -mx-12 -mt-12 px-8 py-4 bg-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <img
              src="/branding/bricklar-icon.svg"
              alt="Bricklar"
              className="h-10 w-10 rounded-xl shadow-sm"
            />
            <div>
              <span className="text-base font-bold tracking-tight block leading-tight text-primary">Bricklar</span>
              <span className="text-2xs text-slate-500 font-medium uppercase tracking-wider">Gestor Operativo</span>
            </div>
          </div>
          <span className="text-2xs font-semibold px-3 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
            Seguridad de Acceso
          </span>
        </div>

        {/* Cuerpo Central */}
        <div className="relative z-10 max-w-lg space-y-6 text-left my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold border border-accent/25">
            <KeyRound className="h-3.5 w-3.5" />
            Actualización de Credencial
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            Establece una nueva clave de acceso segura.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Tu nueva contraseña debe cumplir con los requisitos mínimos de fortaleza para proteger los datos operativos y financieros de tu sucursal.
          </p>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Encriptación de Alta Seguridad
            </span>
            <p className="text-2xs text-slate-300 leading-relaxed">
              Las contraseñas son procesadas directamente por el motor de autenticación Supabase y nunca se almacenan en texto plano.
            </p>
          </div>
        </div>

        {/* Footer Legal branding */}
        <div className="relative z-10 w-full flex items-center justify-between text-2xs text-slate-400 border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} Bricklar Gestor. Todos los derechos reservados.</span>
          <span>Plataforma Segura</span>
        </div>
      </div>

      {/* ── Panel Derecho: Formulario o Estados ───────────────────────── */}
      <div className="flex flex-1 flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-xl mx-auto w-full">
        {/* Header móvil */}
        <div className="flex items-center justify-between lg:hidden mb-8">
          <div className="flex items-center gap-2.5">
            <img
              src="/branding/bricklar-icon.svg"
              alt="Bricklar"
              className="h-9 w-9 rounded-lg shadow-sm"
            />
            <span className="text-base font-bold text-slate-900">Bricklar Gestor</span>
          </div>
        </div>

        <div className="my-auto space-y-6 w-full max-w-md mx-auto">

          {/* ESTADO DE CARGA VERIFICANDO SESIÓN */}
          {isCheckingSession ? (
            <Card className="p-8 text-center space-y-4 shadow-card border-slate-200">
              <div className="h-8 w-8 animate-spin text-accent mx-auto rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-xs font-medium text-slate-500">Verificando enlace de seguridad...</p>
            </Card>
          ) : !validSession ? (
            /* ENLACE INVÁLIDO O EXPIRADO */
            <Card className="p-6 sm:p-8 shadow-card border-slate-200 bg-white text-center space-y-6 animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                <AlertCircle className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Enlace Expirado o Inválido
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Este enlace de recuperación ha caducado o ya ha sido utilizado para actualizar la contraseña.
                </p>
              </div>

              <div className="pt-2">
                <Link to="/recuperar-contrasena" className="block">
                  <Button variant="primary" size="lg" className="w-full justify-center">
                    Solicitar Nuevo Enlace
                  </Button>
                </Link>
              </div>
            </Card>
          ) : done ? (
            /* ÉXITO EN LA ACTUALIZACIÓN */
            <Card className="p-6 sm:p-8 shadow-card border-slate-200 bg-white text-center space-y-6 animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Contraseña Actualizada
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tu nueva contraseña ha sido registrada exitosamente. Serás redirigido al inicio de sesión en unos segundos...
                </p>
              </div>

              <div className="pt-2">
                <Link to="/login" className="block">
                  <Button variant="primary" size="lg" className="w-full justify-center">
                    Ir al Inicio de Sesión
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            /* FORMULARIO DE RESTABLECIMIENTO */
            <div className="space-y-6">
              <div className="space-y-2">
                <Link to="/login" className="inline-block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900 -ml-2 mb-2"
                    leftIcon={<ArrowLeft className="h-4 w-4" />}
                  >
                    Volver al login
                  </Button>
                </Link>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Nueva Contraseña
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Elige una clave segura para resguardar tus operaciones.
                </p>
              </div>

              <Card className="p-6 sm:p-8 shadow-card border-slate-200 bg-white space-y-6">
                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 animate-fade-in"
                  >
                    <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-5"
                  aria-label="Formulario de restablecimiento de contraseña"
                >
                  <Input
                    label="Nueva contraseña"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    leftIcon={<Lock className="h-4 w-4" />}
                    error={errors.password?.message}
                    helperText="Mínimo 8 caracteres, 1 mayúscula y 1 número."
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        aria-label={showPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    {...register('password')}
                  />

                  <Input
                    label="Confirmar contraseña"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    leftIcon={<Lock className="h-4 w-4" />}
                    error={errors.confirmPassword?.message}
                    rightIcon={
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      >
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                    {...register('confirmPassword')}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center shadow-md font-bold text-sm"
                    isLoading={isSubmitting}
                    rightIcon={!isSubmitting ? <ArrowRight className="h-4 w-4" /> : undefined}
                  >
                    {isSubmitting ? 'Guardando contraseña...' : 'Guardar Nueva Contraseña'}
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* Footer de Seguridad */}
          <div className="text-center space-y-2">
            <Divider />
            <p className="text-2xs text-slate-400 leading-relaxed">
              Bricklar Gestor • Módulo de Seguridad de Acceso
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
