import { useState, useEffect } from 'react'
import { CalendarClock, Loader2, Info, User, Calendar, MapPin, DollarSign } from 'lucide-react'
import type { TaskWithCourier } from '../types/task.types'
import { useCouriers } from '../hooks/useCouriers'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { getLocalDateString } from '@/shared/utils/date'
import { formatDate } from '@/shared/utils/format'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Button,
  useToast,
} from '@/shared/components/ui'

interface RescheduleTaskModalProps {
  task: TaskWithCourier | null
  isOpen: boolean
  onClose: () => void
  onSuccess?: (newTaskId: string) => void
}

export function RescheduleTaskModal({
  task,
  isOpen,
  onClose,
  onSuccess,
}: RescheduleTaskModalProps) {
  const toast = useToast()
  const todayStr = getLocalDateString()

  const [newDate, setNewDate] = useState<string>(todayStr)
  const [selectedCourierId, setSelectedCourierId] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const { data: couriers = [], isLoading: isLoadingCouriers } = useCouriers(task?.branch_id)
  const { rescheduleTask, isRescheduling, rescheduleError } = useTaskMutations()

  useEffect(() => {
    if (task) {
      setNewDate(todayStr)
      setSelectedCourierId(task.assigned_courier_id || '')
      setReason('')
    }
  }, [task, todayStr])

  if (!task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDate) {
      toast.warning('Fecha requerida', 'Por favor selecciona la nueva fecha para la tarea.')
      return
    }

    if (!reason.trim()) {
      toast.warning('Motivo requerido', 'Por favor ingresa una breve justificación o motivo de la reprogramación.')
      return
    }

    try {
      const result = await rescheduleTask({
        original_task_id: task.id,
        new_date: newDate,
        assigned_courier_id: selectedCourierId || null,
        reason: reason.trim(),
      })

      toast.success(
        'Tarea Reprogramada con Éxito',
        `Se creó la nueva tarea ${result.newTask.code} para el ${newDate} en estado ${result.newTask.assigned_courier_id ? 'Asignada' : 'Pendiente'}.`
      )

      onClose()
      if (onSuccess) {
        onSuccess(result.newTask.id)
      }
    } catch (err: unknown) {
      console.error('[RescheduleTaskModal] Error:', err)
      toast.error(
        'Error al reprogramar',
        (err as Error)?.message || 'No fue posible reprogramar la tarea. Intenta nuevamente.'
      )
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="md">
        <ModalHeader onClose={onClose}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-100 text-orange-700">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle>Reprogramar Tarea</ModalTitle>
              <ModalDescription>
                Tarea {task.code}: {task.title}
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <ModalBody className="space-y-4 overflow-y-auto flex-1 min-h-0 p-4 sm:p-5">
            {/* Tarjeta Resumen de la Tarea Original */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Fecha Original: <strong className="text-slate-800">{formatDate(task.scheduled_date)}</strong></span>
                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                  {task.status === 'not_completed' ? 'No Completada' : task.status}
                </span>
              </div>

              {(task.contact_name || task.institution_name || task.provider_name) && (
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <User className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>{task.contact_name || task.institution_name || task.provider_name}</span>
                </div>
              )}

              {task.address && (
                <div className="flex items-start gap-1.5 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{task.address}</span>
                </div>
              )}

              {(task.requires_collection || task.requires_payment) && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 font-semibold">
                  {task.requires_collection && (
                    <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <DollarSign className="h-3 w-3" /> Cobro: C$ {(task.expected_collection_amount || 0).toFixed(2)}
                    </span>
                  )}
                  {task.requires_payment && (
                    <span className="text-rose-700 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      <DollarSign className="h-3 w-3" /> Pago: C$ {(task.expected_payment_amount || 0).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Aviso Explicativo del Flujo */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                La tarea original <strong>{task.code}</strong> quedará registrada en el histórico de {formatDate(task.scheduled_date)} como <strong>Reprogramada</strong>. Se creará automáticamente una <strong>nueva tarea activa</strong> para la fecha seleccionada con estado <strong>Asignada</strong>.
              </span>
            </div>

            {/* Selector de Nueva Fecha */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                <Calendar className="h-3.5 w-3.5 inline mr-1 text-slate-500" />
                Nueva Fecha Programada <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newDate}
                min={todayStr}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-semibold"
              />
            </div>

            {/* Selector de Motorizado */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                <User className="h-3.5 w-3.5 inline mr-1 text-slate-500" />
                Motorizado Asignado
              </label>
              {isLoadingCouriers ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  Cargando catálogo de motorizados...
                </div>
              ) : (
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
                >
                  <option value="">-- Sin asignar (Pendiente) --</option>
                  {couriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name || c.full_name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Motivo de la Reprogramación */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Motivo / Justificación de la Reprogramación <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Cliente ausente ayer, se acordó nueva entrega hoy por la mañana..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs resize-none"
              />
            </div>

            {rescheduleError && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-200">
                {(rescheduleError as Error).message}
              </p>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={isRescheduling}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              isLoading={isRescheduling}
              leftIcon={<CalendarClock className="h-4 w-4" />}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold"
            >
              Confirmar Reprogramación
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
