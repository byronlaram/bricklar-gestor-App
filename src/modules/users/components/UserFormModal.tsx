import { useState, useEffect } from 'react'
import { X, UserPlus, Edit3, Loader2 } from 'lucide-react'
import type { UserProfileExtended } from '../types/users.types'
import type { UserRole } from '@/shared/types'
import { USER_ROLE_LABELS } from '@/shared/types'
import { useUserMutations } from '../hooks/useUsers'

interface UserFormModalProps {
  userToEdit?: UserProfileExtended | null
  branches: { id: string; name: string; code: string }[]
  isOpen: boolean
  onClose: () => void
}

export function UserFormModal({ userToEdit, branches, isOpen, onClose }: UserFormModalProps) {
  const isEditing = !!userToEdit

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<UserRole>('courier')
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])

  const { createUser, updateUser, isCreating, isUpdating, createError, updateError } =
    useUserMutations()

  useEffect(() => {
    if (userToEdit) {
      setEmail(userToEdit.email)
      setPassword('')
      setFullName(userToEdit.full_name)
      setDisplayName(userToEdit.display_name || userToEdit.full_name)
      setPhone(userToEdit.phone || '')
      setRole(userToEdit.role)
      setSelectedBranches(userToEdit.branch_ids || [])
    } else {
      setEmail('')
      setPassword('')
      setFullName('')
      setDisplayName('')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEditing && userToEdit) {
        await updateUser({
          id: userToEdit.id,
          payload: {
            full_name: fullName,
            display_name: displayName || fullName,
            phone: phone || undefined,
            role,
            branch_ids: selectedBranches,
          },
        })
      } else {
        await createUser({
          email,
          password,
          full_name: fullName,
          display_name: displayName || fullName,
          phone: phone || undefined,
          role,
          branch_ids: selectedBranches,
        })
      }
      onClose()
    } catch (err) {
      console.error('Error saving user:', err)
    }
  }

  const isLoading = isCreating || isUpdating
  const errorMessage = (createError || updateError) as Error | null

  return (
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
              {isEditing ? `Editar Usuario — ${userToEdit.full_name}` : 'Nuevo Usuario'}
            </h2>
            <p className="text-xs text-foreground-muted">
              {isEditing
                ? 'Modifique el rol, datos personales o sucursales.'
                : 'Cree las credenciales y rol del nuevo usuario.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Ej: Carlos Mendoza"
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
                placeholder="Ej: Carlos M."
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Rol del Sistema <span className="text-destructive">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              >
                {Object.entries(USER_ROLE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
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
          </div>

          {/* Sucursales Asignadas */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Sucursales Autorizadas
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 border border-border/50 rounded-xl">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={selectedBranches.includes(b.id)}
                    onChange={() => handleBranchToggle(b.id)}
                    className="h-4 w-4 rounded text-accent focus:ring-accent accent-accent"
                  />
                  <span className="text-foreground font-medium">{b.name} ({b.code})</span>
                </label>
              ))}
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs text-destructive font-medium">{errorMessage.message}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground border border-border rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
