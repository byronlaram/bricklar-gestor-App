import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, AlertTriangle, Calculator, Info, FileCheck, CreditCard, Receipt } from 'lucide-react'
import type { Settlement } from '../types/settlements.types'
import { useSettlementMutations } from '../hooks/useSettlements'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
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
  const [adjustmentReasonType, setAdjustmentReasonType] = useState<string>('')
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const { approveSettlement, isApproving, approveError } = useSettlementMutations()

  const { data: tasksData } = useTasks({
    courier_id: settlement?.courier_id,
    date: settlement?.settlement_date,
    page_size: 100,
  })

  const completedTasks = useMemo(
    () => (tasksData?.data || []).filter((t) => t.status === 'completed'),
    [tasksData?.data]
  )

  const chequesList = useMemo(() => {
    const list: Array<{ taskId: string; taskCode: string; client: string; amount: number; bank: string; chequeNumber: string }> = []
    completedTasks.forEach((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (pb?.cheque_amount && pb.cheque_amount > 0) {
        list.push({
          taskId: t.id,
          taskCode: t.code,
          client: t.contact_name || t.title,
          amount: pb.cheque_amount,
          bank: pb.cheque_bank || 'Banco emisor',
          chequeNumber: pb.cheque_number || 'S/N',
        })
      }
    })
    return list
  }, [completedTasks])

  const transfersList = useMemo(() => {
    const list: Array<{ taskId: string; taskCode: string; client: string; amount: number; bank: string; reference: string }> = []
    completedTasks.forEach((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (pb?.transfer_amount && pb.transfer_amount > 0) {
        list.push({
          taskId: t.id,
          taskCode: t.code,
          client: t.contact_name || t.title,
          amount: pb.transfer_amount,
          bank: pb.transfer_bank || 'Banpro / Lafise',
          reference: pb.transfer_reference || '',
        })
      } else if (t.requires_collection && (t.expected_payment_method === 'bank_transfer' || t.expected_payment_method === 'mobile_wallet') && (!pb || !pb.cash_amount)) {
        list.push({
          taskId: t.id,
          taskCode: t.code,
          client: t.contact_name || t.title,
          amount: t.expected_collection_amount || 0,
          bank: 'Transferencia Bancaria',
          reference: '',
        })
      }
    })
    return list
  }, [completedTasks])

  const invoicesList = useMemo(() => {
    const list: Array<{ taskId: string; taskCode: string; title: string; amount: number; invoiceNumber?: string }> = []
    completedTasks.forEach((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown
      if (t.requires_payment) {
        const amt = pb?.actual_paid_amount ?? t.expected_payment_amount ?? 0
        if (amt > 0) {
          list.push({
            taskId: t.id,
            taskCode: t.code,
            title: t.title,
            amount: amt,
            invoiceNumber: pb?.invoice_number,
          })
        }
      }
    })
    return list
  }, [completedTasks])

  const liveExpectedCash = useMemo(() => {
    if (!settlement) return 0
    return settlement.cash_summary
      ? Math.max(0, settlement.cash_summary.cashInHandNIO)
      : (settlement.expected_cash ?? 0)
  }, [settlement])

  useEffect(() => {
    if (settlement) {
      const exp = settlement.cash_summary
        ? Math.max(0, settlement.cash_summary.cashInHandNIO)
        : (settlement.expected_cash ?? 0)
      // Si la liquidación está pendiente de revisión y actual_cash coincidía con el borrador anterior, pre-cargar con el esperado en vivo
      const initialCash =
        settlement.status === 'approved'
          ? (settlement.actual_cash ?? exp)
          : (settlement.actual_cash === settlement.expected_cash || !settlement.actual_cash ? exp : settlement.actual_cash)
      setActualCash(initialCash)
      setActualTransfers(settlement.actual_transfers ?? settlement.expected_transfers)
      setNotes(settlement.notes || '')
      setAdjustmentReasonType('')
      setAdjustmentNotes('')
    }
  }, [settlement])

  if (!settlement) return null

  const numericCash = Number(actualCash || 0)
  const diff = numericCash - liveExpectedCash
  const hasDiff = Math.abs(diff) > 0.001

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasDiff && !adjustmentReasonType) {
      return
    }

    try {
      await approveSettlement({
        settlement_id: settlement.id,
        actual_cash: numericCash,
        actual_transfers: Number(actualTransfers || 0),
        notes: notes.trim() || undefined,
        adjustment_reason_type: hasDiff ? adjustmentReasonType : undefined,
        adjustment_notes: hasDiff ? adjustmentNotes.trim() : undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error approving settlement:', err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false}>
      <ModalContent size="lg">
        <ModalHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle>Arqueo y Cierre de Liquidación</ModalTitle>
              <ModalDescription>
                Motorizado: {settlement.courier_profile?.display_name || settlement.courier_profile?.full_name} ({settlement.settlement_date})
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalBody className="space-y-4 overflow-y-auto flex-1 p-6">
            {/* Resumen de Arqueo Completo */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">💼 Fondo Inicial / Adelantos (+):</span>
                <span className="font-bold text-slate-900 font-mono">
                  C$ {(settlement.cash_summary?.initialCashNIO ?? 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium">💵 Cobros en Efectivo de Tareas (+):</span>
                <span className="font-bold text-emerald-700 font-mono">
                  + C$ {(settlement.cash_summary?.collectionsNIO ?? settlement.expected_cash).toFixed(2)}
                </span>
              </div>

              {(settlement.cash_summary?.expensesNIO ?? settlement.total_expenses ?? 0) > 0 && (
                <div className="flex justify-between items-center text-rose-700">
                  <span className="font-medium">📦 Gastos / Pagos de Ruta Realizados (-):</span>
                  <span className="font-semibold font-mono">
                    - C$ {(settlement.cash_summary?.expensesNIO ?? settlement.total_expenses ?? 0).toFixed(2)}
                  </span>
                </div>
              )}

              {(settlement.cash_summary?.alreadyReceivedNIO ?? 0) > 0 && (
                <div className="flex justify-between items-center text-sky-800">
                  <span className="font-medium">🏢 Entregas Parciales Previas a Caja (-):</span>
                  <span className="font-semibold font-mono">
                    - C$ {(settlement.cash_summary?.alreadyReceivedNIO ?? 0).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 font-extrabold text-sm">
                <span className="text-slate-900">Saldo Neto de Efectivo a Recibir en Ventanilla (=):</span>
                <span className="text-emerald-700 font-mono">
                  C$ {liveExpectedCash.toFixed(2)}
                </span>
              </div>
            </div>

            {/* 📑 SECCIÓN AUDITORÍA DE CHEQUES, TRANSFERENCIAS Y FACTURAS */}
            {(chequesList.length > 0 || transfersList.length > 0 || invoicesList.length > 0) && (
              <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3 text-xs">
                <span className="font-extrabold text-purple-950 flex items-center gap-1.5 uppercase tracking-wider text-2xs">
                  <FileCheck className="h-4 w-4 text-purple-700" />
                  Comprobantes y Documentos Físicos a Recibir / Auditar
                </span>

                {/* Cheques */}
                {chequesList.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 flex items-center gap-1 text-2xs uppercase">
                        <FileCheck className="h-3 w-3 text-purple-600" />
                        Cheques Físicos ({chequesList.length}):
                      </span>
                      <span className="font-mono font-bold text-purple-800 text-2xs">
                        Total: C$ {chequesList.reduce((acc, c) => acc + c.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    {chequesList.map((ck, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-xl border border-purple-100">
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">
                            No. CK: {ck.chequeNumber} — {ck.bank}
                          </span>
                          <span className="text-2xs text-slate-500">{ck.taskCode} ({ck.client})</span>
                        </div>
                        <span className="font-mono font-bold text-purple-900">
                          C$ {ck.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Transferencias */}
                {transfersList.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-purple-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 flex items-center gap-1 text-2xs uppercase">
                        <CreditCard className="h-3 w-3 text-sky-600" />
                        Transferencias Registradas ({transfersList.length}):
                      </span>
                      <span className="font-mono font-bold text-sky-800 text-2xs">
                        Total: C$ {transfersList.reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    {transfersList.map((tr, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-xl border border-sky-100">
                        <div>
                          <span className="font-medium text-slate-900 block">
                            {tr.bank} {tr.reference ? `(Ref: ${tr.reference})` : ''}
                          </span>
                          <span className="text-2xs text-slate-500">{tr.taskCode} ({tr.client})</span>
                        </div>
                        <span className="font-mono font-bold text-sky-900">
                          C$ {tr.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Facturas */}
                {invoicesList.length > 0 && (
                  <div className="space-y-1.5 pt-1.5 border-t border-purple-100">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 flex items-center gap-1 text-2xs uppercase">
                        <Receipt className="h-3 w-3 text-amber-600" />
                        Facturas / Recibos de Compras ({invoicesList.length}):
                      </span>
                    </div>
                    {invoicesList.map((inv, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-white rounded-xl border border-amber-100">
                        <div>
                          <span className="font-mono font-bold text-slate-900 block">
                            {inv.invoiceNumber ? `Factura/Ticket: ${inv.invoiceNumber}` : 'Sin No. de factura'}
                          </span>
                          <span className="text-2xs text-slate-500">{inv.taskCode} — {inv.title}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-900">
                          C$ {inv.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Input
              label="Efectivo Entregado Físicamente (C$)"
              type="number"
              step="0.01"
              required
              value={actualCash}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : ''
                setActualCash(val)
                if (typeof val === 'number') {
                  const newDiff = val - liveExpectedCash
                  if (newDiff < 0 && !adjustmentReasonType) {
                    setAdjustmentReasonType('faltante_descuento_nomina')
                  } else if (newDiff > 0 && !adjustmentReasonType) {
                    setAdjustmentReasonType('sobrante_propina')
                  }
                }
              }}
            />

            {/* Sección de Ajuste de Liquidación cuando hay diferencia */}
            {hasDiff && (
              <div className="space-y-3 p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs animate-fade-in">
                <div
                  className={`p-2.5 rounded-lg border flex items-center gap-2 font-semibold ${
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

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-800">
                    Tipo de Declaración de Ajuste <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adjustmentReasonType}
                    onChange={(e) => setAdjustmentReasonType(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
                  >
                    <option value="">Selecciona el motivo del ajuste...</option>
                    {diff < 0 ? (
                      <>
                        <option value="faltante_descuento_nomina">
                          Faltante — A deducir en nómina quincenal
                        </option>
                        <option value="faltante_reponer_manana">
                          Faltante — A reponer por el motorizado en siguiente turno
                        </option>
                        <option value="redondeo_cambio">
                          Diferencia por redondeo o vuelto menor
                        </option>
                        <option value="otro">Otro motivo justificado</option>
                      </>
                    ) : (
                      <>
                        <option value="sobrante_propina">
                          Sobrante — Propina o cambio no reclamado
                        </option>
                        <option value="redondeo_cambio">
                          Diferencia por redondeo a favor
                        </option>
                        <option value="otro">Otro motivo justificado</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-800">
                    Justificación del Ajuste
                  </label>
                  <input
                    type="text"
                    value={adjustmentNotes}
                    onChange={(e) => setAdjustmentNotes(e.target.value)}
                    placeholder="Ej. Error en cobro a cliente #123, acordado con motorizado..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs"
                  />
                </div>

                <div className="flex items-start gap-2 text-2xs text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200">
                  <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                  <span>
                    La jornada del motorizado quedará <strong>cuadrada en C$ 0.00</strong>. Este ajuste quedará registrado en auditoría y en el Reporte de Faltantes y Sobrantes.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Observaciones Generales de la Liquidación
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observaciones adicionales sobre la jornada o comprobantes..."
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
              disabled={hasDiff && !adjustmentReasonType}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            >
              {hasDiff ? 'Aprobar y Registrar Ajuste' : 'Aprobar y Cerrar Liquidación'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
