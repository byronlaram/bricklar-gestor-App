import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, Plus, Edit3, Loader2, DollarSign, User } from 'lucide-react'
import { taskBaseSchema, type TaskBaseInput } from '@/shared/validations/schemas'
import type { TaskWithCourier } from '../types/task.types'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, type PaymentMethod } from '@/shared/types'

interface TaskFormModalProps {
  taskToEdit?: TaskWithCourier | null
  branchId: string
  isOpen: boolean
  onClose: () => void
}

export function TaskFormModal({ taskToEdit, branchId, isOpen, onClose }: TaskFormModalProps) {
  const isEditing = !!taskToEdit
  const { createTask, updateTask, isCreating, isUpdating } = useTaskMutations()

  const todayStr = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<TaskBaseInput>({
    resolver: zodResolver(taskBaseSchema) as Resolver<TaskBaseInput>,
    defaultValues: {
      task_type: 'delivery',
      title: '',
      description: '',
      scheduled_date: todayStr,
      scheduled_start_time: '',
      scheduled_deadline: '',
      priority: 'normal',
      contact_name: '',
      company_name: '',
      phone: '',
      whatsapp: '',
      address: '',
      address_reference: '',
      maps_url: '',
      requires_collection: false,
      expected_collection_amount: undefined,
      expected_collection_currency: 'NIO',
      requires_payment: false,
      expected_payment_amount: undefined,
      expected_payment_currency: 'NIO',
      notes: '',
    },
  })

  const requiresCollection = watch('requires_collection')
  const requiresPayment = watch('requires_payment')

  useEffect(() => {
    if (taskToEdit) {
      reset({
        task_type: taskToEdit.task_type,
        title: taskToEdit.title,
        description: taskToEdit.description,
        scheduled_date: taskToEdit.scheduled_date,
        scheduled_start_time: taskToEdit.scheduled_start_time || '',
        scheduled_deadline: taskToEdit.scheduled_deadline || '',
        priority: taskToEdit.priority,
        contact_name: taskToEdit.contact_name || '',
        company_name: taskToEdit.company_name || '',
        phone: taskToEdit.phone || '',
        whatsapp: taskToEdit.whatsapp || '',
        address: taskToEdit.address || '',
        address_reference: taskToEdit.address_reference || '',
        maps_url: taskToEdit.maps_url || '',
        requires_collection: taskToEdit.requires_collection,
        expected_collection_amount: taskToEdit.expected_collection_amount || undefined,
        expected_collection_currency: taskToEdit.expected_collection_currency || 'NIO',
        requires_payment: taskToEdit.requires_payment,
        expected_payment_amount: taskToEdit.expected_payment_amount || undefined,
        expected_payment_currency: taskToEdit.expected_payment_currency || 'NIO',
        notes: taskToEdit.notes || '',
      })
    } else {
      reset({
        task_type: 'delivery',
        title: '',
        description: '',
        scheduled_date: todayStr,
        scheduled_start_time: '',
        scheduled_deadline: '',
        priority: 'normal',
        contact_name: '',
        company_name: '',
        phone: '',
        whatsapp: '',
        address: '',
        address_reference: '',
        maps_url: '',
        requires_collection: false,
        expected_collection_amount: undefined,
        expected_collection_currency: 'NIO',
        requires_payment: false,
        expected_payment_amount: undefined,
        expected_payment_currency: 'NIO',
        notes: '',
      })
    }
  }, [taskToEdit, reset, todayStr])

  if (!isOpen) return null

  const onSubmit = async (data: TaskBaseInput) => {
    try {
      if (isEditing && taskToEdit) {
        await updateTask({
          id: taskToEdit.id,
          payload: {
            ...data,
            scheduled_start_time: data.scheduled_start_time || null,
            scheduled_deadline: data.scheduled_deadline || null,
            expected_payment_method: (data.expected_payment_method as PaymentMethod | null) || null,
          },
        })
      } else {
        await createTask({
          ...data,
          branch_id: branchId,
          scheduled_start_time: data.scheduled_start_time || null,
          scheduled_deadline: data.scheduled_deadline || null,
          expected_payment_method: (data.expected_payment_method as PaymentMethod | null) || null,
        })
      }
      onClose()
    } catch (err) {
      console.error('Error in TaskFormModal submission:', err)
    }
  }

  const isLoading = isCreating || isUpdating

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
              {isEditing ? <Edit3 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {isEditing ? `Editar Tarea — ${taskToEdit.code}` : 'Nueva Tarea'}
              </h2>
              <p className="text-xs text-foreground-muted">
                {isEditing ? 'Modifique los campos necesarios.' : 'Complete la información requerida.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 overflow-y-auto pr-1 flex-1">
          {/* Seccion 1: Tipo y Título */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Tipo de Tarea <span className="text-destructive">*</span>
                </label>
                <select
                  disabled={isEditing}
                  {...register('task_type')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                >
                  {Object.entries(TASK_TYPE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                {errors.task_type && (
                  <p className="text-[11px] text-destructive mt-1">{errors.task_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Prioridad
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                >
                  {Object.entries(TASK_PRIORITY_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Título de la Tarea <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Entrega de repuesto a Taller Central"
                {...register('title')}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
              {errors.title && (
                <p className="text-[11px] text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Descripción Detallada <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Indique las instrucciones completas para la gestión..."
                {...register('description')}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
              />
              {errors.description && (
                <p className="text-[11px] text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          {/* Programación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-border/40">
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Fecha Programada <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                {...register('scheduled_date')}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
              {errors.scheduled_date && (
                <p className="text-[11px] text-destructive mt-1">{errors.scheduled_date.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Hora de Inicio (Opcional)
              </label>
              <input
                type="time"
                {...register('scheduled_start_time')}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Hora Límite (Opcional)
              </label>
              <input
                type="time"
                {...register('scheduled_deadline')}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
          </div>

          {/* Contacto y Dirección */}
          <div className="space-y-4 pt-3 border-t border-border/40">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-accent" />
              Contacto y Ubicación
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Nombre del Contacto / Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  {...register('contact_name')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej: 8888-8888"
                  {...register('phone')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                Dirección Completa
              </label>
              <input
                type="text"
                placeholder="Ej: Semáforos del Zumen 2c al lago 1c abajo"
                {...register('address')}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1">
                URL de Google Maps / Waze
              </label>
              <input
                type="url"
                placeholder="https://maps.app.goo.gl/..."
                {...register('maps_url')}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
              {errors.maps_url && (
                <p className="text-[11px] text-destructive mt-1">{errors.maps_url.message}</p>
              )}
            </div>
          </div>

          {/* Sección Financiera */}
          <div className="space-y-4 pt-3 border-t border-border/40">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              Movimientos Financieros Previstos
            </h3>

            {/* Requiere Cobro */}
            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('requires_collection')}
                  className="h-4 w-4 rounded text-accent focus:ring-accent accent-accent"
                />
                <span className="text-xs font-semibold text-foreground">
                  Requiere Cobro al Cliente / Destinatario
                </span>
              </label>

              {requiresCollection && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Monto a Cobrar
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register('expected_collection_amount', { valueAsNumber: true })}
                      className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    />
                    {errors.expected_collection_amount && (
                      <p className="text-[11px] text-destructive mt-1">
                        {errors.expected_collection_amount.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Moneda
                    </label>
                    <select
                      {...register('expected_collection_currency')}
                      className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    >
                      <option value="NIO">Córdobas (C$)</option>
                      <option value="USD">Dólares (US$)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Requiere Pago */}
            <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('requires_payment')}
                  className="h-4 w-4 rounded text-accent focus:ring-accent accent-accent"
                />
                <span className="text-xs font-semibold text-foreground">
                  Requiere Pago / Viático (Desembolso por el motorizado)
                </span>
              </label>

              {requiresPayment && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Monto a Pagar
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register('expected_payment_amount', { valueAsNumber: true })}
                      className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    />
                    {errors.expected_payment_amount && (
                      <p className="text-[11px] text-destructive mt-1">
                        {errors.expected_payment_amount.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Moneda
                    </label>
                    <select
                      {...register('expected_payment_currency')}
                      className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    >
                      <option value="NIO">Córdobas (C$)</option>
                      <option value="USD">Dólares (US$)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground border border-border rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Tarea'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
