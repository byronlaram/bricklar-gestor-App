import { useState, useEffect } from 'react'
import { User, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { supabase } from '@/shared/lib/supabaseClient'

export function ProfileSettingsTab() {
  const { profile } = useAuth()

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || profile.full_name || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    setIsSavingProfile(true)
    setProfileSaved(false)
    setProfileError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName, phone: phone || null })
        .eq('id', profile.id)

      if (error) throw error

      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 3000)
    } catch (err: any) {
      console.error('Error al actualizar el perfil:', err)
      setProfileError(err.message || 'Error al guardar la información del perfil.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5 max-w-2xl">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <User className="h-4 w-4 text-accent" />
        Información del perfil
      </h2>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Correo electrónico</label>
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
          <label className="block text-xs font-semibold text-foreground mb-1">Nombre completo</label>
          <input
            type="text"
            value={profile?.full_name || ''}
            disabled
            className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg text-foreground-muted cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            Nombre corto / apodo
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

        {profileError && (
          <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {profileError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {profileSaved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Perfil guardado
            </span>
          )}
          <button
            type="submit"
            disabled={isSavingProfile}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
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
  )
}
