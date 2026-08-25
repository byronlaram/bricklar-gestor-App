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
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Camera,
  Trash2,
  Eye,
  UploadCloud,
} from 'lucide-react'
import { cn } from '@/shared/utils/cn'
import { taskBaseSchema, type TaskBaseInput } from '@/shared/validations/schemas'
import type { TaskWithCourier } from '../types/task.types'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { TASK_TYPE_LABELS, TASK_PRIORITY_LABELS, type PaymentMethod, type TaskType } from '@/shared/types'
import { ConfirmDialog, useToast, ImageViewerModal } from '@/shared/components/ui'
import { TASK_TYPE_CONFIGS } from '../config/taskTypeConfig'
import { BusRouteCombobox } from '@/modules/buses/components/BusRouteCombobox'
import type { BusRoute } from '@/modules/buses/types/buses.types'
import { useCouriers } from '../hooks/useCouriers'
import { uploadTaskReferenceImage } from '../services/tasksService'
import { getLocalDateString } from '@/shared/utils/date'

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
  const [referencePhotos, setReferencePhotos] = useState<string[]>([])
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const isTitleCustomized = useRef(false)
  const previousTypeRef = useRef<TaskType>('delivery')
  const todayStr = getLocalDateString()

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

  const financialMode: 'none' | 'income' | 'expense' = requiresCollection
    ? 'income'
    : requiresPayment
    ? 'expense'
    : 'none'

  const handleFinancialModeChange = (mode: 'none' | 'income' | 'expense') => {
    if (mode === 'none') {
      setValue('requires_collection', false, { shouldDirty: true })
      setValue('requires_payment', false, { shouldDirty: true })
      setValue('expected_collection_amount', undefined, { shouldDirty: true })
      setValue('expected_payment_amount', undefined, { shouldDirty: true })
    } else if (mode === 'income') {
      setValue('requires_collection', true, { shouldDirty: true })
      setValue('requires_payment', false, { shouldDirty: true })
      setValue('expected_payment_amount', undefined, { shouldDirty: true })
      if (!watch('expected_collection_currency')) {
        setValue('expected_collection_currency', 'NIO')
      }
    } else if (mode === 'expense') {
      setValue('requires_payment', true, { shouldDirty: true })
      setValue('requires_collection', false, { shouldDirty: true })
      setValue('expected_collection_amount', undefined, { shouldDirty: true })
      if (!watch('expected_payment_currency')) {
        setValue('expected_payment_currency', 'NIO')
      }
      if (!watch('expected_payment_method')) {
        setValue('expected_payment_method', 'cash')
      }
    }
  }

  // Auto-sugerir título y predeterminar movimiento financiero según el tipo de tarea
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

      // Aplicar valores financieros por defecto según el tipo de tarea si no es edición
      if (!isEditing) {
        if (config.defaultRequiresCollection) {
          handleFinancialModeChange('income')
        } else if (config.defaultRequiresPayment) {
          handleFinancialModeChange('expense')
        } else {
          handleFinancialModeChange('none')
        }
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
        const metadata = taskToEdit.metadata as { reference_photos?: string[] } | null
        const photos = Array.isArray(metadata?.reference_photos)
          ? metadata.reference_photos
          : (taskToEdit.evidence_url ? [taskToEdit.evidence_url] : [])
        setReferencePhotos(photos)

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
        setReferencePhotos([])
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingPhoto(true)
    try {
      const uploadPromises = Array.from(files).map((file) => uploadTaskReferenceImage(file))
      const urls = await Promise.all(uploadPromises)
      setReferencePhotos((prev) => [...prev, ...urls])
      toast.success(
        urls.length === 1
          ? 'Foto de referencia adjuntada'
          : `${urls.length} fotos adjuntadas correctamente.`
      )
    } catch (err: unknown) {
      console.error('Error al subir fotos de referencia:', err)
      toast.error('No se pudieron subir las imágenes. Intenta nuevamente.')
    } finally {
      setIsUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemovePhoto = (indexToRemove: number) => {
    setReferencePhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove))
  }

  const handlePreviewPhoto = (index: number) => {
    setViewerIndex(index)
    setIsViewerOpen(true)
  }

  const forceClose = () => {
    setShowDiscardConfirm(false)
    setShowAllDetails(false)
    isTitleCustomized.current = false
    setReferencePhotos([])
    setIsViewerOpen(false)
    reset()
    onClose()
  }

  const handleRequestClose = () => {
    if (isDirty || referencePhotos.length > 0) {
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
      const finalMetadata = {
        ...((taskToEdit?.metadata as Record<string, unknown>) || {}),
        reference_photos: referencePhotos,
      }

      const sanitizedPayload = {
        ...data,
        metadata: finalMetadata,
        evidence_url: referencePhotos[0] || null,
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
                    {selectedTaskType === 'bus_shipment' ? (
                      <BusRouteCombobox
                        value={watch('institution_name') || ''}
                        onChange={(val) => {
                          setValue('institution_name', val, { shouldDirty: true })
                        }}
                        onSelectRoute={(route: BusRoute) => {
                          setValue('institution_name', route.cooperative_name, { shouldDirty: true })
                          setValue('address', route.origin_terminal, { shouldDirty: true })
                          setValue('address_reference', route.destination_city, { shouldDirty: true })
                          if (route.dispatch_phone && !watch('phone')) {
                            setValue('phone', route.dispatch_phone, { shouldDirty: true })
                          }
                        }}
                        placeholder={config.institutionPlaceholder || 'Buscar destino o transporte...'}
                      />
                    ) : (
                      <input
                        type="text"
                        placeholder={config.institutionPlaceholder}
                        {...register('institution_name')}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
                      />
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

            {/* Sección Fotos de Referencia para el Motorizado */}
            <div className="space-y-3 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Camera className="h-4 w-4 text-accent" />
                    Fotos de Referencia del Producto / Documentos
                  </h3>
                  <p className="text-[11px] text-foreground-muted mt-0.5">
                    Permite al motorizado identificar qué producto o paquete retirar.
                  </p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-accent bg-accent/10 hover:bg-accent/20 border border-accent/30 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      Adjuntar Fotos
                    </>
                  )}
                </button>
              </div>

              {/* Galería de Fotos Subidas */}
              {referencePhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/20 border border-border/60 rounded-xl">
                  {referencePhotos.map((photoUrl, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-border bg-background aspect-square shadow-2xs"
                    >
                      <img
                        src={photoUrl}
                        alt={`Referencia ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />

                      {/* Overlay con acciones */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePreviewPhoto(idx)}
                          className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-lg transition cursor-pointer"
                          title="Ver en grande"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-lg transition cursor-pointer"
                          title="Eliminar foto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Badge con número */}
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[10px] font-bold text-white pointer-events-none">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border/80 hover:border-accent/60 rounded-xl p-4 text-center cursor-pointer transition bg-muted/10 hover:bg-accent/5 flex flex-col items-center justify-center gap-1.5"
                >
                  <UploadCloud className="h-6 w-6 text-foreground-muted" />
                  <p className="text-xs font-semibold text-foreground">
                    Haz clic para seleccionar o arrastrar fotos aquí
                  </p>
                  <p className="text-[11px] text-foreground-muted">
                    Formatos JPG, PNG, WebP (Se comprimen automáticamente)
                  </p>
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
            <div className="space-y-3.5 pt-3 border-t border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  Movimiento Financiero en Caja
                </h3>
                <span className="text-[11px] text-foreground-muted">
                  Flujo de efectivo para la caja del motorizado
                </span>
              </div>

              {/* Selector Exclusivo de 3 Opciones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. Sin Dinero */}
                <button
                  type="button"
                  onClick={() => handleFinancialModeChange('none')}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer relative',
                    financialMode === 'none'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                      : 'bg-background text-foreground border-border hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Ban className="h-3.5 w-3.5 opacity-70" />
                      Sin Dinero
                    </span>
                    <span className={cn('h-2 w-2 rounded-full', financialMode === 'none' ? 'bg-white' : 'bg-border')} />
                  </div>
                  <span className={cn('text-[11px] leading-tight', financialMode === 'none' ? 'text-slate-300' : 'text-foreground-muted')}>
                    Trámite simple o entrega prepagada sin cobro.
                  </span>
                </button>

                {/* 2. Ingreso (Entrada a Caja) */}
                <button
                  type="button"
                  onClick={() => handleFinancialModeChange('income')}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer relative',
                    financialMode === 'income'
                      ? 'bg-emerald-50 text-emerald-950 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-background text-foreground border-border hover:bg-emerald-50/40'
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                      Ingreso (Entrada)
                    </span>
                    <span className={cn('h-2 w-2 rounded-full', financialMode === 'income' ? 'bg-emerald-600' : 'bg-border')} />
                  </div>
                  <span className={cn('text-[11px] leading-tight', financialMode === 'income' ? 'text-emerald-800 font-medium' : 'text-foreground-muted')}>
                    Cobro a cliente, Retiro de ATM o Recolección.
                  </span>
                </button>

                {/* 3. Egreso (Salida / Pago) */}
                <button
                  type="button"
                  onClick={() => handleFinancialModeChange('expense')}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-xl border text-left transition-all cursor-pointer relative',
                    financialMode === 'expense'
                      ? 'bg-rose-50 text-rose-950 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
                      : 'bg-background text-foreground border-border hover:bg-rose-50/40'
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
                      Egreso (Salida)
                    </span>
                    <span className={cn('h-2 w-2 rounded-full', financialMode === 'expense' ? 'bg-rose-600' : 'bg-border')} />
                  </div>
                  <span className={cn('text-[11px] leading-tight', financialMode === 'expense' ? 'text-rose-800 font-medium' : 'text-foreground-muted')}>
                    Compra de insumos, Flete de bus o Viáticos.
                  </span>
                </button>
              </div>

              {/* Panel de Ingreso (Entrada) */}
              {financialMode === 'income' && (
                <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      💵 Entrada de Efectivo a la Caja del Motorizado
                    </span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                      Suma a la liquidación
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1">
                        Monto a Recibir / Retirar *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('expected_collection_amount', { valueAsNumber: true })}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 font-bold"
                      />
                      {errors.expected_collection_amount && (
                        <p className="text-[11px] text-destructive mt-1 font-semibold">
                          {errors.expected_collection_amount.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-emerald-900 uppercase tracking-wider mb-1">
                        Moneda *
                      </label>
                      <select
                        {...register('expected_collection_currency')}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-900 font-semibold"
                      >
                        <option value="NIO">Córdobas (C$)</option>
                        <option value="USD">Dólares (US$)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel de Egreso (Salida / Pago) */}
              {financialMode === 'expense' && (
                <div className="p-3.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      💸 Salida de Dinero / Desembolso de Caja
                    </span>
                    <span className="text-[10px] bg-rose-100 text-rose-800 font-semibold px-2 py-0.5 rounded-full">
                      Resta a la liquidación
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 uppercase tracking-wider mb-1">
                        Monto a Desembolsar *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...register('expected_payment_amount', { valueAsNumber: true })}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-slate-900 font-bold"
                      />
                      {errors.expected_payment_amount && (
                        <p className="text-[11px] text-destructive mt-1 font-semibold">
                          {errors.expected_payment_amount.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 uppercase tracking-wider mb-1">
                        Moneda *
                      </label>
                      <select
                        {...register('expected_payment_currency')}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-slate-900 font-semibold"
                      >
                        <option value="NIO">Córdobas (C$)</option>
                        <option value="USD">Dólares (US$)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-rose-900 uppercase tracking-wider mb-1">
                        Forma de Pago
                      </label>
                      <select
                        {...register('expected_payment_method')}
                        className="w-full px-3 py-1.5 text-sm bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/40 text-slate-900 font-semibold"
                      >
                        <option value="cash">Efectivo en Mano</option>
                        <option value="bank_transfer">Transferencia Bancaria</option>
                        <option value="mobile_wallet">Billetera Móvil</option>
                        <option value="other">Otra Forma</option>
                      </select>
                    </div>
                  </div>
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

      {/* Visor de Fotos a Pantalla Completa */}
      <ImageViewerModal
        images={referencePhotos}
        initialIndex={viewerIndex}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        title="Foto de Referencia del Producto"
      />
    </>
  )
}
