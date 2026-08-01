import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import type { UserProfileExtended } from '../types/users.types'

interface DeleteUserConfirmModalProps {
  isOpen: boolean
  user: UserProfileExtended | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteUserConfirmModal({
  isOpen,
  user,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteUserConfirmModalProps) {
  const [confirmInput, setConfirmInput] = useState('')
  const [step, setStep] = useState<1 | 2>(1)

  if (!isOpen || !user) return null

  const handleClose = () => {
    setConfirmInput('')
    setStep(1)
    onClose()
  }

  const handleNextStep = () => {
    setStep(2)
  }

  const handleFinalConfirm = async () => {
    if (confirmInput.trim() !== 'ELIMINAR') return
    await onConfirm()
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-rose-500/5">
          <div className="flex items-center gap-2 text-rose-500 font-semibold text-sm">
            <AlertTriangle className="h-5 w-5" />
            <span>Eliminación Permanente de Usuario</span>
          </div>
          <button
            onClick={handleClose}
            disabled={isDeleting}
            className="p-1 rounded-lg text-foreground-muted hover:text-foreground hover:bg-muted transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {step === 1 ? (
            <>
              <div className="bg-muted/40 p-4 rounded-xl border border-border space-y-1">
                <p className="text-xs font-semibold text-foreground">{user.full_name}</p>
                <p className="text-xs font-mono text-foreground-muted">{user.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-500 uppercase">
                  Rol: {user.role}
                </span>
              </div>

              <div className="text-xs text-foreground-muted space-y-2 leading-relaxed">
                <p>
                  ¿Estás seguro de que deseas eliminar permanentemente a este usuario?
                </p>
                <p className="text-rose-500 font-medium">
                  Esta acción no se puede deshacer y borrará su cuenta en el sistema de autenticación.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Continuar a confirmación
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl text-xs text-rose-600 dark:text-rose-400 space-y-1">
                <p className="font-semibold">Confirmación de Seguridad (Paso 2 de 2)</p>
                <p>
                  Para confirmar la eliminación de <strong>{user.full_name}</strong>, escribe exactamente la palabra <strong className="font-mono text-rose-700 dark:text-rose-300">ELIMINAR</strong> a continuación:
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  Confirmación requerida:
                </label>
                <input
                  type="text"
                  placeholder="Escribe ELIMINAR"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  autoFocus
                  disabled={isDeleting}
                  className="w-full px-3 py-2 text-xs bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/50 font-mono tracking-wider text-foreground"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
                >
                  Volver
                </button>
                <button
                  type="button"
                  onClick={handleFinalConfirm}
                  disabled={confirmInput.trim() !== 'ELIMINAR' || isDeleting}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    'Confirmar Eliminación'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
