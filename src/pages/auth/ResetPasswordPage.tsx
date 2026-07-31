import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/shared/lib/supabaseClient'
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/shared/utils/cn'

const schema = z.object({
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
    .regex(/[0-9]/, 'Debe incluir al menos un número'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})
type Input = z.infer<typeof schema>

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session)
    })
  }, [])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Input>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Input) => {
    setError(null)
    const { error: e } = await supabase.auth.updateUser({ password: data.password })
    if (e) { setError('Error al actualizar la contraseña. El enlace puede haber expirado.'); return }
    setDone(true)
    setTimeout(() => navigate('/login', { replace: true }), 3000)
  }

  if (!validSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle size={28} className="text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Enlace inválido</h2>
          <p className="mt-2 text-sm text-foreground-muted">Este enlace de recuperación ha expirado o ya fue utilizado.</p>
          <button onClick={() => navigate('/recuperar-contrasena')} className="mt-4 text-sm font-medium text-accent hover:underline">
            Solicitar un nuevo enlace
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-sm text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-status-completed/10">
            <CheckCircle2 size={28} className="text-status-completed" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Contraseña actualizada</h2>
          <p className="mt-2 text-sm text-foreground-muted">Tu contraseña fue cambiada correctamente. Redirigiendo al inicio de sesión…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground">Nueva contraseña</h2>
          <p className="mt-1 text-sm text-foreground-muted">Elige una contraseña segura para tu cuenta.</p>
        </div>
        {error && <div role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {[
            { id: 'password', label: 'Nueva contraseña', show: showPwd, setShow: setShowPwd, key: 'password' as const },
            { id: 'confirmPassword', label: 'Confirmar contraseña', show: showConfirm, setShow: setShowConfirm, key: 'confirmPassword' as const },
          ].map(({ id, label, show, setShow, key }) => (
            <div key={id}>
              <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">{label} <span aria-hidden="true" className="text-destructive">*</span></label>
              <div className="relative">
                <input
                  id={id} type={show ? 'text' : 'password'} aria-required="true"
                  aria-invalid={!!errors[key]}
                  className={cn('w-full rounded-lg border px-4 py-2.5 pr-11 text-sm bg-surface transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20', errors[key] ? 'border-destructive' : 'border-border hover:border-foreground-muted')}
                  {...register(key)}
                />
                <button type="button" onClick={() => setShow((v: boolean) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted" aria-label={show ? 'Ocultar' : 'Mostrar'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors[key] && <p role="alert" className="mt-1 text-xs text-destructive">{errors[key]?.message}</p>}
            </div>
          ))}
          <p className="text-xs text-foreground-muted">Mínimo 8 caracteres, una mayúscula y un número.</p>
          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-hover disabled:opacity-60">
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Guardando…</> : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
