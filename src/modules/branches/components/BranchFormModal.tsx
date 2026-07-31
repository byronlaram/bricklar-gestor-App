import { useState, useEffect } from 'react'
import { X, Building, Edit3, Loader2 } from 'lucide-react'
import type { Branch } from '../types/branches.types'
import { useBranchMutations } from '../hooks/useBranches'

interface BranchFormModalProps {
  branchToEdit?: Branch | null
  isOpen: boolean
  onClose: () => void
}

export function BranchFormModal({ branchToEdit, isOpen, onClose }: BranchFormModalProps) {
  const isEditing = !!branchToEdit

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  const { createBranch, updateBranch, isCreating, isUpdating, createError, updateError } =
    useBranchMutations()

  useEffect(() => {
    if (branchToEdit) {
      setCode(branchToEdit.code)
      setName(branchToEdit.name)
      setAddress(branchToEdit.address || '')
      setPhone(branchToEdit.phone || '')
    } else {
      setCode('')
      setName('')
      setAddress('')
      setPhone('')
    }
  }, [branchToEdit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEditing && branchToEdit) {
        await updateBranch({
          id: branchToEdit.id,
          payload: {
            code,
            name,
            address: address || undefined,
            phone: phone || undefined,
          },
        })
      } else {
        await createBranch({
          code,
          name,
          address: address || undefined,
          phone: phone || undefined,
        })
      }
      onClose()
    } catch (err) {
      console.error('Error saving branch:', err)
    }
  }

  const isLoading = isCreating || isUpdating
  const errorMessage = (createError || updateError) as Error | null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
            {isEditing ? <Edit3 className="h-5 w-5" /> : <Building className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isEditing ? `Editar Sucursal — ${branchToEdit.code}` : 'Nueva Sucursal'}
            </h2>
            <p className="text-xs text-foreground-muted">
              {isEditing
                ? 'Modifique el código, nombre o contacto.'
                : 'Cree una nueva sede operativa del sistema.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Código <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="MGA"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground uppercase"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">
                Nombre de la Sucursal <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Sucursal Central Managua"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Dirección Completa
            </label>
            <input
              type="text"
              placeholder="Ej: Altamira, de la iglesia 2c al sur"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Teléfono</label>
            <input
              type="text"
              placeholder="Ej: 2278-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
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
                'Crear Sucursal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
