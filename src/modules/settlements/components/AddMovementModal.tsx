import { useState } from 'react'
import { DollarSign, Plus } from 'lucide-react'
import { useSettlementMutations } from '../hooks/useSettlements'
import type { MovementType, PaymentMethod, Currency } from '@/shared/types'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from '@/shared/components/ui'

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
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="md">
        <ModalHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle>Registrar Gasto / Egreso</ModalTitle>
              <ModalDescription>Registra desembolsos realizados en ruta.</ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalBody className="space-y-4 overflow-y-auto flex-1 p-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Tipo de Gasto <span className="text-rose-600">*</span>
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as MovementType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
              >
                <option value="fuel">⛽ Combustible / Gasolina</option>
                <option value="purchase">🛒 Compra de Encargo</option>
                <option value="shipment_fee">📦 Envío / Encomienda de Bus</option>
                <option value="other_expense">📝 Otro Gasto / Viático</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Monto Gastado"
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Moneda</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
                >
                  <option value="NIO">Córdobas (C$)</option>
                  <option value="USD">Dólares (US$)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Descripción del Gasto <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Gasolina en Gasolinera Uno, factura N° 4589"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs resize-none"
              />
            </div>

            {movementError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {(movementError as Error).message}
              </p>
            )}
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isAddingMovement}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="bg-amber-600 hover:bg-amber-700 text-white border-transparent"
            >
              Guardar Gasto
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
