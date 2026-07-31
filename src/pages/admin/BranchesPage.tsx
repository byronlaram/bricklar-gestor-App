import { useState } from 'react'
import {
  Building,
  Plus,
  Edit3,
  Power,
  Loader2,
  MapPin,
  Phone,
  Hash,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useBranches, useBranchMutations } from '@/modules/branches/hooks/useBranches'
import { BranchFormModal } from '@/modules/branches/components/BranchFormModal'
import type { Branch } from '@/modules/branches/types/branches.types'

export default function BranchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null)

  const { data: branches = [], isLoading } = useBranches()
  const { toggleBranchStatus, isToggling } = useBranchMutations()

  const handleEdit = (branch: Branch) => {
    setBranchToEdit(branch)
    setIsModalOpen(true)
  }

  const handleNew = () => {
    setBranchToEdit(null)
    setIsModalOpen(true)
  }

  const handleToggle = async (branch: Branch) => {
    if (!window.confirm(`¿${branch.is_active ? 'Desactivar' : 'Activar'} la sucursal "${branch.name}"?`)) return
    await toggleBranchStatus({ id: branch.id, isActive: !branch.is_active })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Sucursales</h1>
          <p className="text-xs text-foreground-muted">
            Administración de sedes operativas del sistema.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-accent hover:bg-accent/90 rounded-xl shadow-md transition cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nueva Sucursal
        </button>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-xs">Cargando sucursales...</p>
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-foreground-muted">
          <Building className="h-10 w-10 opacity-30" />
          <p className="text-sm">Aún no hay sucursales registradas.</p>
          <button
            onClick={handleNew}
            className="mt-1 text-xs text-accent hover:underline cursor-pointer"
          >
            Crear la primera sucursal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`bg-card border rounded-2xl p-5 shadow-xs space-y-3 transition-all ${
                branch.is_active
                  ? 'border-border hover:shadow-md'
                  : 'border-border/40 opacity-60'
              }`}
            >
              {/* Badge de código + estado */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="bg-accent/10 text-accent border border-accent/20 px-2.5 py-1 rounded-lg text-sm font-black font-mono tracking-widest">
                    {branch.code}
                  </span>
                  {branch.is_active ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                      <XCircle className="h-3.5 w-3.5" />
                      Inactiva
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleEdit(branch)}
                    className="p-1.5 rounded-lg text-foreground-muted hover:text-accent hover:bg-accent/10 transition cursor-pointer"
                    title="Editar sucursal"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(branch)}
                    disabled={isToggling}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      branch.is_active
                        ? 'text-foreground-muted hover:text-destructive hover:bg-destructive/10'
                        : 'text-foreground-muted hover:text-emerald-600 hover:bg-emerald-500/10'
                    }`}
                    title={branch.is_active ? 'Desactivar' : 'Activar'}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Nombre */}
              <div>
                <p className="font-semibold text-sm text-foreground">{branch.name}</p>
              </div>

              {/* Información de contacto */}
              <div className="space-y-1.5 pt-2 border-t border-border/40">
                {branch.address && (
                  <div className="flex items-start gap-2 text-foreground-muted">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-foreground-subtle" />
                    <span className="text-[11px]">{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-foreground-subtle" />
                    <span className="text-[11px] font-mono">{branch.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-foreground-subtle">
                  <Hash className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-[10px] font-mono">{branch.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <BranchFormModal
        isOpen={isModalOpen}
        branchToEdit={branchToEdit}
        onClose={() => {
          setIsModalOpen(false)
          setBranchToEdit(null)
        }}
      />
    </div>
  )
}
