import { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Calculator } from 'lucide-react'
import type { Settlement } from '../types/settlements.types'
import { useSettlementMutations } from '../hooks/useSettlements'
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

interface ApproveSettlementModalProps {
  settlement: Settlement | null
  isOpen: boolean
  onClose: () => void
}

export function ApproveSettlementModal({ settlement, isOpen, onClose }: ApproveSettlementModalProps) {
  const [actualCash, setActualCash] = useState<number | ''>('')
  const [actualTransfers, setActualTransfers] = useState<number | ''>('')
  const [notes, setNotes] = useState<string>('')

  const { approveSettlement, isApproving, approveError } = useSettlementMutations()

  useEffect(() => {
    if (settlement) {
      setActualCash(settlement.actual_cash ?? settlement.expected_cash)
      setActualTransfers(settlement.actual_transfers ?? settlement.expected_transfers)
      setNotes(settlement.notes || '')
    }
  }, [settlement])

  if (!settlement) return null

  const numericCash = Number(actualCash || 0)
  const diff = numericCash - settlement.expected_cash

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await approveSettlement({
        settlement_id: settlement.id,
        actual_cash: numericCash,
        actual_transfers: Number(actualTransfers || 0),
        notes: notes.trim() || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error approving settlement:', err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="md">
        <ModalHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle>Arqueo y Cierre de Liquidación</ModalTitle>
              <ModalDescription>
                Motorizado: {settlement.courier_profile?.display_name || settlement.courier_profile?.full_name}
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            {/* Resumen de Arqueo */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Efectivo Cobrado Esperado:</span>
                <span className="font-bold text-slate-900">C$ {(settlement.expected_cash ?? 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Gastos de Ruta Registrados:</span>
                <span className="font-semibold text-amber-600">
                  - C$ {(settlement.total_expenses ?? 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-bold">
                <span className="text-slate-900">Efectivo Neto a Recibir en Caja:</span>
                <span className="text-emerald-600">
                  C$ {((settlement.expected_cash ?? 0) - (settlement.total_expenses ?? 0)).toFixed(2)}
                </span>
              </div>
            </div>

            <Input
              label="Efectivo Entregado Físicamente (C$)"
              type="number"
              step="0.01"
              required
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value ? Number(e.target.value) : '')}
            />

            {/* Alert de Diferencia */}
            {diff !== 0 && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
                  diff > 0
                    ? 'bg-sky-50 text-sky-800 border-sky-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {diff > 0
                    ? `Sobrante detectado en caja: +C$ ${diff.toFixed(2)}`
                    : `Faltante detectado en caja: -C$ ${Math.abs(diff).toFixed(2)}`}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Observaciones del Administrador
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles sobre el cuadre o resolución de faltantes/sobrantes..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs resize-none"
              />
            </div>

            {approveError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {(approveError as Error).message}
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
              isLoading={isApproving}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            >
              Aprobar y Cerrar Liquidación
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
