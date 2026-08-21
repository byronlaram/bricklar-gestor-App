import { useState } from 'react'
import {
  AlertTriangle,
  X,
  RotateCcw,
  Loader2,
  Clock,
  Banknote,
  User,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useVoidCashMovement } from '../hooks/useCashMovements'
import type { DetailedCashMovement } from '../services/workdaysService'
import { useToast } from '@/shared/components/ui'

interface VoidMovementModalProps {
  movement: DetailedCashMovement | null
  isOpen: boolean
  onClose: () => void
}

export function VoidMovementModal({
  movement,
  isOpen,
  onClose,
}: VoidMovementModalProps) {
  const { profile, user } = useAuth()
  const toast = useToast()
  const { mutateAsync: voidMovement, isPending } = useVoidCashMovement()

  const [reason, setReason] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen || !movement) return null

  const courierName =
    movement.courier_profile?.display_name ||
    movement.courier_profile?.full_name ||
    'Motorizado'

  const dateObj = new Date(movement.created_at)
  const timeStr = dateObj.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const dateStr = dateObj.toISOString().slice(0, 10)

  const handleConfirmVoid = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!reason.trim()) {
      setErrorMsg('Debes ingresar el motivo de la anulación.')
      return
    }

    try {
      const adminName =
        profile?.display_name || profile?.full_name || user?.email || 'Administrador'
      const adminId = user?.id || profile?.id || ''

      await voidMovement({
        movementId: movement.id,
        reason: reason.trim(),
        adminId,
        adminName,
      })

      toast.success(
        'Movimiento Anulado',
        `El movimiento de C$ ${Number(movement.amount).toFixed(2)} fue anulado correctamente y registrado en auditoría.`
      )
      setReason('')
      onClose()
    } catch (err: any) {
      console.error('Error al anular movimiento:', err)
      setErrorMsg(err?.message || 'Error al anular el movimiento.')
      toast.error('Error al anular', err?.message || 'No se pudo anular el movimiento.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 relative">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          disabled={isPending}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1 rounded-full hover:bg-slate-100 disabled:opacity-50"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
            <RotateCcw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Anular Entrega / Movimiento de Efectivo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Reverso contable y ajuste de saldo del motorizado
            </p>
          </div>
        </div>

        {/* Alerta de Advertencia */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Acción con impacto en el arqueo de caja</p>
            <p className="text-amber-800 text-2xs mt-0.5">
              Al confirmar, este movimiento quedará anulado, su monto se descontará del dinero en mano del motorizado y se generará un registro inmutable en el Log de Auditoría.
            </p>
          </div>
        </div>

        {/* Resumen del Movimiento a Anular */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              Motorizado:
            </span>
            <span className="font-bold text-slate-900">{courierName}</span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Fecha & Hora:
            </span>
            <span className="font-mono font-medium text-slate-800">
              {dateStr} {timeStr}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Banknote className="h-3.5 w-3.5 text-slate-400" />
              Concepto:
            </span>
            <span className="font-medium text-slate-800 truncate max-w-[240px]">
              {movement.description || movement.movement_type}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="font-extrabold text-slate-900">Monto a Revertir:</span>
            <span className="font-mono text-base font-extrabold text-rose-600">
              C$ {Number(movement.amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Formulario de Anulación */}
        <form onSubmit={handleConfirmVoid} className="space-y-4 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Motivo / Justificación de la Anulación <span className="text-rose-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Error de digitación en el monto, entrega duplicada por error, motorizado no salió a ruta..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 shadow-2xs font-medium resize-none"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isPending}
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isPending || !reason.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Anulando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Confirmar Anulación
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
