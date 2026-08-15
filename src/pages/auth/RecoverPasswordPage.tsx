import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabaseClient'
import { Button, Input, Card, Divider, useToast } from '@/shared/components/ui'
import {
  Mail,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'

// ─── Schema de Validación Zod ──────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Introduce un correo electrónico válido'),
})

type InputData = z.infer<typeof schema>

// ─── Pantalla de Recuperación de Contraseña Rediseñada (Fase 1B) ───────────────
export default function RecoverPasswordPage() {
  const toast = useToast()
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<InputData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: InputData) => {
    setServerError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/restablecer-contrasena`,
    })

    if (error) {
      console.error('[RecoverPassword]', error.message)
    }

    // Siempre mostrar éxito para prevenir la enumeración de correos
    setSent(true)
    toast.info(
      'Instrucciones enviadas',
      'Si el correo está registrado, recibirás un enlace de recuperación.'
    )
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

        {/* Top Header Branding */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/branding/bricklar-icon.svg"
              alt="Bricklar"
              className="h-10 w-10 rounded-xl shadow-md"
            />
            <div>
              <span className="text-base font-bold tracking-tight block leading-tight">Bricklar</span>
              <span className="text-2xs text-slate-400 font-medium uppercase tracking-wider">Gestor Operativo</span>
            </div>
          </div>
          <span className="text-2xs font-semibold px-3 py-1 bg-white/10 text-slate-300 rounded-full backdrop-blur-xs border border-white/10">
            Recuperación de Acceso
          </span>
        </div>

        {/* Cuerpo Central de Propuesta de Valor */}
        <div className="relative z-10 max-w-lg space-y-6 text-left my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-semibold border border-accent/25">
            <KeyRound className="h-3.5 w-3.5" />
            Restablecimiento Seguro de Contraseña
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-white leading-tight">
            Recupera el acceso a tu cuenta corporativa de forma rápida.
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed">
            Te enviaremos un enlace temporal codificado a tu correo registrado para que puedas crear una nueva contraseña de acceso.
          </p>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-2">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> Protección Anti-Enumeración
            </span>
            <p className="text-2xs text-slate-300 leading-relaxed">
              Por razones de privacidad y seguridad RLS, las confirmaciones no revelan la existencia de cuentas individuales en la base de datos.
            </p>
          </div>
        </div>

        {/* Footer Legal branding */}
        <div className="relative z-10 w-full flex items-center justify-between text-2xs text-slate-400 border-t border-white/10 pt-4">
          <span>&copy; {new Date().getFullYear()} Bricklar Gestor. Todos los derechos reservados.</span>
          <span>Soporte Interno</span>
        </div>
      </div>

      {/* ── Panel Derecho: Formulario o Confirmación ──────────────────── */}
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
          {/* Botón de Retorno Al Login */}
          <div>
            <Link to="/login" className="inline-block">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600 hover:text-slate-900 -ml-2"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Volver al inicio de sesión
              </Button>
            </Link>
          </div>

          {/* VISTA DE ÉXITO POS-ENVÍO */}
          {sent ? (
            <Card className="p-6 sm:p-8 shadow-card border-slate-200 bg-white text-center space-y-6 animate-fade-in">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Instrucciones Enviadas
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Si la dirección <strong className="text-slate-900 font-semibold">{getValues('email')}</strong> se encuentra registrada en el sistema, recibirás un correo con las instrucciones para restablecer tu contraseña en breve.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-2xs text-slate-500 leading-relaxed text-left">
                <p className="font-semibold text-slate-700 mb-0.5">¿No recibiste el correo?</p>
                <p>Verifica tu carpeta de correo no deseado (Spam) o intenta enviar la solicitud nuevamente pasados unos minutos.</p>
              </div>

              <div className="pt-2">
                <Link to="/login" className="block">
                  <Button variant="primary" size="lg" className="w-full justify-center">
                    Regresar al Login
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            /* VISTA DE FORMULARIO DE RECUPERACIÓN */
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 border border-primary/15">
                  <Mail className="h-5 w-5" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Recuperar Contraseña
                </h2>
                <p className="text-xs sm:text-sm text-slate-500">
                  Introduce tu correo electrónico corporativo y te enviaremos el enlace para restablecer tu acceso.
                </p>
              </div>

              <Card className="p-6 sm:p-8 shadow-card border-slate-200 bg-white space-y-6">
                {serverError && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 animate-fade-in"
                  >
                    <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{serverError}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="space-y-5"
                  aria-label="Formulario de recuperación de contraseña"
                >
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

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center shadow-md font-bold text-sm"
                    isLoading={isSubmitting}
                    rightIcon={!isSubmitting ? <ArrowRight className="h-4 w-4" /> : undefined}
                  >
                    {isSubmitting ? 'Enviando enlace...' : 'Enviar instrucciones'}
                  </Button>
                </form>
              </Card>
            </div>
          )}

          {/* Footer de Seguridad */}
          <div className="text-center space-y-2">
            <Divider />
            <p className="text-2xs text-slate-400 leading-relaxed">
              El proceso de recuperación requiere acceso verificado al correo registrado.
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
