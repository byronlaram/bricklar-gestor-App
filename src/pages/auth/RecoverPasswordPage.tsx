import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabaseClient'
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

const schema = z.object({
  email: z.string().email('Correo electrónico inválido'),
})
type Input = z.infer<typeof schema>

export default function RecoverPasswordPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<Input>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Input) => {
    setServerError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${import.meta.env.VITE_APP_URL}/restablecer-contrasena`,
    })
    if (error) {
      // No revelar si el email existe o no
      console.error('[RecoverPassword]', error.message)
    }
    // Siempre mostrar éxito para no enumerar usuarios
    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-completed/10">
            <CheckCircle2 size={28} className="text-status-completed" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Correo enviado</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Si la dirección <strong>{getValues('email')}</strong> está registrada,
            recibirás instrucciones para restablecer tu contraseña en los próximos minutos.
          </p>
          <p className="mt-2 text-xs text-foreground-subtle">
            Revisa tu carpeta de spam si no ves el correo.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
          >
            <ArrowLeft size={14} />
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Volver al inicio de sesión
        </Link>

        <div className="mb-8">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100">
            <Mail size={20} className="text-primary-700" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Recuperar contraseña</h2>
          <p className="mt-1 text-sm text-foreground-muted">
            Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
          </p>
        </div>

        {serverError && (
          <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              Correo electrónico <span aria-hidden="true" className="text-destructive">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              aria-required="true"
              aria-invalid={!!errors.email}
              className={cn(
                'w-full rounded-lg border px-4 py-2.5 text-sm bg-surface transition-colors',
                'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                errors.email ? 'border-destructive' : 'border-border hover:border-foreground-muted'
              )}
              placeholder="usuario@agencia.com"
              {...register('email')}
            />
            {errors.email && (
              <p role="alert" className="mt-1 text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-60"
          >
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Enviando…</> : 'Enviar instrucciones'}
          </button>
        </form>
      </div>
    </div>
  )
}
