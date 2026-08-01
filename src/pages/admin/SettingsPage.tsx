import { useState } from 'react'
import {
  Settings,
  User,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/AuthContext'
import { supabase } from '@/shared/lib/supabaseClient'

export default function SettingsPage() {
  const { profile } = useAuth()

  const [displayName, setDisplayName] = useState(profile?.display_name || profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isChangingPw, setIsChangingPw] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setProfileSaved(false)
    try {
      await supabase
        .from('profiles')
        .update({ display_name: displayName, phone: phone || null })
        .eq('id', profile!.id)
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } finally {
      setIsSavingProfile(false)
    }
  }

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
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err: unknown) {
      setPwError((err as Error).message)
    } finally {
      setIsChangingPw(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
        <p className="text-xs text-foreground-muted mt-0.5">
          Administra tu perfil de usuario y seguridad de la cuenta.
        </p>
      </div>

      {/* Perfil */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="h-4 w-4 text-accent" />
          Información del Perfil
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Correo Electrónico</label>
            <input
              type="email"
              value={profile?.email || ''}
              disabled
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground-muted cursor-not-allowed"
            />
            <p className="text-[11px] text-foreground-subtle mt-1">
              El correo electrónico no puede modificarse desde aquí.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Nombre Completo</label>
            <input
              type="text"
              value={profile?.full_name || ''}
              disabled
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nombre Corto / Apodo
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Teléfono</label>
            <input
              type="text"
              placeholder="Ej: 8888-8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            {profileSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Perfil guardado
              </span>
            )}
            <button
              type="submit"
              disabled={isSavingProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isSavingProfile ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar Perfil
            </button>
          </div>
        </form>
      </div>

      {/* Cambio de contraseña */}
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
            <input
              type={showPw ? 'text' : 'password'}
              required
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          {pwError && (
            <p className="text-xs text-destructive font-medium">{pwError}</p>
          )}

          <div className="flex items-center justify-end gap-3">
            {pwSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Contraseña actualizada
              </span>
            )}
            <button
              type="submit"
              disabled={isChangingPw}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isChangingPw ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Settings className="h-3.5 w-3.5" />
              )}
              Actualizar Contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
