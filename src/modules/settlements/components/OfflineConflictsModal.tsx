import React, { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  Button,
  Badge,
  useToast,
} from '@/shared/components/ui'
import { ArrowRight, CheckCircle, ShieldAlert, FileText } from 'lucide-react'
import { formatDate } from '@/shared/utils/format'
import { useOfflineConflicts, type OfflineConflictItem } from '../hooks/useOfflineConflicts'

interface OfflineConflictsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const OfflineConflictsModal: React.FC<OfflineConflictsModalProps> = ({ isOpen, onClose }) => {
  const { unresolvedConflicts, resolveConflict, isResolving } = useOfflineConflicts()
  const { success, error: toastError } = useToast()
  const [selectedConflict, setSelectedConflict] = useState<OfflineConflictItem | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('0')
  const [resolutionNotes, setResolutionNotes] = useState<string>('')

  const handleSelect = (item: OfflineConflictItem) => {
    setSelectedConflict(item)
    // Extraer montos sugeridos si vienen en el payload
    const payload = item.changes?.payload
    if (payload?.settlementData?.difference) {
      setAdjustmentAmount(String(payload.settlementData.difference))
    } else if (payload?.amount) {
      setAdjustmentAmount(String(payload.amount))
    } else {
      setAdjustmentAmount('0')
    }
    setResolutionNotes(`Ajuste por datos offline sincronizados tardíamente (${item.changes?.action_type || 'Desconocido'})`)
  }

  const handleResolve = async () => {
    if (!selectedConflict) return
    try {
      const amt = parseFloat(adjustmentAmount) || 0
      const entityId = selectedConflict.entity_id || undefined

      await resolveConflict({
        conflictId: selectedConflict.id,
        settlementId: selectedConflict.entity_type === 'settlement' ? entityId : undefined,
        adjustmentAmount: amt !== 0 ? amt : undefined,
        reason: resolutionNotes.trim() || 'Conflicto revisado y archivado por administración.',
      })

      success('Conflicto resuelto', 'Se registró el ajuste y se archivó la incidencia correctamente.')
      setSelectedConflict(null)
      if (unresolvedConflicts.length <= 1) {
        onClose()
      }
    } catch (err) {
      toastError('Error al resolver conflicto', (err as Error).message)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="xl">
        <ModalHeader onClose={onClose}>
          <ModalTitle>Conflictos de Sincronización Offline</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl p-4">
              <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-950 space-y-1">
                <p className="font-bold text-sm">Auditoría de Acciones Desfasadas</p>
                <p>
                  Estos registros representan acciones enviadas por dispositivos que estuvieron sin señal mientras la jornada
                  o liquidación ya había sido cerrada o aprobada por el administrador. Revisa los datos rescatados para aplicar
                  un ajuste si corresponde.
                </p>
              </div>
            </div>

            {unresolvedConflicts.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold">No hay conflictos pendientes de revisión</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Lista de conflictos */}
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {unresolvedConflicts.map((item) => {
                    const isSelected = selectedConflict?.id === item.id
                    const courierName = item.actor_profile?.display_name || item.actor_profile?.full_name || 'Motorizado'
                    const actionType = item.changes?.action_type || 'ACCIÓN_OFFLINE'
                    const failedAt = item.changes?.failed_at || item.created_at

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50/50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="text-xs font-bold text-slate-900">👤 {courierName}</span>
                          <Badge variant="urgent" size="sm">
                            {actionType}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 font-mono">
                          {item.changes?.error || item.changes?.reason || 'Conflicto por cierre previo'}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>{formatDate(failedAt)}</span>
                          <span className="font-semibold text-rose-600 flex items-center gap-1">
                            Ver detalles <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Panel de resolución y datos rescatados */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between">
                  {selectedConflict ? (
                    <div className="space-y-4">
                      <div className="border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Datos Rescatados del Dispositivo
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Tipo: <span className="font-mono font-semibold">{selectedConflict.changes?.action_type}</span>
                        </p>
                      </div>

                      {/* Payload visualizer */}
                      <div className="bg-slate-900 text-slate-100 rounded-xl p-3 text-[11px] font-mono max-h-48 overflow-y-auto">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(selectedConflict.changes?.payload, null, 2)}
                        </pre>
                      </div>

                      {/* Formulario de ajuste */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Monto de Ajuste Financiero (C$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={adjustmentAmount}
                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                            placeholder="0.00 (positivo para ingreso / negativo para faltante)"
                            className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                          />
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Dejar en 0 si solo se va a archivar sin alterar el saldo contable.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nota de Reconciliación / Justificación
                          </label>
                          <textarea
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            rows={2}
                            placeholder="Explicación del ajuste o motivo de descarte..."
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white resize-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                          isLoading={isResolving}
                          onClick={handleResolve}
                        >
                          Aplicar Ajuste y Marcar Resuelto
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12 text-slate-400">
                      <FileText className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-xs">Selecciona un conflicto de la lista para ver su carga útil y conciliarlo.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
