import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  PhoneOff,
  CheckCircle2,
  Info,
  Building2,
  Calendar,
  User,
} from 'lucide-react'
import type { Workday } from '@/modules/workdays/types/workdays.types'
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

interface AdminForceSettlementModalProps {
  workday: Workday | null
  isOpen: boolean
  onClose: () => void
}

export function AdminForceSettlementModal({
  workday,
  isOpen,
  onClose,
}: AdminForceSettlementModalProps) {
  const [actualCash, setActualCash] = useState<number | ''>('')
  const [actualTransfers, setActualTransfers] = useState<number | ''>('')
  const [contingencyReason, setContingencyReason] = useState<string>('telefono_danado_apagado')
  const [contingencyNotes, setContingencyNotes] = useState<string>('')
  const [adjustmentReasonType, setAdjustmentReasonType] = useState<string>('')
  const [adjustmentNotes, setAdjustmentNotes] = useState<string>('')

  const { forceSettlement, isForcingSettlement, forceSettlementError } = useSettlementMutations()

  const summary = workday?.cash_summary
  const expectedCash = summary?.cashInHandNIO ?? workday?.initial_cash ?? 0

  useEffect(() => {
    if (workday) {
      const liveExpected = summary?.cashInHandNIO ?? workday?.initial_cash ?? 0
      setActualCash(liveExpected)
      setActualTransfers(summary?.collectionsUSD ?? 0)
      setContingencyReason('telefono_danado_apagado')
      setContingencyNotes('')
      setAdjustmentReasonType('')
      setAdjustmentNotes('')
    }
  }, [workday, summary])

  if (!workday) return null

  const numericCash = Number(actualCash || 0)
  const diff = numericCash - expectedCash
  const hasDiff = Math.abs(diff) > 0.001

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (hasDiff && !adjustmentReasonType) {
      return
    }

    try {
      await forceSettlement({
        workday_id: workday.id,
        actual_cash: numericCash,
        actual_transfers: Number(actualTransfers || 0),
        contingency_reason: contingencyReason,
        contingency_notes: contingencyNotes.trim() || undefined,
        adjustment_reason_type: hasDiff ? adjustmentReasonType : undefined,
        adjustment_notes: hasDiff ? adjustmentNotes.trim() : undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error forcing settlement:', err)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdropClick={false}>
      <ModalContent size="md">
        <ModalHeader onClose={onClose}>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <PhoneOff className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle>Liquidación Administrativa por Contingencia</ModalTitle>
              <ModalDescription>
                Cierre forzado y recepción de valores para motorizado sin acceso a la aplicación.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            {/* Tarjeta de Información de Jornada */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Motorizado:
                </span>
                <span className="font-bold text-slate-900">
                  {workday.courier_profile?.display_name || workday.courier_profile?.full_name || 'Motorizado'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-700">
                <span className="font-medium flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Fecha de Jornada:
                </span>
                <span className="font-semibold text-slate-900 font-mono">{workday.work_date}</span>
              </div>

              {workday.branch && (
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    Sucursal:
                  </span>
                  <span className="font-medium text-slate-800">{workday.branch.name}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-900">Efectivo Calculado en Mano:</span>
                <span className="font-mono text-emerald-700 font-extrabold text-sm">
                  C$ {expectedCash.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Motivo de Contingencia */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Motivo de la Contingencia <span className="text-rose-500">*</span>
              </label>
              <select
                value={contingencyReason}
                onChange={(e) => setContingencyReason(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
              >
                <option value="telefono_danado_apagado">
                  📱 Celular de motorizado dañado o apagado / sin batería
                </option>
                <option value="sin_senal_datos">
                  📶 Sin cobertura de red / problemas de datos móviles
                </option>
                <option value="extravio_robo">
                  🚨 Extravío o robo de equipo celular
                </option>
                <option value="entrega_directa_oficina">
                  🏢 Entrega física directa de valores en oficina central
                </option>
                <option value="otro">📝 Otro motivo operativo justificado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Detalles u Observaciones de la Contingencia
              </label>
              <input
                type="text"
                value={contingencyNotes}
                onChange={(e) => setContingencyNotes(e.target.value)}
                placeholder="Ej. Motorizado reportó que se apagó el teléfono a las 5pm, entregó dinero en mano..."
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs"
              />
            </div>

            {/* Monto de Efectivo Físico */}
            <Input
              label="Efectivo Recibido Físicamente por Administración (C$)"
              type="number"
              step="0.01"
              required
              value={actualCash}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : ''
                setActualCash(val)
                if (typeof val === 'number') {
                  const newDiff = val - expectedCash
                  if (newDiff < 0 && !adjustmentReasonType) {
                    setAdjustmentReasonType('faltante_descuento_nomina')
                  } else if (newDiff > 0 && !adjustmentReasonType) {
                    setAdjustmentReasonType('sobrante_propina')
                  }
                }
              }}
            />

            {/* Sección de Ajuste si hay diferencia */}
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
                    placeholder="Ej. Acordado con motorizado al entregar en ventanilla..."
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs"
                  />
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 text-2xs text-slate-600 bg-amber-50/50 p-2.5 rounded-lg border border-amber-200/80">
              <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Esta acción creará y aprobará la liquidación de forma inmediata, pasando la jornada a estado <strong>Cerrada</strong> con registro en auditoría.
              </span>
            </div>

            {forceSettlementError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {(forceSettlementError as Error).message}
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
              isLoading={isForcingSettlement}
              disabled={hasDiff && !adjustmentReasonType}
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent font-bold"
            >
              Procesar Liquidación Administrativa
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
