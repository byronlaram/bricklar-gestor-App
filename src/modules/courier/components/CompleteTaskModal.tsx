import { useState, useEffect, useMemo } from 'react'
import {
  X,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  CreditCard,
  Receipt,
  FileCheck,
  Banknote,
  Split,
} from 'lucide-react'
import type { TaskWithCourier, TaskPaymentBreakdown } from '@/modules/tasks/types/task.types'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
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

  const [outcome, setOutcome] = useState<'completed' | 'not_completed'>('completed')
  const [notes, setNotes] = useState<string>('')
  const [failureReason, setFailureReason] = useState<string>('Cliente ausente')

  // ─── Estados para Compras / Pagos ───
  const [actualPaidAmount, setActualPaidAmount] = useState<number | ''>('')
  const [invoiceNumber, setInvoiceNumber] = useState<string>('')
  const [paidMethod, setPaidMethod] = useState<PaymentMethod | 'cheque'>('cash')

  // ─── Estados para Cobros a Clientes ───
  const [collectionMode, setCollectionMode] = useState<'single' | 'mixed'>('single')

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

  // Inicializar valores al abrir
  useEffect(() => {
    if (task) {
      setOutcome('completed')
      setNotes('')
      setFailureReason('Cliente ausente')

      // Compras
      setActualPaidAmount(task.expected_payment_amount ?? '')
      setInvoiceNumber('')
      setPaidMethod((task.expected_payment_method as PaymentMethod | 'cheque') || 'cash')

      // Cobros
      setCollectionMode('single')
      setSingleCollectedAmount(task.expected_collection_amount ?? '')
      setSinglePaymentMethod((task.expected_payment_method as PaymentMethod | 'cheque') || 'cash')
      setSingleBank('Banpro Grupo Promerica')
      setSingleReference('')
      setSingleChequeNumber('')

      setMixedCash(task.expected_collection_amount ?? '')
      setMixedTransfer('')
      setMixedTransferBank('Banpro Grupo Promerica')
      setMixedTransferRef('')
      setMixedCheque('')
      setMixedChequeBank('BAC Credomatic')
      setMixedChequeNumber('')
    }
  }, [task, isOpen])

  // Total recaudado calculado en modo mixto
  const totalMixedCollected = useMemo(() => {
    const cash = typeof mixedCash === 'number' ? mixedCash : 0
    const transfer = typeof mixedTransfer === 'number' ? mixedTransfer : 0
    const cheque = typeof mixedCheque === 'number' ? mixedCheque : 0
    return cash + transfer + cheque
  }, [mixedCash, mixedTransfer, mixedCheque])

  if (!isOpen || !task) return null

  const currencySymbol =
    (task.expected_collection_currency || task.expected_payment_currency) === 'USD' ? 'US$' : 'C$'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (outcome === 'completed') {
        const paymentBreakdown: TaskPaymentBreakdown = {}
        const notesParts: string[] = []

        // 1. Manejo de Compras / Pagos
        if (task.requires_payment) {
          const paidNum = typeof actualPaidAmount === 'number' ? actualPaidAmount : 0
          paymentBreakdown.actual_paid_amount = paidNum
          paymentBreakdown.invoice_number = invoiceNumber.trim() || undefined
          paymentBreakdown.paid_method = paidMethod

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
        })

        toast.success('Tarea Finalizada', `La tarea ${task.code} se completó con éxito.`)
      } else {
        await changeStatus({
          task_id: task.id,
          new_status: 'not_completed',
          notes: `Motivo: ${failureReason}. ${notes.trim()}`,
        })
        toast.warning('Incidencia Registrada', `La tarea ${task.code} fue marcada como no completada.`)
      }
      onClose()
    } catch (err: unknown) {
      toast.error('Error al finalizar tarea', (err as Error)?.message || 'No se pudo guardar el resultado.')
    }
  }

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
            Finalizar Gestión de Tarea
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            {task.code} — <span className="font-sans font-bold text-slate-800">{task.title}</span>
          </p>
        </div>

        {/* Selector Exitoso / No Completado */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setOutcome('completed')}
            className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              outcome === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Completada
          </button>

          <button
            type="button"
            onClick={() => setOutcome('not_completed')}
            className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              outcome === 'not_completed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="h-4 w-4" />
            No Completada
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
                </div>
              )}

              {/* ─── 💰 SECCIÓN DE COBRO A CLIENTE (PAGO ÚNICO O MIXTO) ─── */}
              {task.requires_collection && (
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4 text-emerald-700" />
                      Cobro al Cliente
                    </span>
                    {task.expected_collection_amount && (
                      <span className="text-2xs font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Esperado: {currencySymbol}
                        {task.expected_collection_amount.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Selector de Modo de Cobro: Único vs Mixto */}
                  <div className="flex items-center gap-2 p-1 bg-emerald-100/70 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCollectionMode('single')}
                      className={`flex-1 py-1.5 px-2 text-2xs font-bold rounded-lg transition cursor-pointer ${
                        collectionMode === 'single'
                          ? 'bg-white text-emerald-900 shadow-xs'
                          : 'text-emerald-800 hover:text-emerald-950'
                      }`}
                    >
                      Pago en 1 sola forma
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectionMode('mixed')}
                      className={`flex-1 py-1.5 px-2 text-2xs font-bold rounded-lg flex items-center justify-center gap-1 transition cursor-pointer ${
                        collectionMode === 'mixed'
                          ? 'bg-white text-emerald-900 shadow-xs'
                          : 'text-emerald-800 hover:text-emerald-950'
                      }`}
                    >
                      <Split className="h-3 w-3" />
                      Pago Mixto / Combinado
                    </button>
                  </div>

                  {/* MODO ÚNICO */}
                  {collectionMode === 'single' ? (
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                            Monto Recaudado ({currencySymbol}) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="Monto cobrado"
                            value={singleCollectedAmount}
                            onChange={(e) =>
                              setSingleCollectedAmount(
                                e.target.value ? Number(e.target.value) : ''
                              )
                            }
                            className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-emerald-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-2xs font-bold uppercase tracking-wider text-emerald-900 mb-1">
                            Forma de Pago
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
                            <option value="mobile_wallet">📱 Billetera Móvil (Banpro/Lafise)</option>
                            <option value="cheque">📑 Cheque (CK)</option>
                          </select>
                        </div>
                      </div>

                      {/* Campos condicionales si es Transferencia */}
                      {(singlePaymentMethod === 'bank_transfer' ||
                        singlePaymentMethod === 'mobile_wallet') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-white/90 border border-emerald-200 rounded-xl">
                          <div>
                            <label className="block text-2xs font-bold text-slate-600 mb-1">
                              Banco Destino
                            </label>
                            <select
                              value={singleBank}
                              onChange={(e) => setSingleBank(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-2xs font-bold text-slate-600 mb-1">
                              No. de Referencia
                            </label>
                            <input
                              type="text"
                              placeholder="Ej: TR-994821"
                              value={singleReference}
                              onChange={(e) => setSingleReference(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-slate-900"
                            />
                          </div>
                        </div>
                      )}

                      {/* Campos condicionales si es Cheque */}
                      {singlePaymentMethod === 'cheque' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 bg-white/90 border border-emerald-200 rounded-xl">
                          <div>
                            <label className="block text-2xs font-bold text-slate-600 mb-1">
                              Banco Emisor del Cheque
                            </label>
                            <select
                              value={singleBank}
                              onChange={(e) => setSingleBank(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-2xs font-bold text-slate-600 mb-1">
                              Número de Cheque *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej: CK-004821"
                              value={singleChequeNumber}
                              onChange={(e) => setSingleChequeNumber(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg text-slate-900"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* MODO MIXTO / DESGLOSADO */
                    <div className="space-y-3 pt-1">
                      {/* 1. Efectivo */}
                      <div className="p-2.5 bg-white border border-emerald-200 rounded-xl space-y-1">
                        <label className="block text-2xs font-bold text-slate-700 flex items-center gap-1">
                          <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                          Parte en Efectivo ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Monto en efectivo recibido"
                          value={mixedCash}
                          onChange={(e) =>
                            setMixedCash(e.target.value ? Number(e.target.value) : '')
                          }
                          className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-900"
                        />
                      </div>

                      {/* 2. Transferencia */}
                      <div className="p-2.5 bg-white border border-sky-200 rounded-xl space-y-2">
                        <label className="block text-2xs font-bold text-slate-700 flex items-center gap-1">
                          <CreditCard className="h-3.5 w-3.5 text-sky-600" />
                          Parte en Transferencia Bancaria ({currencySymbol})
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Monto transf."
                              value={mixedTransfer}
                              onChange={(e) =>
                                setMixedTransfer(e.target.value ? Number(e.target.value) : '')
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-900"
                            />
                          </div>
                          <div>
                            <select
                              value={mixedTransferBank}
                              onChange={(e) => setMixedTransferBank(e.target.value)}
                              className="w-full px-2 py-1.5 text-2xs bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="No. Referencia"
                              value={mixedTransferRef}
                              onChange={(e) => setMixedTransferRef(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-2xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 3. Cheque (CK) */}
                      <div className="p-2.5 bg-white border border-purple-200 rounded-xl space-y-2">
                        <label className="block text-2xs font-bold text-slate-700 flex items-center gap-1">
                          <FileCheck className="h-3.5 w-3.5 text-purple-600" />
                          Parte en Cheque Físico ({currencySymbol})
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="Monto cheque"
                              value={mixedCheque}
                              onChange={(e) =>
                                setMixedCheque(e.target.value ? Number(e.target.value) : '')
                              }
                              className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-900"
                            />
                          </div>
                          <div>
                            <select
                              value={mixedChequeBank}
                              onChange={(e) => setMixedChequeBank(e.target.value)}
                              className="w-full px-2 py-1.5 text-2xs bg-white border border-slate-200 rounded-lg text-slate-900 font-medium"
                            >
                              {BANK_OPTIONS.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="No. de Cheque *"
                              value={mixedChequeNumber}
                              onChange={(e) => setMixedChequeNumber(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-2xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg focus:bg-white text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Barra de Cuadre Total Mixto */}
                      <div className="flex items-center justify-between p-2.5 bg-emerald-100/60 rounded-xl text-xs font-bold text-emerald-950">
                        <span>Total Mixto Recaudado:</span>
                        <span className="font-mono text-sm">
                          {currencySymbol}
                          {totalMixedCollected.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
          ) : (
            /* INCIDENCIA / NO COMPLETADA */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">
                  Motivo de Incidencia / No Entrega *
                </label>
                <select
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 font-medium shadow-2xs"
                >
                  <option value="Cliente ausente">Cliente ausente o no responde</option>
                  <option value="Dirección incorrecta">Dirección incorrecta o inalcanzable</option>
                  <option value="Rechazado por cliente">Pedido o gestión rechazada por el cliente</option>
                  <option value="Falta de dinero">Cliente no contaba con el dinero</option>
                  <option value="Tienda/Proveedor cerrado">Tienda o proveedor cerrado / sin stock</option>
                  <option value="Problema mecánico">Falla mecánica / Contratiempo en ruta</option>
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
              disabled={isChangingStatus}
              className={`w-full py-3 px-4 text-xs font-extrabold text-white disabled:opacity-50 rounded-2xl shadow-md transition cursor-pointer flex items-center justify-center gap-2 ${
                outcome === 'completed'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isChangingStatus ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando resultado...
                </>
              ) : outcome === 'completed' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar Tarea Completada
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" />
                  Registrar Incidencia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
