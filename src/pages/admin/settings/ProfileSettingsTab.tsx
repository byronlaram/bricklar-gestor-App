import { useState, useEffect, useRef } from 'react'
import {
  User,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Camera,
  Upload,
  Trash2,
  Mail,
  Phone,
  Shield,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { supabase } from '@/shared/lib/supabaseClient'
import { uploadUserAvatar } from '@/modules/users/services/usersService'
import { Avatar, Button, useToast } from '@/shared/components/ui'

export function ProfileSettingsTab() {
  const { profile, role } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || profile.full_name || '')
      setPhone(profile.phone || '')
      setAvatarUrl(profile.avatar_url || '')
    }
  }, [profile])

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar los 5 MB.')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const publicUrl = await uploadUserAvatar(file, profile?.id)
      setAvatarUrl(publicUrl)
      toast.success('Foto cargada', 'Haz clic en "Guardar Perfil" para aplicar tu nueva foto.')
    } catch (err: any) {
      console.error('Error al subir avatar:', err)
      toast.error('Error al subir imagen', err?.message || 'No se pudo subir la foto.')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return

    setIsSavingProfile(true)
    setProfileSaved(false)
    setProfileError('')
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || profile.full_name,
          phone: phone.trim() || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (error) throw error

      setProfileSaved(true)
      toast.success('Perfil actualizado', 'Tus datos y foto de perfil se guardaron correctamente.')
      setTimeout(() => setProfileSaved(false), 3500)
    } catch (err: any) {
      console.error('Error al actualizar el perfil:', err)
      setProfileError(err.message || 'Error al guardar la información del perfil.')
      toast.error('Error', 'No se pudo guardar el perfil.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6 max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Mi Perfil Personal</h2>
            <p className="text-xs text-foreground-muted">Administra tu foto, nombre visible y teléfono de contacto</p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted text-foreground-muted border border-border flex items-center gap-1 capitalize">
          <Shield className="h-3 w-3 text-accent" />
          {role === 'general_admin' ? 'Admin General' : role === 'junior_admin' ? 'Admin Junior' : 'Personal'}
        </span>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-5">
        {/* Sección Foto de Perfil / Avatar */}
        <div className="p-4 bg-muted/20 border border-border/80 rounded-2xl flex flex-col sm:flex-row items-center gap-4.5">
          <div className="relative group shrink-0">
            <Avatar
              src={avatarUrl || undefined}
              name={displayName || profile?.full_name || 'Usuario'}
              size="lg"
              className="h-20 w-20 text-lg shadow-sm ring-2 ring-border group-hover:ring-accent/40 transition-all"
            />

            {avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
                title="Eliminar foto"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarFileChange}
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar || isSavingProfile}
                className="gap-1.5 text-xs"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 text-accent" />
                )}
                {avatarUrl ? 'Cambiar Foto' : 'Subir Foto de Perfil'}
              </Button>
            </div>

            <p className="text-[11px] text-foreground-muted">
              Se mostrará en la esquina superior derecha del sistema y en tus acciones registradas.
            </p>
          </div>
        </div>

        {/* Campos de texto */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground-muted cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-foreground-muted mt-1">
              El correo está vinculado a tu cuenta y no puede modificarse directamente.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nombre Legal Completo
            </label>
            <input
              type="text"
              value={profile?.full_name || ''}
              disabled
              className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-xl text-foreground-muted cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nombre Visible / Apodo en la App <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Carlos G."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
            <p className="text-[11px] text-foreground-muted mt-1">
              Es el nombre que verán los demás usuarios en el sistema y en los registros de auditoría.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Teléfono de Contacto
            </label>
            <input
              type="tel"
              placeholder="Ej: +505 8888-8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>
        </div>

        {profileError && (
          <p className="text-xs text-destructive font-medium flex items-center gap-1.5 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {profileError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/50">
          {profileSaved && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in">
              <CheckCircle2 className="h-4 w-4" />
              ¡Perfil guardado!
            </span>
          )}
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSavingProfile || isUploadingAvatar}
            className="gap-2 px-5"
          >
            {isSavingProfile ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Perfil
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
