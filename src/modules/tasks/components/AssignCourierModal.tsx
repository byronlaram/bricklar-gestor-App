import { useState, useEffect } from 'react'
import { UserPlus, UserX, Loader2 } from 'lucide-react'
import type { TaskWithCourier } from '../types/task.types'
import { useCouriers } from '../hooks/useCouriers'
import { useTaskMutations } from '../hooks/useTaskMutations'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Button,
} from '@/shared/components/ui'

interface AssignCourierModalProps {
  task: TaskWithCourier | null
  isOpen: boolean
  onClose: () => void
}

export function AssignCourierModal({ task, isOpen, onClose }: AssignCourierModalProps) {
  const [selectedCourierId, setSelectedCourierId] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  const { data: couriers = [], isLoading: isLoadingCouriers } = useCouriers(task?.branch_id)
  const { assignTask, isAssigning } = useTaskMutations()

  useEffect(() => {
    if (task) {
      setSelectedCourierId(task.assigned_courier_id || '')
      setReason('')
    }
  }, [task])

  if (!task) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await assignTask({
        task_id: task.id,
        courier_id: selectedCourierId || null,
        reason: reason.trim() || undefined,
      })
      onClose()
    } catch (err) {
      console.error('Error assigning courier:', err)
    }
  }

  const isUnassigning = !selectedCourierId && !!task.assigned_courier_id

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="md">
        <ModalHeader onClose={onClose}>
          <ModalTitle>Asignar Motorizado</ModalTitle>
          <ModalDescription>Tarea {task.code}: {task.title}</ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Seleccionar Motorizado
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
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs font-medium"
                >
                  <option value="">-- Ninguno (Sin asignar) --</option>
                  {couriers.map((courier) => (
                    <option key={courier.id} value={courier.id}>
                      {courier.display_name || courier.full_name} {courier.phone ? `(${courier.phone})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Motivo / Notas de Asignación (Opcional)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Reasignación por cambio de zona o disponibilidad..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 shadow-2xs resize-none"
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isAssigning}
              leftIcon={isUnassigning ? <UserX className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
            >
              {isUnassigning ? 'Desasignar Motorizado' : 'Confirmar Asignación'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
