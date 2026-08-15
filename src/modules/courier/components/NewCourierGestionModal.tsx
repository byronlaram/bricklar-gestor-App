import { useState } from 'react'
import {
  X,
  PlusCircle,
  Camera,
  Upload,
  Loader2,
  DollarSign,
  MapPin,
  FileText,
  Building,
  Fuel,
  ShoppingBag,
  CreditCard,
  Truck,
  HelpCircle,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { uploadTaskEvidence } from '@/modules/tasks/services/tasksService'
import type { TaskType, Currency, PaymentMethod } from '@/shared/types'
import { TASK_TYPE_LABELS } from '@/shared/types'

interface NewCourierGestionModalProps {
  isOpen: boolean
  onClose: () => void
  branchId: string
  workdayId?: string
}

const GESTION_TYPES: { type: TaskType; label: string; icon: React.ReactNode; defaultTitle: string }[] = [
  { type: 'delivery', label: 'Entrega', icon: <Truck className="h-4 w-4" />, defaultTitle: 'Entrega en Dirección' },
  { type: 'purchase', label: 'Compra', icon: <ShoppingBag className="h-4 w-4" />, defaultTitle: 'Compra de Insumos / Repuestos' },
  { type: 'fuel', label: 'Combustible', icon: <Fuel className="h-4 w-4" />, defaultTitle: 'Carga de Combustible' },
  { type: 'bank_deposit', label: 'Depósito bancario', icon: <Building className="h-4 w-4" />, defaultTitle: 'Depósito Bancario en Ventanilla' },
  { type: 'credit_payment', label: 'Pago de crédito', icon: <CreditCard className="h-4 w-4" />, defaultTitle: 'Pago de Cuota de Crédito' },
  { type: 'service_payment', label: 'Pago de servicio', icon: <FileText className="h-4 w-4" />, defaultTitle: 'Pago de Servicio Público/Privado' },
  { type: 'bus_shipment', label: 'Encomienda por bus', icon: <Truck className="h-4 w-4" />, defaultTitle: 'Envío de Encomienda por Bus' },
  { type: 'logistics_shipment', label: 'Encomienda logística', icon: <Truck className="h-4 w-4" />, defaultTitle: 'Envío de Encomienda Logística' },
  { type: 'other_errand', label: 'Otra gestión', icon: <HelpCircle className="h-4 w-4" />, defaultTitle: 'Gestión Imprevista' },
]

export function NewCourierGestionModal({
  isOpen,
  onClose,
  branchId,
  workdayId,
}: NewCourierGestionModalProps) {
  const { profile } = useAuth()
  const { createTask, isCreating } = useTaskMutations()

  const [taskType, setTaskType] = useState<TaskType>('delivery')
  const [title, setTitle] = useState<string>('Entrega en Dirección')
  const [description, setDescription] = useState<string>('')
  const [address, setAddress] = useState<string>('')
  const [addressReference, setAddressReference] = useState<string>('')
  const [mapsUrl, setMapsUrl] = useState<string>('')
  
  // Financiero
  const [hasFinancialMovement, setHasFinancialMovement] = useState<boolean>(false)
  const [movementKind, setMovementKind] = useState<'collection' | 'payment'>('payment')
  const [amount, setAmount] = useState<number | ''>('')
  const [currency, setCurrency] = useState<Currency>('NIO')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')

  // Evidencia
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Al cambiar tipo de gestión, sugerir título si no ha sido editado manualmente
  const handleTypeChange = (newType: TaskType) => {
    setTaskType(newType)
    const match = GESTION_TYPES.find((g) => g.type === newType)
    if (match) {
      setTitle(match.defaultTitle)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setFormError('La fotografía no debe superar 10 MB.')
      return
    }

    setEvidenceFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setEvidencePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!title.trim()) {
      setFormError('Ingresa un título para la gestión.')
      return
    }

    if (!profile?.id) {
      setFormError('No se identificó la sesión del usuario.')
      return
    }

    try {
      let uploadedEvidenceUrl: string | null = null

      if (evidenceFile) {
        setIsUploading(true)
        uploadedEvidenceUrl = await uploadTaskEvidence(evidenceFile)
        setIsUploading(false)
      }

      const todayStr = new Date().toISOString().split('T')[0]

      const payload = {
        branch_id: branchId || profile.primary_branch_id || profile.branch_ids[0] || '',
        task_type: taskType,
        title: title.trim(),
        description: description.trim() || `Gestión imprevista creada por motorizado (${TASK_TYPE_LABELS[taskType]})`,
        scheduled_date: todayStr,
        priority: 'normal' as const,
        assigned_courier_id: profile.id,
        workday_id: workdayId || null,
        creation_origin: 'courier_created' as const,
        approval_status: 'pending' as const,
        evidence_url: uploadedEvidenceUrl,
        address: address.trim() || null,
        address_reference: addressReference.trim() || null,
        maps_url: mapsUrl.trim() || null,
        requires_collection: hasFinancialMovement && movementKind === 'collection',
        expected_collection_amount: hasFinancialMovement && movementKind === 'collection' && amount ? Number(amount) : null,
        expected_collection_currency: hasFinancialMovement && movementKind === 'collection' ? currency : null,
        requires_payment: hasFinancialMovement && movementKind === 'payment',
        expected_payment_amount: hasFinancialMovement && movementKind === 'payment' && amount ? Number(amount) : null,
        expected_payment_currency: hasFinancialMovement && movementKind === 'payment' ? currency : null,
        expected_payment_method: hasFinancialMovement ? paymentMethod : null,
        notes: description.trim() || null,
      }

      await createTask(payload)
      onClose()
    } catch (err: unknown) {
      console.error('Error registrando nueva gestión:', err)
      setFormError((err as Error)?.message || 'Error al guardar la gestión. Intenta de nuevo.')
    } finally {
      setIsUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in overflow-y-auto">
      <div className="bg-[#F8FAFC] dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col justify-between my-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#004594]/10 dark:bg-sky-500/20 text-[#004594] dark:text-sky-400 flex items-center justify-center font-bold">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Registrar Nueva Gestión</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quedará enviada a aprobación administrativa</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
            ⚠️ {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 no-scrollbar flex-1">
          {/* 1. Selector Tipo de Gestión */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-200">
              Tipo de Gestión <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GESTION_TYPES.map((item) => {
                const isSelected = taskType === item.type
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => handleTypeChange(item.type)}
                    className={`p-2.5 rounded-2xl border text-left flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#004594] text-white border-[#004594] font-extrabold shadow-md scale-[1.02]'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 font-bold shadow-2xs'
                    }`}
                  >
                    <div className={isSelected ? 'text-white' : 'text-[#004594] dark:text-sky-400'}>{item.icon}</div>
                    <span className="text-[11px] leading-tight block truncate w-full">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Título de la Gestión */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-200">
              Título de la Gestión <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Carga de Combustible Shell"
              className="w-full h-11 px-3.5 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-xs font-bold rounded-2xl border border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#004594]/30 dark:focus:ring-sky-400/30 focus:border-[#004594]"
            />
          </div>

          {/* 3. Motivo o Descripción */}
          <div className="space-y-1.5">
            <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-200">
              Motivo u Observaciones
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalla la gestión realizada o el motivo..."
              className="w-full p-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-xs font-medium rounded-2xl border border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#004594]/30 dark:focus:ring-sky-400/30 focus:border-[#004594]"
            />
          </div>

          {/* 4. Dirección / Ubicación */}
          <div className="space-y-2.5 p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-100">
              <MapPin className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Ubicación o Destino (Opcional)</span>
            </div>

            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Dirección o punto de atención..."
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#004594]/30"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={addressReference}
                onChange={(e) => setAddressReference(e.target.value)}
                placeholder="Referencia cercana..."
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-[11px] font-medium rounded-xl border border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <input
                type="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="Link Google Maps / Waze..."
                className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-[11px] font-medium rounded-xl border border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* 5. Movimiento de Dinero / Monto */}
          <div className="space-y-2.5 p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFinancialMovement}
                  onChange={(e) => setHasFinancialMovement(e.target.checked)}
                  className="w-4 h-4 rounded text-[#004594] focus:ring-[#004594] cursor-pointer"
                />
                <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> ¿Requiere movimiento financiero / dinero?
                </span>
              </label>
            </div>

            {hasFinancialMovement && (
              <div className="space-y-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementKind('payment')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      movementKind === 'payment'
                        ? 'bg-rose-500 text-white border-rose-500 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    💸 Gasto / Pago
                  </button>
                  <button
                    type="button"
                    onClick={() => setMovementKind('collection')}
                    className={`py-1.5 px-3 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      movementKind === 'collection'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    💰 Cobro / Ingreso
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required={hasFinancialMovement}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Monto (Ej: 150.00)"
                      className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-700 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full h-10 px-2 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700"
                  >
                    <option value="NIO">C$ (NIO)</option>
                    <option value="USD">$ (USD)</option>
                  </select>
                </div>

                <div>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full h-9 px-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-700"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="bank_transfer">Transferencia Bancaria</option>
                    <option value="mobile_wallet">Billetera Móvil</option>
                    <option value="other">Otro método</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 6. Adjuntar Evidencia Fotografica */}
          <div className="space-y-2 p-3.5 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xs">
            <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Foto de comprobante / recibo (Opcional)
              </span>
            </label>

            {evidencePreview ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-950 group max-h-40">
                <img src={evidencePreview} alt="Evidencia" className="w-full h-36 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setEvidenceFile(null)
                    setEvidencePreview(null)
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md cursor-pointer hover:bg-rose-700 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-slate-50 dark:bg-slate-950 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition">
                <Upload className="h-6 w-6 text-[#004594] dark:text-sky-400 mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Tocar para tomar foto / subir</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">JPG, PNG hasta 10MB</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Botones del Modal */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-full border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreating || isUploading}
              className="flex-1 h-12 rounded-full bg-[#004594] hover:bg-[#083570] text-white text-xs font-extrabold shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isCreating || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Enviar para Aprobación</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
