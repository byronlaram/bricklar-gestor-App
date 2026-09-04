import { useState, useEffect, useMemo, useRef } from 'react'
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  Receipt,
  Banknote,
  Split,
  RotateCcw,
  Clock,
  Camera,
  Image as ImageIcon,
  Trash2,
} from 'lucide-react'
import type { TaskWithCourier, TaskPaymentBreakdown } from '@/modules/tasks/types/task.types'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import { uploadTaskEvidence } from '@/modules/tasks/services/tasksService'
import type { PaymentMethod } from '@/shared/types'
import { useToast } from '@/shared/components/ui'

interface CompleteTaskModalProps {
  task: TaskWithCourier | null
  isOpen: boolean
  onClose: () => void
}

const BANK_OPTIONS = [
  'Banpro Grupo Promerica',
  'BAC Credomatic',
  'Banco LAFISE Bancentro',
  'Banco Ficohsa',
  'Banco BDF',
  'Banco Avanz',
  'Otro',
]

export function CompleteTaskModal({ task, isOpen, onClose }: CompleteTaskModalProps) {
  const toast = useToast()
  const { changeStatus, isChangingStatus, statusError } = useTaskMutations()

  const [outcome, setOutcome] = useState<'completed' | 'retry_today' | 'not_completed'>('completed')
  const [notes, setNotes] = useState<string>('')
  const [failureReason, setFailureReason] = useState<string>('Cliente ausente')
  const [retryReason, setRetryReason] = useState<string>('Proveedor o contacto ausente')

  // ─── Estados para Compras / Pagos ───
  const [actualPaidAmount, setActualPaidAmount] = useState<number | ''>('')
  const [invoiceNumber, setInvoiceNumber] = useState<string>('')
  const [paidMethod, setPaidMethod] = useState<PaymentMethod | 'cheque'>('cash')
  const [paymentDiscrepancyReason, setPaymentDiscrepancyReason] = useState<string>('')

  // ─── Estados para Cobros a Clientes ───
  const [collectionMode, setCollectionMode] = useState<'single' | 'mixed'>('single')
  const [collectionDiscrepancyReason, setCollectionDiscrepancyReason] = useState<string>('')

  // Modo único
  const [singleCollectedAmount, setSingleCollectedAmount] = useState<number | ''>('')
  const [singlePaymentMethod, setSinglePaymentMethod] = useState<PaymentMethod | 'cheque'>('cash')
  const [singleBank, setSingleBank] = useState<string>('Banpro Grupo Promerica')
  const [singleReference, setSingleReference] = useState<string>('')
  const [singleChequeNumber, setSingleChequeNumber] = useState<string>('')

  // Modo mixto / desglosado
  const [mixedCash, setMixedCash] = useState<number | ''>('')
  const [mixedTransfer, setMixedTransfer] = useState<number | ''>('')
  const [mixedTransferBank, setMixedTransferBank] = useState<string>('Banpro Grupo Promerica')
  const [mixedTransferRef, setMixedTransferRef] = useState<string>('')
  const [mixedCheque, setMixedCheque] = useState<number | ''>('')
  const [mixedChequeBank, setMixedChequeBank] = useState<string>('BAC Credomatic')
  const [mixedChequeNumber, setMixedChequeNumber] = useState<string>('')

  // ─── Estados para Comprobante / Foto de Entrega (POD) ───
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState<string | null>(null)
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Inicializar valores al abrir
  useEffect(() => {
    if (task) {
      setOutcome('completed')
      setNotes('')
      setFailureReason('Cliente ausente')
      setRetryReason('Proveedor o contacto ausente')

      // Comprobante
      setEvidenceFile(null)
      if (evidencePreviewUrl) {
        URL.revokeObjectURL(evidencePreviewUrl)
      }
      setEvidencePreviewUrl(null)
      setIsUploadingEvidence(false)

      // Compras
      setActualPaidAmount(task.expected_payment_amount ?? '')
      setInvoiceNumber('')
      setPaidMethod((task.expected_payment_method as PaymentMethod | 'cheque') || 'cash')
      setPaymentDiscrepancyReason('')

      // Cobros
      setCollectionMode('single')
      setSingleCollectedAmount(task.expected_collection_amount ?? '')
      setSinglePaymentMethod((task.expected_payment_method as PaymentMethod | 'cheque') || 'cash')
      setSingleBank('Banpro Grupo Promerica')
      setSingleReference('')
      setSingleChequeNumber('')
      setCollectionDiscrepancyReason('')

      setMixedCash(task.expected_collection_amount ?? '')
      setMixedTransfer('')
      setMixedTransferBank('Banpro Grupo Promerica')
      setMixedTransferRef('')
      setMixedCheque('')
      setMixedChequeBank('BAC Credomatic')
      setMixedChequeNumber('')
    }
  }, [task, isOpen])

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Archivo no válido', 'Por favor selecciona una imagen o fotografía.')
      return
    }

    if (evidencePreviewUrl) {
      URL.revokeObjectURL(evidencePreviewUrl)
    }

    setEvidenceFile(file)
    setEvidencePreviewUrl(URL.createObjectURL(file))
  }

  const handleRemovePhoto = () => {
    if (evidencePreviewUrl) {
      URL.revokeObjectURL(evidencePreviewUrl)
    }
    setEvidenceFile(null)
    setEvidencePreviewUrl(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (galleryInputRef.current) galleryInputRef.current.value = ''
  }

  // Total recaudado calculado en modo mixto
  const totalMixedCollected = useMemo(() => {
    const cash = typeof mixedCash === 'number' ? mixedCash : 0
    const transfer = typeof mixedTransfer === 'number' ? mixedTransfer : 0
    const cheque = typeof mixedCheque === 'number' ? mixedCheque : 0
    return cash + transfer + cheque
  }, [mixedCash, mixedTransfer, mixedCheque])

  // Cálculo de discrepancias
  const expectedPayment = task?.expected_payment_amount ?? 0
  const actualPaymentNum = typeof actualPaidAmount === 'number' ? actualPaidAmount : 0
  const paymentDiff =
    task?.requires_payment && actualPaidAmount !== ''
      ? Number((actualPaymentNum - expectedPayment).toFixed(2))
      : 0
  const hasPaymentDiscrepancy =
    task?.requires_payment && actualPaidAmount !== '' && Math.abs(paymentDiff) > 0.009

  const expectedCollection = task?.expected_collection_amount ?? 0
  const actualCollectionNum =
    collectionMode === 'single'
      ? typeof singleCollectedAmount === 'number'
        ? singleCollectedAmount
        : 0
      : totalMixedCollected
  const isCollectionEntered =
    collectionMode === 'single' ? singleCollectedAmount !== '' : totalMixedCollected > 0
  const collectionDiff =
    task?.requires_collection && isCollectionEntered
      ? Number((actualCollectionNum - expectedCollection).toFixed(2))
      : 0
  const hasCollectionDiscrepancy =
    task?.requires_collection && isCollectionEntered && Math.abs(collectionDiff) > 0.009

  if (!isOpen || !task) return null

  const currencySymbol =
    (task.expected_collection_currency || task.expected_payment_currency) === 'USD' ? 'US$' : 'C$'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      let uploadedEvidenceUrl: string | null = null
      if (evidenceFile) {
        setIsUploadingEvidence(true)
        try {
          uploadedEvidenceUrl = await uploadTaskEvidence(evidenceFile)
        } catch (uploadErr) {
          console.warn('[CompleteTaskModal] Error al subir comprobante:', uploadErr)
          toast.warning('Aviso', 'La foto no se pudo subir a la nube, pero se guardará el registro.')
        } finally {
          setIsUploadingEvidence(false)
        }
      }

      if (outcome === 'completed') {
        const paymentBreakdown: TaskPaymentBreakdown = {}
        const notesParts: string[] = []

        // 1. Manejo de Compras / Pagos
        if (task.requires_payment) {
          const paidNum = typeof actualPaidAmount === 'number' ? actualPaidAmount : 0
          paymentBreakdown.actual_paid_amount = paidNum
          paymentBreakdown.invoice_number = invoiceNumber.trim() || undefined
          paymentBreakdown.paid_method = paidMethod

          if (hasPaymentDiscrepancy) {
            if (!paymentDiscrepancyReason.trim()) {
              toast.error(
                'Justificación Requerida',
                'Debes justificar la diferencia entre el monto estimado y el monto pagado.'
              )
              return
            }
            paymentBreakdown.discrepancy_payment_reason = paymentDiscrepancyReason.trim()
            notesParts.push(
              `⚠️ Discrepancia Compra (${
                paymentDiff > 0
                  ? `+${currencySymbol}${paymentDiff.toFixed(2)}`
                  : `-${currencySymbol}${Math.abs(paymentDiff).toFixed(2)}`
              }): ${paymentDiscrepancyReason.trim()}`
            )
          }

          notesParts.push(
            `Pagado: ${currencySymbol}${paidNum.toFixed(2)} (${
              paidMethod === 'cash'
                ? 'Efectivo'
                : paidMethod === 'bank_transfer'
                ? 'Transferencia'
                : 'Cheque'
            })`
          )
          if (invoiceNumber.trim()) {
            notesParts.push(`Factura/Recibo: ${invoiceNumber.trim()}`)
          }
        }

        // 2. Manejo de Cobros
        if (task.requires_collection) {
          if (hasCollectionDiscrepancy) {
            if (!collectionDiscrepancyReason.trim()) {
              toast.error(
                'Justificación Requerida',
                'Debes justificar la diferencia entre el monto esperado y el monto cobrado al cliente.'
              )
              return
            }
            paymentBreakdown.discrepancy_collection_reason = collectionDiscrepancyReason.trim()
            notesParts.push(
              `⚠️ Discrepancia Cobro (${
                collectionDiff > 0
                  ? `+${currencySymbol}${collectionDiff.toFixed(2)}`
                  : `-${currencySymbol}${Math.abs(collectionDiff).toFixed(2)}`
              }): ${collectionDiscrepancyReason.trim()}`
            )
          }

          if (collectionMode === 'single') {
            const collectedNum =
              typeof singleCollectedAmount === 'number' ? singleCollectedAmount : 0

            if (singlePaymentMethod === 'cash') {
              paymentBreakdown.cash_amount = collectedNum
              notesParts.push(`Cobrado Efectivo: ${currencySymbol}${collectedNum.toFixed(2)}`)
            } else if (
              singlePaymentMethod === 'bank_transfer' ||
              singlePaymentMethod === 'mobile_wallet'
            ) {
              paymentBreakdown.transfer_amount = collectedNum
              paymentBreakdown.transfer_bank = singleBank
              paymentBreakdown.transfer_reference = singleReference.trim() || undefined
              notesParts.push(
                `Cobrado Transferencia ${singleBank}: ${currencySymbol}${collectedNum.toFixed(
                  2
                )}${singleReference.trim() ? ` (Ref: ${singleReference.trim()})` : ''}`
              )
            } else if (singlePaymentMethod === 'cheque') {
              paymentBreakdown.cheque_amount = collectedNum
              paymentBreakdown.cheque_bank = singleBank
              paymentBreakdown.cheque_number = singleChequeNumber.trim() || undefined
              notesParts.push(
                `Cobrado Cheque ${singleBank}: ${currencySymbol}${collectedNum.toFixed(
                  2
                )}${singleChequeNumber.trim() ? ` (No. CK: ${singleChequeNumber.trim()})` : ''}`
              )
            }
          } else {
            // Modo mixto
            const cashNum = typeof mixedCash === 'number' ? mixedCash : 0
            const transferNum = typeof mixedTransfer === 'number' ? mixedTransfer : 0
            const chequeNum = typeof mixedCheque === 'number' ? mixedCheque : 0

            if (cashNum > 0) {
              paymentBreakdown.cash_amount = cashNum
              notesParts.push(`Efectivo: ${currencySymbol}${cashNum.toFixed(2)}`)
            }
            if (transferNum > 0) {
              paymentBreakdown.transfer_amount = transferNum
              paymentBreakdown.transfer_bank = mixedTransferBank
              paymentBreakdown.transfer_reference = mixedTransferRef.trim() || undefined
              notesParts.push(
                `Transferencia ${mixedTransferBank}: ${currencySymbol}${transferNum.toFixed(
                  2
                )}${mixedTransferRef.trim() ? ` (Ref: ${mixedTransferRef.trim()})` : ''}`
              )
            }
            if (chequeNum > 0) {
              paymentBreakdown.cheque_amount = chequeNum
              paymentBreakdown.cheque_bank = mixedChequeBank
              paymentBreakdown.cheque_number = mixedChequeNumber.trim() || undefined
              notesParts.push(
                `Cheque ${mixedChequeBank}: ${currencySymbol}${chequeNum.toFixed(
                  2
                )}${mixedChequeNumber.trim() ? ` (No. CK: ${mixedChequeNumber.trim()})` : ''}`
              )
            }
          }
        }

        if (notes.trim()) {
          notesParts.push(`Obs: ${notes.trim()}`)
        }

        const finalNotes = notesParts.join(' | ')

        await changeStatus({
          task_id: task.id,
          new_status: 'completed',
          notes: finalNotes,
          payment_breakdown: paymentBreakdown,
          evidence_url: uploadedEvidenceUrl || undefined,
        })

        toast.success(
          'Tarea Finalizada',
          `La tarea ${task.code} se completó con éxito.${uploadedEvidenceUrl ? ' Foto de comprobante guardada.' : ''}`
        )
      } else if (outcome === 'retry_today') {
        const metadata = (task.metadata || {}) as Record<string, unknown>
        const currentRetries = (typeof metadata.retry_count === 'number' ? metadata.retry_count : 0) + 1

        await changeStatus({
          task_id: task.id,
          new_status: 'assigned',
          notes: `Reintento hoy (${currentRetries}° intento): ${retryReason}${notes.trim() ? ` - Obs: ${notes.trim()}` : ''}`,
          metadata: {
            ...metadata,
            retry_count: currentRetries,
            last_retry_reason: retryReason,
            last_retry_notes: notes.trim(),
            last_retry_at: new Date().toISOString(),
          },
        })

        toast.success(
          'Pausada para Reintentar',
          `La parada ${task.code} volvió a tu lista de hoy. Ya puedes iniciar otra ruta.`
        )
      } else {
        await changeStatus({
          task_id: task.id,
          new_status: 'not_completed',
          notes: `Motivo: ${failureReason}. ${notes.trim()}`,
          evidence_url: uploadedEvidenceUrl || undefined,
        })
        toast.warning(
          'Incidencia Registrada',
          `La tarea ${task.code} fue marcada como no completada.${uploadedEvidenceUrl ? ' Foto de respaldo guardada.' : ''}`
        )
      }
      onClose()
    } catch (err: unknown) {
      toast.error('Error al actualizar tarea', (err as Error)?.message || 'No se pudo guardar el resultado.')
    }
  }

  // Subcomponente de Foto de Comprobante / POD
  const renderPhotoSection = () => (
    <div className="p-3.5 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-2.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-indigo-600" />
          <span>Foto de Comprobante / Prueba de Entrega</span>
        </label>
        <span className="text-2xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
          {outcome === 'completed' ? 'Opcional / Recomendado' : 'Evidencia'}
        </span>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelect}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      {evidencePreviewUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
          <img
            src={evidencePreviewUrl}
            alt="Comprobante capturado"
            className="w-full h-40 object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="px-3 py-1.5 bg-white/90 hover:bg-white text-slate-900 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Retomar</span>
            </button>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Quitar</span>
            </button>
          </div>
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-2xs px-2.5 py-1 rounded-lg flex items-center justify-between">
            <span className="truncate max-w-[180px] font-mono">{evidenceFile?.name || 'Foto tomada'}</span>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="text-rose-300 hover:text-rose-100 font-bold ml-2 cursor-pointer"
            >
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-3 bg-white border border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-xl text-center transition cursor-pointer shadow-2xs group"
          >
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-full mb-1 group-hover:scale-105 transition-transform">
              <Camera className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-900">Tomar Foto</span>
            <span className="text-2xs text-slate-500">Usa la cámara</span>
          </button>

          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl text-center transition cursor-pointer shadow-2xs group"
          >
            <div className="p-2 bg-slate-100 text-slate-700 rounded-full mb-1 group-hover:scale-105 transition-transform">
              <ImageIcon className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-900">Galería</span>
            <span className="text-2xs text-slate-500">Subir archivo</span>
          </button>
        </div>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1 rounded-full hover:bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>

        <div>
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Gestionar Resultado de Tarea
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {task.code} — <span className="font-sans font-bold text-slate-800">{task.title}</span>
          </p>
        </div>

        {/* Selector de 3 Opciones: Completada / Reintentar Hoy / No Completada */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setOutcome('completed')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer text-center ${
              outcome === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>Completada</span>
          </button>

          <button
            type="button"
            onClick={() => setOutcome('retry_today')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer text-center ${
              outcome === 'retry_today'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Reintentar</span>
          </button>

          <button
            type="button"
            onClick={() => setOutcome('not_completed')}
            className={`py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer text-center ${
              outcome === 'not_completed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="h-3.5 w-3.5 shrink-0" />
            <span>No Entregada</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {outcome === 'completed' ? (
            <>
              {/* ─── 🛒 SECCIÓN DE COMPRA / PAGO A PROVEEDOR ─── */}
              {task.requires_payment && (
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <Receipt className="h-4 w-4 text-amber-700" />
                      Registro de Compra / Pago a Proveedor
                    </span>
                    {task.expected_payment_amount && (
                      <span className="text-2xs font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        Estimado: {currencySymbol}
                        {task.expected_payment_amount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-wider text-amber-900 mb-1">
                        Monto Real Pagado ({currencySymbol}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Monto pagado"
                        value={actualPaidAmount}
                        onChange={(e) =>
                          setActualPaidAmount(e.target.value ? Number(e.target.value) : '')
                        }
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 shadow-2xs"
                      />
                    </div>

                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-wider text-amber-900 mb-1">
                        No. Factura / Ticket / Recibo
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: F-10492 o Ticket #33"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-wider text-amber-900 mb-1">
                      Método Utilizado para Pagar
                    </label>
                    <select
                      value={paidMethod}
                      onChange={(e) => setPaidMethod(e.target.value as PaymentMethod | 'cheque')}
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 shadow-2xs font-medium"
                    >
                      <option value="cash">💵 Efectivo (Dinero en mano / viáticos)</option>
                      <option value="bank_transfer">📲 Transferencia realizada por la empresa</option>
                      <option value="cheque">📑 Cheque entregado al proveedor</option>
                    </select>
                  </div>

                  {/* Alerta y Justificación si hay Discrepancia en Compra */}
                  {hasPaymentDiscrepancy && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-900">
                            Diferencia detectada en la compra:
                          </p>
                          <p className="text-2xs text-rose-700">
                            Estimado {currencySymbol}
                            {expectedPayment.toFixed(2)} vs Pagado {currencySymbol}
                            {actualPaymentNum.toFixed(2)} (
                            <span className="font-bold font-mono">
                              {paymentDiff > 0 ? `+${paymentDiff.toFixed(2)}` : paymentDiff.toFixed(2)}
                            </span>
                            )
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-2xs font-bold uppercase text-rose-900 mb-1">
                          Justificación de la Diferencia *
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Explica por qué varió el precio de compra respecto al estimado..."
                          value={paymentDiscrepancyReason}
                          onChange={(e) => setPaymentDiscrepancyReason(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── 💰 SECCIÓN DE COBRO AL CLIENTE ─── */}
              {task.requires_collection && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Banknote className="h-4 w-4 text-emerald-700" />
                      Registro de Cobro al Cliente
                    </span>
                    {task.expected_collection_amount && (
                      <span className="text-2xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Esperado: {currencySymbol}
                        {task.expected_collection_amount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Selector de Modo: Pago Único vs Pago Mixto/Desglosado */}
                  <div className="flex items-center gap-1 p-1 bg-emerald-100/70 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCollectionMode('single')}
                      className={`flex-1 py-1.5 text-2xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        collectionMode === 'single'
                          ? 'bg-white text-emerald-900 shadow-xs'
                          : 'text-emerald-800 hover:text-emerald-950'
                      }`}
                    >
                      <DollarSign className="h-3 w-3" />
                      <span>Pago Único</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionMode('mixed')}
                      className={`flex-1 py-1.5 text-2xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1 ${
                        collectionMode === 'mixed'
                          ? 'bg-white text-emerald-900 shadow-xs'
                          : 'text-emerald-800 hover:text-emerald-950'
                      }`}
                    >
                      <Split className="h-3 w-3" />
                      <span>Pago Mixto / Múltiple</span>
                    </button>
                  </div>

                  {collectionMode === 'single' ? (
                    /* ─── MODO ÚNICO ─── */
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                            Monto Cobrado ({currencySymbol}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="Monto recibido"
                            value={singleCollectedAmount}
                            onChange={(e) =>
                              setSingleCollectedAmount(e.target.value ? Number(e.target.value) : '')
                            }
                            className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                            Método de Pago
                          </label>
                          <select
                            value={singlePaymentMethod}
                            onChange={(e) =>
                              setSinglePaymentMethod(e.target.value as PaymentMethod | 'cheque')
                            }
                            className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs font-medium"
                          >
                            <option value="cash">💵 Efectivo</option>
                            <option value="bank_transfer">📲 Transferencia Bancaria</option>
                            <option value="mobile_wallet">📱 Billetera Móvil</option>
                            <option value="cheque">📑 Cheque</option>
                          </select>
                        </div>
                      </div>

                      {(singlePaymentMethod === 'bank_transfer' ||
                        singlePaymentMethod === 'mobile_wallet') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                              Banco de Destino
                            </label>
                            <select
                              value={singleBank}
                              onChange={(e) => setSingleBank(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs font-medium"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                              No. Referencia / Comprobante
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: 94810238"
                              value={singleReference}
                              onChange={(e) => setSingleReference(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-mono bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs"
                            />
                          </div>
                        </div>
                      )}

                      {singlePaymentMethod === 'cheque' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                              Banco Emisor del Cheque
                            </label>
                            <select
                              value={singleBank}
                              onChange={(e) => setSingleBank(e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs font-medium"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                              Número del Cheque *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: CK-000491"
                              value={singleChequeNumber}
                              onChange={(e) => setSingleChequeNumber(e.target.value)}
                              className="w-full px-3 py-2 text-xs font-mono bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ─── MODO MIXTO ─── */
                    <div className="space-y-3">
                      {/* Efectivo */}
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200">
                        <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                          💵 Porción en Efectivo ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={mixedCash}
                          onChange={(e) =>
                            setMixedCash(e.target.value ? Number(e.target.value) : '')
                          }
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                        />
                      </div>

                      {/* Transferencia */}
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                              📲 Porción Transferencia ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={mixedTransfer}
                              onChange={(e) =>
                                setMixedTransfer(e.target.value ? Number(e.target.value) : '')
                              }
                              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Banco
                            </label>
                            <select
                              value={mixedTransferBank}
                              onChange={(e) => setMixedTransferBank(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {typeof mixedTransfer === 'number' && mixedTransfer > 0 && (
                          <input
                            type="text"
                            placeholder="No. de Referencia transferencia"
                            value={mixedTransferRef}
                            onChange={(e) => setMixedTransferRef(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}
                      </div>

                      {/* Cheque */}
                      <div className="p-2.5 bg-white rounded-xl border border-emerald-200 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                              📑 Porción en Cheque ({currencySymbol})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={mixedCheque}
                              onChange={(e) =>
                                setMixedCheque(e.target.value ? Number(e.target.value) : '')
                              }
                              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-2xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                              Banco del Cheque
                            </label>
                            <select
                              value={mixedChequeBank}
                              onChange={(e) => setMixedChequeBank(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        {typeof mixedCheque === 'number' && mixedCheque > 0 && (
                          <input
                            type="text"
                            placeholder="Número del cheque *"
                            required
                            value={mixedChequeNumber}
                            onChange={(e) => setMixedChequeNumber(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                          />
                        )}
                      </div>

                      {/* Total Cobrado Mixto */}
                      <div className="flex items-center justify-between p-2.5 bg-emerald-100/80 rounded-xl border border-emerald-300">
                        <span className="text-xs font-bold text-emerald-950">Total Recaudado:</span>
                        <span className="text-sm font-mono font-black text-emerald-900">
                          {currencySymbol}
                          {totalMixedCollected.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Alerta y Justificación si hay Discrepancia en Cobro */}
                  {hasCollectionDiscrepancy && (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                      <div className="flex items-start gap-2">
                        <DollarSign className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-rose-900">
                            Diferencia detectada en el cobro:
                          </p>
                          <p className="text-2xs text-rose-700">
                            Esperado {currencySymbol}
                            {expectedCollection.toFixed(2)} vs Cobrado {currencySymbol}
                            {actualCollectionNum.toFixed(2)} (
                            <span className="font-bold font-mono">
                              {collectionDiff > 0
                                ? `+${collectionDiff.toFixed(2)}`
                                : collectionDiff.toFixed(2)}
                            </span>
                            )
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-2xs font-bold uppercase text-rose-900 mb-1">
                          Justificación de la Diferencia *
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Explica por qué el cliente pagó una cantidad distinta a la esperada (ej: Descuento acordado con oficina, pago parcial, propina extra...)"
                          value={collectionDiscrepancyReason}
                          onChange={(e) => setCollectionDiscrepancyReason(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ─── 📸 FOTO DE COMPROBANTE / PRUEBA DE ENTREGA ─── */}
              {renderPhotoSection()}

              {/* Notas de Entrega */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas de Entrega / Firma o Comprobante
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Entregado a recepcionista en 2do piso, sello recibido..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 resize-none font-medium shadow-2xs"
                />
              </div>
            </>
          ) : outcome === 'retry_today' ? (
            /* 🔄 REINTENTAR HOY / PAUSAR */
            <div className="space-y-3.5">
              <div className="p-3.5 bg-amber-50 border border-amber-200/90 rounded-2xl space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <Clock className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Pausa de Gestión para Reintentar Hoy</span>
                </div>
                <p className="text-2xs text-amber-800 leading-relaxed font-medium">
                  Esta parada volverá a tu lista de tareas activas de hoy. <strong>Tu cola quedará liberada al instante</strong> para que puedas iniciar la ruta hacia otra gestión y volver a este punto más tarde.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Motivo de la Pausa / Reintento *
                </label>
                <select
                  value={retryReason}
                  onChange={(e) => setRetryReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-medium shadow-2xs"
                >
                  <option value="Proveedor o contacto ausente">Proveedor o contacto ausente / no estaba en el lugar</option>
                  <option value="Cliente o proveedor pidió volver más tarde">Cliente / Proveedor solicitó regresar más tarde</option>
                  <option value="Paquete aún no empacado / no listo">Paquete o producto aún no estaba empacado / listo</option>
                  <option value="Lugar cerrado temporalmente (almuerzo/horario)">Lugar cerrado temporalmente (almuerzo / horario)</option>
                  <option value="Fila o espera excesiva en el local">Fila o tiempo de espera temporal excesivo</option>
                  <option value="Contratiempo temporal en la zona">Contratiempo temporal en la zona</option>
                  <option value="Otro motivo temporal">Otro motivo temporal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Hora tentativa de retorno / Observación
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Regreso a la 1:30 PM después de la parada 04..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-900 resize-none font-medium shadow-2xs"
                />
              </div>
            </div>
          ) : (
            /* ❌ INCIDENCIA / NO COMPLETADA DEFINITIVA */
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-2xl text-2xs text-rose-900 leading-relaxed font-medium">
                ⚠️ Marca esta opción solo si la tarea <strong>no se podrá realizar definitivamente hoy</strong> (ej. rechazo total del pedido).
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Motivo de Incidencia Definitiva *
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 font-medium shadow-2xs"
                >
                  <option value="Cliente ausente definitivo">Cliente ausente / no responde llamadas</option>
                  <option value="Dirección incorrecta">Dirección incorrecta o inalcanzable</option>
                  <option value="Rechazado por cliente">Pedido o gestión rechazada por el cliente</option>
                  <option value="Falta de dinero">Cliente no contaba con el dinero</option>
                  <option value="Tienda/Proveedor cerrado">Tienda o proveedor cerrado / sin stock</option>
                  <option value="Problema mecánico">Falla mecánica / Contratiempo grave en ruta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Detalles Adicionales de la Incidencia *
                </label>
                <textarea
                  rows={3}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Explique lo ocurrido para el reporte de administración..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white text-slate-900 resize-none font-medium shadow-2xs"
                />
              </div>

              {/* Foto de Incidencia / Respaldo opcional */}
              {renderPhotoSection()}
            </div>
          )}

          {statusError && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              {(statusError as Error).message}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isChangingStatus || isUploadingEvidence}
              className={`w-full py-3 px-4 text-xs font-extrabold text-white disabled:opacity-50 rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 ${
                outcome === 'completed'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : outcome === 'retry_today'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isChangingStatus || isUploadingEvidence ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploadingEvidence ? 'Subiendo fotografía...' : 'Guardando resultado...'}
                </>
              ) : outcome === 'completed' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Tarea Completada
                </>
              ) : outcome === 'retry_today' ? (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Pausar y Reintentar Hoy Más Tarde
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Registrar No Entrega Definitiva
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
