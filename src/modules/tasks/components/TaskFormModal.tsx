import { useEffect, useState, useRef } from 'react'
import { useForm, type Resolver, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  X,
  Plus,
  Edit3,
  Loader2,
  DollarSign,
  User,
  Building2,
  Bus,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
} from 'lucide-react'
import { taskBaseSchema, type TaskBaseInput } from '@/shared/validations/schemas'
import type { TaskWithCourier } from '../types/task.types'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, type PaymentMethod, type TaskType } from '@/shared/types'
import { ConfirmDialog, useToast } from '@/shared/components/ui'
import { TASK_TYPE_CONFIGS } from '../config/taskTypeConfig'
import { useBusRoutes } from '@/modules/buses/hooks/useBuses'
import { useCouriers } from '../hooks/useCouriers'

interface TaskFormModalProps {
  taskToEdit?: TaskWithCourier | null
  branchId: string
  branches?: { id: string; name: string; code: string }[]
  isOpen: boolean
  onClose: () => void
}

export function TaskFormModal({ taskToEdit, branchId, branches = [], isOpen, onClose }: TaskFormModalProps) {
  const isEditing = !!taskToEdit
  const { createTask, updateTask, isCreating, isUpdating } = useTaskMutations()
  const { data: busRoutes = [] } = useBusRoutes()

  const [selectedBranchId, setSelectedBranchId] = useState<string>(branchId || branches[0]?.id || '')

  useEffect(() => {
    if (branchId) {
      setSelectedBranchId(branchId)
    } else if (branches.length > 0) {
      setSelectedBranchId((prev) => prev || branches[0].id)
    }
  }, [branchId, branches])

  const effectiveBranchId = isEditing
    ? (taskToEdit?.branch_id || branchId || branches[0]?.id || '')
    : (selectedBranchId || branchId || branches[0]?.id || '')

  const { data: couriers = [] } = useCouriers(effectiveBranchId)
  const toast = useToast()

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const [showAllDetails, setShowAllDetails] = useState(false)

  const isTitleCustomized = useRef(false)
  const previousTypeRef = useRef<TaskType>('delivery')
  const todayStr = new Date().toISOString().split('T')[0]

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TaskBaseInput>({
    resolver: zodResolver(taskBaseSchema) as Resolver<TaskBaseInput>,
    defaultValues: {
      task_type: 'delivery',
      title: TASK_TYPE_CONFIGS.delivery.suggestedTitle,
      description: '',
      scheduled_date: todayStr,
      scheduled_start_time: '',
      scheduled_deadline: '',
      priority: 'normal',
      contact_name: '',
      company_name: '',
      provider_name: '',
      institution_name: '',
      destination_contact: '',
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
      expected_payment_method: 'cash',
      assigned_courier_id: '',
      notes: '',
    },
  })

  const selectedTaskType = watch('task_type') || 'delivery'
  const config = TASK_TYPE_CONFIGS[selectedTaskType as TaskType] || TASK_TYPE_CONFIGS.delivery

  const requiresCollection = watch('requires_collection')
  const requiresPayment = watch('requires_payment')

  // Auto-sugerir título al cambiar de tipo de tarea (si el usuario no lo ha personalizado manualmente)
  useEffect(() => {
    if (!isOpen) return

    if (previousTypeRef.current !== selectedTaskType) {
      const prevConfig = TASK_TYPE_CONFIGS[previousTypeRef.current]
      const currentTitle = watch('title')

      // Si el título está vacío o coincide con la sugerencia anterior, se actualiza a la nueva sugerencia
      if (!isTitleCustomized.current || !currentTitle || currentTitle === prevConfig?.suggestedTitle) {
        setValue('title', config.suggestedTitle)
        isTitleCustomized.current = false
      }

      // Aplicar valores financieros por defecto según el tipo si no es edición
      if (!isEditing) {
        setValue('requires_collection', config.defaultRequiresCollection)
        setValue('requires_payment', config.defaultRequiresPayment)
        if (config.defaultPaymentMethod) {
          setValue('expected_payment_method', config.defaultPaymentMethod)
        }
      }

      previousTypeRef.current = selectedTaskType
    }
  }, [selectedTaskType, isOpen, isEditing, setValue, watch, config])

  // Reset del formulario al abrir o cambiar de tarea a editar
  useEffect(() => {
    if (isOpen) {
      setShowAllDetails(false)
      isTitleCustomized.current = isEditing

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
          provider_name: taskToEdit.provider_name || '',
          institution_name: taskToEdit.institution_name || '',
          destination_contact: taskToEdit.destination_contact || '',
          phone: taskToEdit.phone || '',
          whatsapp: taskToEdit.whatsapp || '',
          address: taskToEdit.address || '',
          address_reference: taskToEdit.address_reference || '',
          maps_url: taskToEdit.maps_url || '',
          requires_collection: taskToEdit.requires_collection,
          expected_collection_amount: taskToEdit.expected_collection_amount ?? undefined,
          expected_collection_currency: taskToEdit.expected_collection_currency || 'NIO',
          requires_payment: taskToEdit.requires_payment,
          expected_payment_amount: taskToEdit.expected_payment_amount ?? undefined,
          expected_payment_currency: taskToEdit.expected_payment_currency || 'NIO',
          expected_payment_method: (taskToEdit.expected_payment_method as PaymentMethod) || 'cash',
          assigned_courier_id: taskToEdit.assigned_courier_id || '',
          notes: taskToEdit.notes || '',
        })
      } else {
        const defaultConfig = TASK_TYPE_CONFIGS.delivery
        reset({
          task_type: 'delivery',
          title: defaultConfig.suggestedTitle,
          description: '',
          scheduled_date: todayStr,
          scheduled_start_time: '',
          scheduled_deadline: '',
          priority: 'normal',
          contact_name: '',
          company_name: '',
          provider_name: '',
          institution_name: '',
          destination_contact: '',
          phone: '',
          whatsapp: '',
          address: '',
          address_reference: '',
          maps_url: '',
          requires_collection: defaultConfig.defaultRequiresCollection,
          expected_collection_amount: undefined,
          expected_collection_currency: 'NIO',
          requires_payment: defaultConfig.defaultRequiresPayment,
          expected_payment_amount: undefined,
          expected_payment_currency: 'NIO',
          expected_payment_method: 'cash',
          assigned_courier_id: '',
          notes: '',
        })
      }
    }
  }, [isOpen, taskToEdit, reset, todayStr, isEditing])

  if (!isOpen) return null

  const forceClose = () => {
    setShowDiscardConfirm(false)
    setShowAllDetails(false)
    isTitleCustomized.current = false
    reset()
    onClose()
  }

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true)
    } else {
      forceClose()
    }
  }

  const onError = (formErrors: FieldErrors<TaskBaseInput>) => {
    const firstError = Object.values(formErrors)[0]
    toast.error(firstError?.message || 'Por favor revisa los campos requeridos en el formulario.')
  }

  const onSubmit = async (data: TaskBaseInput) => {
    if (!isEditing && !effectiveBranchId) {
      toast.error('No se pudo identificar la sucursal activa. Selecciona una sucursal.')
      return
    }

    try {
      const sanitizedPayload = {
        ...data,
        scheduled_start_time: data.scheduled_start_time || null,
        scheduled_deadline: data.scheduled_deadline || null,
        maps_url: data.maps_url || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        company_name: data.company_name || null,
        contact_name: data.contact_name || null,
        provider_name: data.provider_name || null,
        institution_name: data.institution_name || null,
        destination_contact: data.destination_contact || null,
        address: data.address || null,
        address_reference: data.address_reference || null,
        notes: data.notes || null,
        expected_collection_amount: data.requires_collection ? (data.expected_collection_amount || null) : null,
        expected_collection_currency: data.requires_collection ? (data.expected_collection_currency || null) : null,
        expected_payment_amount: data.requires_payment ? (data.expected_payment_amount || null) : null,
        expected_payment_currency: data.requires_payment ? (data.expected_payment_currency || null) : null,
        expected_payment_method: (data.requires_collection || data.requires_payment)
          ? ((data.expected_payment_method as PaymentMethod) || 'cash')
          : null,
      }

      if (isEditing && taskToEdit) {
        await updateTask({
          id: taskToEdit.id,
          payload: sanitizedPayload,
        })
        toast.success('Tarea actualizada correctamente.')
      } else {
        await createTask({
          ...sanitizedPayload,
          branch_id: effectiveBranchId,
        })
        toast.success('Tarea creada correctamente.')
      }
      forceClose()
    } catch (err: any) {
      console.error('Error in TaskFormModal submission:', err)
      toast.error(err?.message || 'Error al guardar la tarea. Inténtalo nuevamente.')
    }
  }

  const isLoading = isCreating || isUpdating

  return (
    <>
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
                  {config.label} — Formulario Adaptativo Inteligente
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-foreground-muted hover:text-foreground transition cursor-pointer p-1.5 rounded-lg hover:bg-muted/50"
              aria-label="Cerrar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-5 overflow-y-auto pr-1 flex-1">
            {/* Selector de Tipo y Título Sugerido */}
            <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-border/50">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Tipo de Gestión <span className="text-destructive">*</span>
                  </label>
                  <select
                    disabled={isEditing}
                    {...register('task_type')}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
                  >
                    {Object.entries(TASK_TYPE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-foreground">
                    Título de la Tarea <span className="text-destructive">*</span>
                  </label>
                  {!isEditing && (
                    <span className="text-[10px] text-accent flex items-center gap-1 font-medium">
                      <Sparkles size={12} /> Título sugerido editable
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  placeholder={config.suggestedTitle}
                  {...register('title', {
                    onChange: () => {
                      isTitleCustomized.current = true
                    },
                  })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
                />
                {errors.title && (
                  <p className="text-[11px] text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Instrucciones y Descripción <span className="text-destructive">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder={config.descriptionPlaceholder}
                  {...register('description')}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
                />
                {errors.description && (
                  <p className="text-[11px] text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Campos Contextuales según Tipo de Tarea */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pt-1">
                {config.entityType === 'client' && <User className="h-3.5 w-3.5 text-accent" />}
                {config.entityType === 'provider' && <Building2 className="h-3.5 w-3.5 text-accent" />}
                {config.entityType === 'bank' && <CreditCard className="h-3.5 w-3.5 text-accent" />}
                {config.entityType === 'transport' && <Bus className="h-3.5 w-3.5 text-accent" />}
                Datos Específicos para {config.label}
              </h3>

              {/* Entidad Principal (Banco / Cooperativa / Proveedor / Cliente) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.entityLabel && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      {config.entityLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={config.entityPlaceholder}
                      {...register('provider_name')}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    />
                  </div>
                )}

                {config.institutionLabel && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      {config.institutionLabel}
                    </label>
                    <input
                      type="text"
                      list="bus-cooperatives-list"
                      placeholder={config.institutionPlaceholder}
                      {...register('institution_name')}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    />
                    {selectedTaskType === 'bus_shipment' && (
                      <datalist id="bus-cooperatives-list">
                        {Array.from(
                          new Set(
                            ((busRoutes || []) as Array<{ cooperative_name: string }>).map(
                              (b: { cooperative_name: string }) => b.cooperative_name
                            )
                          )
                        ).map((coop: string) => (
                          <option key={coop} value={coop} />
                        ))}
                      </datalist>
                    )}
                  </div>
                )}

                {config.referenceNumberLabel && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      {config.referenceNumberLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={config.referenceNumberPlaceholder}
                      {...register('destination_contact')}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    />
                  </div>
                )}

                {config.contactNameLabel && (
                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      {config.contactNameLabel}
                    </label>
                    <input
                      type="text"
                      placeholder={config.contactNamePlaceholder}
                      {...register('contact_name')}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    />
                  </div>
                )}
              </div>

              {/* Ubicación y Referencias */}
              {(config.addressLabel || config.addressReferenceLabel) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {config.addressLabel && (
                    <div>
                      <label className="block text-xs font-medium text-foreground-muted mb-1">
                        {config.addressLabel}
                      </label>
                      <input
                        type="text"
                        placeholder={config.addressPlaceholder}
                        {...register('address')}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                      />
                    </div>
                  )}

                  {config.addressReferenceLabel && (
                    <div>
                      <label className="block text-xs font-medium text-foreground-muted mb-1">
                        {config.addressReferenceLabel}
                      </label>
                      <input
                        type="text"
                        placeholder={config.addressReferencePlaceholder}
                        {...register('address_reference')}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sección Planificación y Asignación */}
            <div className="space-y-4 pt-3 border-t border-border/40">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-accent" />
                Planificación y Asignación
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Fecha Programada <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('scheduled_date')}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
                  />
                  {errors.scheduled_date && (
                    <p className="text-[11px] text-destructive mt-1">{errors.scheduled_date.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Motorizado asignado (Opcional)
                  </label>
                  <select
                    {...register('assigned_courier_id')}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
                  >
                    <option value="">-- Sin asignar --</option>
                    {couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.display_name || courier.full_name} {courier.phone ? `(${courier.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Sección Movimientos Financieros Previstos */}
            <div className="space-y-4 pt-3 border-t border-border/40">
              <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                Movimientos Financieros Previstos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Requiere Cobro */}
                <div className="p-3 bg-muted/30 border border-border/50 rounded-xl space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('requires_collection')}
                      className="h-4 w-4 rounded text-accent focus:ring-accent accent-accent"
                    />
                    <span className="text-xs font-semibold text-foreground">
                      Requiere Cobro al Cliente
                    </span>
                  </label>

                  {requiresCollection && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                          Monto a Cobrar
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register('expected_collection_amount', { valueAsNumber: true })}
                          className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-semibold"
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
                      Requiere Pago / Viático (Desembolso)
                    </span>
                  </label>

                  {requiresPayment && (
                    <div className="space-y-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                          Monto a Pagar
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...register('expected_payment_amount', { valueAsNumber: true })}
                          className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-semibold"
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

              {(requiresCollection || requiresPayment) && (
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    Forma de Pago Prevista
                  </label>
                  <select
                    {...register('expected_payment_method')}
                    className="w-full sm:w-1/2 px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="bank_transfer">Transferencia Bancaria</option>
                    <option value="mobile_wallet">Billetera Móvil</option>
                    <option value="other">Otra Forma</option>
                  </select>
                </div>
              )}
            </div>

            {/* Alternador Modo Rápido vs Modo Completo ("Agregar detalles") */}
            <div className="pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowAllDetails((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition cursor-pointer py-1"
              >
                {showAllDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAllDetails ? 'Ocultar detalles adicionales' : 'Agregar detalles adicionales (Horarios, Maps, Teléfonos, Notas)'}
              </button>
            </div>

            {/* Sección de Detalles Adicionales Expandibles */}
            {showAllDetails && (
              <div className="space-y-4 p-4 bg-muted/20 border border-border/50 rounded-xl animate-fade-in">
                <h4 className="text-xs font-bold text-foreground">Detalles Adicionales Opcionales</h4>

                {/* Horarios Opcionales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                {/* Teléfono y WhatsApp */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-xs font-medium text-foreground-muted mb-1">
                      WhatsApp
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: 8888-8888"
                      {...register('whatsapp')}
                      className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                    />
                  </div>
                </div>

                {/* Empresa Relacionada */}
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    Empresa / Razón Social Adicional
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Industrias del Norte S.A."
                    {...register('company_name')}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                  />
                </div>

                {/* URL de Google Maps / Waze */}
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    URL de Google Maps / Waze (Opcional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.app.goo.gl/..."
                    {...register('maps_url')}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                  />
                </div>

                {/* Notas Adicionales */}
                <div>
                  <label className="block text-xs font-medium text-foreground-muted mb-1">
                    Notas Internas / Observaciones
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Cualquier nota privada para la administración o el motorizado..."
                    {...register('notes')}
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
                  />
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50 shrink-0">
              <button
                type="button"
                onClick={handleRequestClose}
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

      {/* Confirmación por Cambios Sin Guardar */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onClose={() => setShowDiscardConfirm(false)}
        onConfirm={forceClose}
        title="Descartar cambios"
        description="Hay información sin guardar en la tarea. ¿Deseas descartarla?"
        confirmText="Descartar"
        cancelText="Continuar editando"
        variant="destructive"
      />
    </>
  )
}
