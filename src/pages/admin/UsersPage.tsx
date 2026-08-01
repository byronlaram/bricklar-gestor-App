import { useState, useMemo } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit3,
  Power,
  Trash2,
  Loader2,
  ShieldCheck,
  Shield,
  Bike,
} from 'lucide-react'
import { useUsers, useUserMutations } from '@/modules/users/hooks/useUsers'
import { UserFormModal } from '@/modules/users/components/UserFormModal'
import { DeleteUserConfirmModal } from '@/modules/users/components/DeleteUserConfirmModal'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import type { UserProfileExtended, UserFilters } from '@/modules/users/types/users.types'
import type { UserRole } from '@/shared/types'
import { USER_ROLE_LABELS } from '@/shared/types'

const ROLE_BADGE: Record<UserRole, { label: string; class: string; icon: React.ReactNode }> = {
  general_admin: {
    label: 'Admin General',
    class: 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    icon: <ShieldCheck className="h-3 w-3" />,
  },
  junior_admin: {
    label: 'Admin Junior',
    class: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300',
    icon: <Shield className="h-3 w-3" />,
  },
  courier: {
    label: 'Motorizado',
    class: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    icon: <Bike className="h-3 w-3" />,
  },
}

import { useAuth } from '@/modules/auth/AuthContext'

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [filters, setFilters] = useState<UserFilters>({ search: '', role: '', is_active: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userToEdit, setUserToEdit] = useState<UserProfileExtended | null>(null)
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null)

  const [userToDelete, setUserToDelete] = useState<UserProfileExtended | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

  const { data: users = [], isLoading } = useUsers(filters)
  const { data: branches = [] } = useBranches()
  const { toggleUserStatus, isToggling, deleteUser, isDeleting } = useUserMutations()

  const branchMap = useMemo(
    () => Object.fromEntries(branches.map((b) => [b.id, b])),
    [branches]
  )

  const handleEdit = (user: UserProfileExtended) => {
    setUserToEdit(user)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setUserToEdit(null)
    setIsModalOpen(true)
  }

  const handleToggleStatus = async (user: UserProfileExtended) => {
    if (user.id === currentUser?.id) {
      alert('No puedes inactivar tu propia cuenta de Administrador General.')
      return
    }

    const actionText = user.is_active ? 'Inactivar' : 'Activar'
    if (!window.confirm(`¿Estás seguro de que deseas ${actionText.toLowerCase()} al usuario "${user.full_name}"?`)) return

    setTogglingUserId(user.id)
    try {
      await toggleUserStatus({ id: user.id, isActive: !user.is_active })
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cambiar estado del usuario.')
    } finally {
      setTogglingUserId(null)
    }
  }

  const handleOpenDeleteModal = (user: UserProfileExtended) => {
    if (user.id === currentUser?.id) {
      alert('No puedes eliminar tu propia cuenta de Administrador General.')
      return
    }
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!userToDelete) return
    setDeletingUserId(userToDelete.id)
    try {
      await deleteUser(userToDelete.id)
      alert(`El usuario "${userToDelete.full_name}" fue eliminado exitosamente.`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al eliminar usuario.')
    } finally {
      setDeletingUserId(null)
      setUserToDelete(null)
      setIsDeleteModalOpen(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuarios del Sistema</h1>
          <p className="text-xs text-foreground-muted">
            Gestión de cuentas, roles y sucursales autorizadas.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl shadow-md transition cursor-pointer shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={filters.search || ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            className="w-full pl-9 pr-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-foreground-muted shrink-0" />
          <select
            value={filters.role || ''}
            onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value as UserRole | '' }))}
            className="flex-1 sm:flex-none px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          >
            <option value="">Todos los roles</option>
            {Object.entries(USER_ROLE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>

          <select
            value={filters.is_active === '' ? '' : String(filters.is_active)}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                is_active: e.target.value === '' ? '' : e.target.value === 'true',
              }))
            }
            className="flex-1 sm:flex-none px-3 py-2 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
          >
            <option value="">Activos e inactivos</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs">Cargando usuarios...</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No se encontraron usuarios con los filtros actuales.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-xs">
              <thead className="bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider">Rol</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground-muted uppercase tracking-wider hidden md:table-cell">Sucursales</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground-muted uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground-muted uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {users.map((user) => {
                  const badge = ROLE_BADGE[user.role]
                  return (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-foreground">{user.full_name}</p>
                          <p className="text-foreground-muted text-[11px]">{user.email}</p>
                          {user.phone && (
                            <p className="text-foreground-subtle text-[11px]">{user.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${badge.class}`}>
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {user.branch_ids.length === 0 ? (
                            <span className="text-foreground-subtle text-[11px]">Sin asignar</span>
                          ) : (
                            user.branch_ids.map((bid) => (
                              <span
                                key={bid}
                                className="bg-muted border border-border px-2 py-0.5 rounded text-[11px] font-mono text-foreground-muted"
                              >
                                {branchMap[bid]?.code || bid.slice(0, 6)}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            user.is_active ? 'bg-emerald-500' : 'bg-rose-400'
                          }`}
                          title={user.is_active ? 'Activo' : 'Inactivo'}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="p-1.5 rounded-lg text-foreground-muted hover:text-accent hover:bg-accent/10 transition cursor-pointer"
                            title="Editar usuario"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={isToggling || togglingUserId === user.id || user.id === currentUser?.id}
                            className={`p-1.5 rounded-lg transition ${
                              user.id === currentUser?.id
                                ? 'opacity-40 cursor-not-allowed text-foreground-subtle'
                                : user.is_active
                                ? 'text-foreground-muted hover:text-amber-600 hover:bg-amber-500/10 cursor-pointer'
                                : 'text-foreground-muted hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer'
                            }`}
                            title={
                              user.id === currentUser?.id
                                ? 'No puedes inactivar tu propia cuenta'
                                : user.is_active
                                ? 'Inactivar usuario'
                                : 'Activar usuario'
                            }
                          >
                            {togglingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-accent" />
                            ) : (
                              <Power className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(user)}
                            disabled={isDeleting || deletingUserId === user.id || user.id === currentUser?.id}
                            className={`p-1.5 rounded-lg transition ${
                              user.id === currentUser?.id
                                ? 'opacity-40 cursor-not-allowed text-foreground-subtle'
                                : 'text-foreground-muted hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer'
                            }`}
                            title={
                              user.id === currentUser?.id
                                ? 'No puedes eliminar tu propia cuenta'
                                : 'Eliminar usuario'
                            }
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <UserFormModal
        isOpen={isModalOpen}
        userToEdit={userToEdit}
        branches={branches}
        onClose={() => {
          setIsModalOpen(false)
          setUserToEdit(null)
        }}
      />

      <DeleteUserConfirmModal
        isOpen={isDeleteModalOpen}
        user={userToDelete}
        isDeleting={isDeleting || deletingUserId === userToDelete?.id}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setUserToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
