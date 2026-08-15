import { useState } from 'react'
import { X, AlertTriangle, Loader2 } from 'lucide-react'
import type { TaskWithCourier } from '../types/task.types'

interface RejectTaskModalProps {
  task: TaskWithCourier | null
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  isLoading?: boolean
}

export function RejectTaskModal({
  task,
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: RejectTaskModalProps) {
  const [reason, setReason] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen || !task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!reason.trim()) {
      setError('Debes especificar un motivo para el rechazo.')
      return
    }

    try {
      await onConfirm(reason.trim())
      setReason('')
      onClose()
    } catch (err: unknown) {
      console.error(err)
      setError((err as Error)?.message || 'Error al rechazar la gestión.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#0A2540] dark:text-white">Rechazar Gestión</h2>
            <p className="text-xs text-slate-500 font-mono">{task.code} — {task.title}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#0A2540] dark:text-slate-300">
              Motivo del Rechazo <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explica el motivo por el cual no se aprueba esta gestión..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-xs font-medium rounded-2xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 rounded-full bg-rose-600 text-white text-xs font-extrabold shadow-md hover:bg-rose-700 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <span>Confirmar Rechazo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
