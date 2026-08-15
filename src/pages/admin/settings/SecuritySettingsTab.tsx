import { useState } from 'react'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldAlert, Mail, Info } from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { supabase } from '@/shared/lib/supabaseClient'

export function SecuritySettingsTab() {
  const { profile } = useAuth()

  // Estado para cambio de contraseña
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isChangingPw, setIsChangingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  // Estado para cambio de correo electrónico
  const [newEmail, setNewEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (newPassword !== confirmPassword) {
      setPwError('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 6) {
      setPwError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setIsChangingPw(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPwSaved(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPwSaved(false), 4000)
    } catch (err: unknown) {
      setPwError((err as Error).message || 'Error al actualizar la contraseña.')
    } finally {
      setIsChangingPw(false)
    }
  }

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setEmailSaved(false)

    if (newEmail.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
      setEmailError('Los correos electrónicos ingresados no coinciden.')
      return
    }

    if (newEmail.trim().toLowerCase() === profile?.email?.toLowerCase()) {
      setEmailError('El nuevo correo electrónico debe ser diferente al actual.')
      return
    }

    setIsChangingEmail(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
      if (error) throw error

      setEmailSaved(true)
      setNewEmail('')
      setConfirmEmail('')
    } catch (err: unknown) {
      setEmailError((err as Error).message || 'Error al solicitar el cambio de correo electrónico.')
    } finally {
      setIsChangingEmail(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Seccion 1: Cambiar Correo Electrónico */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent" />
          Cambiar Correo Electrónico
        </h2>

        <form onSubmit={handleChangeEmail} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Correo Electrónico Actual
            </label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nuevo Correo Electrónico <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="ejemplo@empresa-cliente.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Confirmar Nuevo Correo Electrónico <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="Confirma el nuevo correo electrónico"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          {emailError && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              {emailError}
            </p>
          )}

          {emailSaved && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                <Info className="h-4 w-4 text-accent" />
                Enlace de confirmación enviado
              </p>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 leading-relaxed pl-5">
                Se ha enviado una solicitud de actualización a la nueva dirección. El cambio surtirá efecto una vez que confirmes el enlace enviado por correo electrónico.
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="submit"
              disabled={isChangingEmail}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isChangingEmail ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              Actualizar Correo
            </button>
          </div>
        </form>
      </div>

      {/* Seccion 2: Cambiar Contraseña */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Lock className="h-4 w-4 text-accent" />
          Cambiar Contraseña
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nueva Contraseña <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pr-10 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition cursor-pointer"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Confirmar Nueva Contraseña <span className="text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                placeholder="Repite la nueva contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pr-10 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
          </div>

          {pwError && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              {pwError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {pwSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Contraseña actualizada
              </span>
            )}
            <button
              type="submit"
              disabled={isChangingPw}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isChangingPw ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              Actualizar Contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
