import { useState, useEffect, useRef } from 'react'
import { X, UserPlus, Edit3, Loader2, ShieldCheck, Mail, KeyRound, Camera, Trash2, Upload } from 'lucide-react'
import type { UserProfileExtended } from '../types/users.types'
import type { UserRole } from '@/shared/types'
import { USER_ROLE_LABELS } from '@/shared/types'
import { useUserMutations } from '../hooks/useUsers'
import { useAuth } from '@/modules/auth/useAuth'
import { Avatar, ConfirmDialog, useToast, Button } from '@/shared/components/ui'
import { TempPasswordModal } from './TempPasswordModal'
import { uploadUserAvatar } from '../services/usersService'

interface UserFormModalProps {
  userToEdit?: UserProfileExtended | null
  branches: { id: string; name: string; code: string }[]
  isOpen: boolean
  onClose: () => void
}

export function UserFormModal({ userToEdit, branches, isOpen, onClose }: UserFormModalProps) {
  const isEditing = !!userToEdit
  const { isGeneralAdmin } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('courier')
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showTempPasswordModal, setShowTempPasswordModal] = useState(false)

  const {
    createUser,
    updateUser,
    sendResetLink,
    isCreating,
    isUpdating,
    isSendingResetLink,
    createError,
    updateError,
  } = useUserMutations()

  useEffect(() => {
    if (userToEdit) {
      setEmail(userToEdit.email)
      setPassword('')
      setFullName(userToEdit.full_name)
      setDisplayName(userToEdit.display_name || userToEdit.full_name)
      setAvatarUrl(userToEdit.avatar_url || '')
      setPhone(userToEdit.phone || '')
      setRole(userToEdit.role)
      setSelectedBranches(userToEdit.branch_ids || [])
    } else {
      setEmail('')
      setPassword('')
      setFullName('')
      setDisplayName('')
      setAvatarUrl('')
      setPhone('')
      setRole('courier')
      setSelectedBranches(branches.map((b) => b.id))
    }
  }, [userToEdit, branches])

  if (!isOpen) return null

  const handleBranchToggle = (branchId: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    )
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La foto de perfil no debe superar los 5 MB.')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const publicUrl = await uploadUserAvatar(file, userToEdit?.id)
      setAvatarUrl(publicUrl)
      toast.success('Foto cargada', 'Se guardará al actualizar el perfil del empleado.')
    } catch (err: any) {
      toast.error('Error al subir foto', err?.message || 'No se pudo subir el archivo.')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl('')
  }

  const handleSendResetLink = async () => {
    if (!userToEdit) return
    try {
      await sendResetLink({ email: userToEdit.email, userId: userToEdit.id })
      toast.success(
        'Enlace enviado',
        `Se envió un enlace de recuperación al correo ${userToEdit.email}.`
      )
      setShowResetConfirm(false)
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al enviar el enlace de recuperación.'
      toast.error('Error de recuperación', msg)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEditing && userToEdit) {
        await updateUser({
          id: userToEdit.id,
          payload: {
            full_name: fullName,
            display_name: displayName || fullName,
            avatar_url: avatarUrl || null,
            phone: phone || undefined,
            role,
            branch_ids: selectedBranches,
          },
        })
        toast.success('Usuario actualizado', `Perfil de ${fullName} guardado exitosamente.`)
      } else {
        await createUser({
          email,
          password,
          full_name: fullName,
          display_name: displayName || fullName,
          avatar_url: avatarUrl || null,
          phone: phone || undefined,
          role,
          branch_ids: selectedBranches,
        })
        toast.success('Usuario creado', `Cuenta para ${fullName} creada correctamente.`)
      }
      onClose()
    } catch (err) {
      console.error('Error saving user:', err)
    }
  }

  const isLoading = isCreating || isUpdating || isUploadingAvatar
  const errorMessage = (createError || updateError) as Error | null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
        <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8 relative">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
              {isEditing ? <Edit3 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                {isEditing ? `Editar Perfil — ${userToEdit.full_name}` : 'Nuevo Empleado / Usuario'}
              </h2>
              <p className="text-xs text-foreground-muted">
                {isEditing
                  ? 'Modifique datos personales, foto, rol o sucursales.'
                  : 'Cree las credenciales, foto y rol del nuevo empleado.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Foto de Perfil / Avatar del Empleado */}
            <div className="p-3 bg-muted/20 border border-border/80 rounded-xl flex items-center gap-4">
              <div className="relative group shrink-0">
                <Avatar
                  src={avatarUrl || undefined}
                  name={displayName || fullName || 'Empleado'}
                  size="lg"
                  className="h-14 w-14 text-sm ring-2 ring-border shadow-2xs"
                />
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white shadow-xs hover:bg-rose-700 transition cursor-pointer"
                    title="Quitar foto"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1 flex-1">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-lg transition cursor-pointer disabled:opacity-50"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                  {avatarUrl ? 'Cambiar Foto' : 'Subir Foto del Empleado'}
                </button>
                <p className="text-[10px] text-foreground-muted">
                  Visible en las tareas asignadas y en el portal de seguimiento del cliente.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Correo Electrónico <span className="text-destructive">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={isEditing}
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground disabled:opacity-50"
                />
              </div>

              {!isEditing && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Contraseña Inicial <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nombre Completo <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Gómez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Nombre Corto / Apodo
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos G."
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="Ej: 8888-8888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Rol del Usuario <span className="text-destructive">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground cursor-pointer"
                >
                  <option value="courier">Motorizado / Conductor</option>
                  <option value="junior_admin">Administrador Junior</option>
                  {isGeneralAdmin && <option value="general_admin">Administrador General</option>}
                </select>
              </div>
            </div>

            {/* Selector de Sucursales Asignadas */}
            {branches.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Sucursales Asignadas
                </label>
                <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 rounded-lg border border-border max-h-36 overflow-y-auto">
                  {branches.map((branch) => {
                    const isChecked = selectedBranches.includes(branch.id)
                    return (
                      <label
                        key={branch.id}
                        className="flex items-center gap-2 text-xs text-foreground cursor-pointer hover:text-accent select-none"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleBranchToggle(branch.id)}
                          className="rounded text-accent focus:ring-accent/50 cursor-pointer"
                        />
                        <span className="truncate">{branch.name}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Opciones de Seguridad para edición (Solo si está editando) */}
            {isEditing && userToEdit && (
              <div className="pt-2 border-t border-border/60">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Gestión de Contraseña</p>
                      <p className="text-[10px] text-foreground-muted">Opciones de acceso del usuario</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isSendingResetLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted rounded-lg border border-border transition cursor-pointer"
                    >
                      <Mail className="h-3 w-3" />
                      Enviar Enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTempPasswordModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg border border-amber-200 dark:border-amber-800 transition cursor-pointer"
                    >
                      <KeyRound className="h-3 w-3" />
                      Clave Temporal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <p className="text-xs text-destructive font-medium">{errorMessage.message}</p>
            )}

            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmación para Enviar Enlace de Recuperación */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="¿Enviar enlace de recuperación?"
        message={`Se enviará un correo a "${userToEdit?.email}" con instrucciones para que el usuario restablezca su contraseña.`}
        confirmText="Enviar Enlace"
        cancelText="Cancelar"
        variant="info"
        isLoading={isSendingResetLink}
        onConfirm={handleSendResetLink}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Modal para Asignar Contraseña Temporal */}
      {userToEdit && (
        <TempPasswordModal
          user={userToEdit}
          isOpen={showTempPasswordModal}
          onClose={() => setShowTempPasswordModal(false)}
        />
      )}
    </>
  )
}
