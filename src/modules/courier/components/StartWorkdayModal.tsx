import { useState } from 'react'
import { X, Play, Loader2, Gauge, Banknote } from 'lucide-react'
import { useWorkdayMutations } from '@/modules/workdays/hooks/useWorkday'

interface StartWorkdayModalProps {
  branchId: string
  isOpen: boolean
  onClose: () => void
}

export function StartWorkdayModal({ branchId, isOpen, onClose }: StartWorkdayModalProps) {
  const [initialKm, setInitialKm] = useState<number | ''>('')
  const [initialCash, setInitialCash] = useState<number | ''>(0)
  const [notes, setNotes] = useState<string>('')

  const { startWorkday, isStarting, startError } = useWorkdayMutations()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!initialKm || initialKm <= 0) return

    try {
      await startWorkday({
        branch_id: branchId,
        initial_km: Number(initialKm),
        initial_cash: Number(initialCash || 0),
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error starting workday:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Play className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Iniciar Jornada Laboral</h2>
            <p className="text-xs text-foreground-muted">Registra los datos de inicio para comenzar tus entregas.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-accent" />
              Kilometraje Inicial del Vehículo <span className="text-destructive">*</span>
            </label>
            <input
              type="number"
              required
              min={1}
              placeholder="Ej: 45230"
              value={initialKm}
              onChange={(e) => setInitialKm(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 text-base sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
              <Banknote className="h-4 w-4 text-emerald-500" />
              Fondo Inicial de Efectivo en Caja (C$)
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={initialCash}
              onChange={(e) => setInitialCash(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2.5 text-base sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground-muted mb-1.5">
              Notas / Estado del Vehículo (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Tanque lleno, casco en buen estado..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>

          {startError && (
            <p className="text-xs text-destructive font-medium">
              {(startError as Error).message}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isStarting}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Iniciando Jornada...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  Confirmar e Iniciar Jornada
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
