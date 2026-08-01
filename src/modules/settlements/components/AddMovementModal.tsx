import { useState } from 'react'
import { X, DollarSign, Plus, Loader2 } from 'lucide-react'
import { useSettlementMutations } from '../hooks/useSettlements'
import type { MovementType, PaymentMethod, Currency } from '@/shared/types'

interface AddMovementModalProps {
  workdayId: string
  isOpen: boolean
  onClose: () => void
}

export function AddMovementModal({ workdayId, isOpen, onClose }: AddMovementModalProps) {
  const [movementType, setMovementType] = useState<MovementType>('fuel')
  const [amount, setAmount] = useState<number | ''>('')
  const [description, setDescription] = useState<string>('')
  const [paymentMethod] = useState<PaymentMethod>('cash')
  const [currency, setCurrency] = useState<Currency>('NIO')

  const { addMovement, isAddingMovement, movementError } = useSettlementMutations()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || amount <= 0 || !description.trim()) return

    try {
      await addMovement({
        workday_id: workdayId,
        movement_type: movementType,
        direction: 'expense',
        amount: Number(amount),
        currency,
        payment_method: paymentMethod,
        description: description.trim(),
      })
      onClose()
    } catch (err) {
      console.error('Error adding cash movement:', err)
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
          <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Registrar Gasto / Egreso</h2>
            <p className="text-xs text-foreground-muted">Registra desembolsos realizados durante la ruta.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Tipo de Gasto <span className="text-destructive">*</span>
            </label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as MovementType)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            >
              <option value="fuel">⛽ Combustible / Gasolina</option>
              <option value="purchase">🛒 Compra de Encargo</option>
              <option value="shipment_fee">📦 Envío / Encomienda de Bus</option>
              <option value="other_expense">📝 Otro Gasto / Viático</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Monto Gastado <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              >
                <option value="NIO">Córdobas (C$)</option>
                <option value="USD">Dólares (US$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Descripción del Gasto <span className="text-destructive">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Gasolina en Gasolinera Uno, factura N° 4589"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>

          {movementError && (
            <p className="text-xs text-destructive font-medium">
              {(movementError as Error).message}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isAddingMovement}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isAddingMovement ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Guardar Gasto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
