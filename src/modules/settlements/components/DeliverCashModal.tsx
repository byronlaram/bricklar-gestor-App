import { useState, useEffect } from 'react'
import {
  HandCoins,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  History,
  Receipt,
  Banknote,
} from 'lucide-react'
import { useCouriers } from '@/modules/tasks/hooks/useCouriers'
import { useAuth } from '@/modules/auth/useAuth'
import { supabase } from '@/shared/lib/supabaseClient'
import { useQueryClient } from '@tanstack/react-query'
import type { Currency, WorkdayStatus } from '@/shared/types'
import { WORKDAY_STATUS_LABELS } from '@/shared/types'
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
  Avatar,
  Badge,
  useToast,
  ConfirmDialog,
} from '@/shared/components/ui'

export type DeliveryType = 'cash_advance' | 'initial_cash'

export interface DeliverCashModalProps {
  workdayId?: string
  courierName?: string
  branchId: string
  isOpen: boolean
  onClose: () => void
}

interface WorkdayDeliveryContextData {
  id: string
  courier_id: string
  courier_name: string
  courier_phone: string | null
  courier_avatar: string | null
  branch_name: string
  work_date: string
  start_time: string | null
  status: WorkdayStatus
  initial_cash_nio: number
  initial_cash_usd: number
  previous_advances_nio: number
  previous_advances_usd: number
}

interface DeliveryHistoryItem {
  id: string
  created_at: string
  amount: number
  currency: string
  movement_type: string
  description: string
}

export function DeliverCashModal({
  workdayId,
  courierName: initialCourierName,
  branchId,
  isOpen,
  onClose,
}: DeliverCashModalProps) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const { user, profile } = useAuth()
  const todayStr = new Date().toISOString().split('T')[0]

  const [selectedCourierId, setSelectedCourierId] = useState<string>('')
  const [selectedWorkdayId, setSelectedWorkdayId] = useState<string>(workdayId || '')
  const [amount, setAmount] = useState<number | ''>('')
  const [currency, setCurrency] = useState<Currency>('NIO')
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('cash_advance')
  const [observations, setObservations] = useState<string>('')

  const [isLoadingContext, setIsLoadingContext] = useState<boolean>(false)
  const [contextData, setContextData] = useState<WorkdayDeliveryContextData | null>(null)
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistoryItem[]>([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const { data: couriers = [] } = useCouriers(branchId)

  useEffect(() => {
    if (couriers.length > 0 && !selectedCourierId && !workdayId) {
      setSelectedCourierId(couriers[0].id)
    }
  }, [couriers, selectedCourierId, workdayId])

  useEffect(() => {
    if (workdayId) {
      setSelectedWorkdayId(workdayId)
    }
  }, [workdayId])

  // Cargar contexto financiero de la jornada e historial de entregas de efectivo
  useEffect(() => {
    if (!isOpen) return

    async function loadWorkdayContextAndHistory() {
      setIsLoadingContext(true)
      setFormError(null)

      try {
        let currentWorkdayId = selectedWorkdayId || workdayId
        let targetCourierId = selectedCourierId

        if (!currentWorkdayId && targetCourierId) {
          const { data: workdayRow } = await supabase
            .from('workdays')
            .select(`
              id, courier_id, branch_id, work_date, start_time, status, initial_cash,
              courier_profile:profiles!workdays_courier_id_fkey (id, full_name, display_name, phone, avatar_url),
              branch:branches!workdays_branch_id_fkey (id, name, code)
            `)
            .eq('courier_id', targetCourierId)
            .eq('work_date', todayStr)
            .maybeSingle()

          if (workdayRow) {
            currentWorkdayId = workdayRow.id
          }
        }

        if (!currentWorkdayId) {
          setContextData(null)
          setDeliveryHistory([])
          setIsLoadingContext(false)
          return
        }

        // 1. Obtener jornada
        const { data: wd, error: wdErr } = await supabase
          .from('workdays')
          .select(`
            id, courier_id, branch_id, work_date, start_time, status, initial_cash,
            courier_profile:profiles!workdays_courier_id_fkey (id, full_name, display_name, phone, avatar_url),
            branch:branches!workdays_branch_id_fkey (id, name, code)
          `)
          .eq('id', currentWorkdayId)
          .single()

        if (wdErr || !wd) {
          setContextData(null)
          setDeliveryHistory([])
          setIsLoadingContext(false)
          return
        }

        const cProfile = wd.courier_profile as any
        const bData = wd.branch as any

        // 2. Obtener movimientos de entregas de dinero a esta jornada (adelantos / fondos entregados)
        const { data: movements } = await supabase
          .from('cash_movements')
          .select('id, created_at, amount, currency, direction, movement_type, description')
          .eq('workday_id', currentWorkdayId)
          .order('created_at', { ascending: false })

        let previousAdvancesNIO = 0
        let previousAdvancesUSD = 0

        const historyList: DeliveryHistoryItem[] = []

        ;(movements || []).forEach((m) => {
          if (m.direction === 'income' && m.movement_type === 'cash_advance') {
            const amt = m.amount || 0
            if (m.currency === 'USD') previousAdvancesUSD += amt
            else previousAdvancesNIO += amt

            historyList.push({
              id: m.id,
              created_at: m.created_at,
              amount: amt,
              currency: m.currency || 'NIO',
              movement_type: m.movement_type,
              description: m.description,
            })
          }
        })

        setDeliveryHistory(historyList)

        setContextData({
          id: wd.id,
          courier_id: wd.courier_id,
          courier_name: cProfile?.display_name || cProfile?.full_name || initialCourierName || 'Motorizado',
          courier_phone: cProfile?.phone || null,
          courier_avatar: cProfile?.avatar_url || null,
          branch_name: bData?.name || 'Sucursal Principal',
          work_date: wd.work_date,
          start_time: wd.start_time,
          status: (wd.status as WorkdayStatus) || 'open',
          initial_cash_nio: wd.initial_cash || 0,
          initial_cash_usd: 0,
          previous_advances_nio: previousAdvancesNIO,
          previous_advances_usd: previousAdvancesUSD,
        })
      } catch (err: any) {
        console.error('Error al cargar contexto de entrega de efectivo:', err)
      } finally {
        setIsLoadingContext(false)
      }
    }

    loadWorkdayContextAndHistory()
  }, [isOpen, workdayId, selectedWorkdayId, selectedCourierId, todayStr, initialCourierName])

  if (!isOpen) return null

  // Cálculos de total entregado
  const initialCash = currency === 'USD' ? (contextData?.initial_cash_usd || 0) : (contextData?.initial_cash_nio || 0)
  const previousAdvances = currency === 'USD' ? (contextData?.previous_advances_usd || 0) : (contextData?.previous_advances_nio || 0)
  const totalDeliveredSoFar = initialCash + previousAdvances

  const numAmount = typeof amount === 'number' ? amount : 0
  const newTotalDelivered = totalDeliveredSoFar + numAmount

  // Validaciones del formulario
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!amount || numAmount <= 0) {
      setFormError('Ingresa un monto válido a entregar mayor a 0.')
      return
    }

    if (contextData && contextData.status === 'closed') {
      setFormError('No se puede entregar dinero sobre una jornada que ya ha sido cerrada.')
      return
    }

    setShowConfirmModal(true)
  }

  // Guardar en base de datos al confirmar
  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)
    setFormError(null)

    try {
      let targetWorkdayId = contextData?.id || selectedWorkdayId || workdayId
      let targetCourierId = contextData?.courier_id || selectedCourierId

      if (!targetWorkdayId) {
        throw new Error('No se encontró una jornada activa para registrar la entrega de efectivo.')
      }

      const adminName = profile?.display_name || profile?.full_name || user?.email || 'Administrador'
      const label = deliveryType === 'initial_cash' ? 'Fondo inicial' : 'Adelanto / Fondo adicional'
      const fullDesc = `Entrega de efectivo (${label})${observations.trim() ? `: ${observations.trim()}` : ''} | Reg. por: ${adminName}`

      // Si es fondo inicial y el valor en workday es 0, actualizamos también initial_cash en workdays
      if (deliveryType === 'initial_cash' && contextData && contextData.initial_cash_nio === 0 && currency === 'NIO') {
        await supabase
          .from('workdays')
          .update({ initial_cash: numAmount })
          .eq('id', targetWorkdayId)
      }

      // Inserción del movimiento de caja (cash_advance)
      const { data: movement, error: movErr } = await supabase
        .from('cash_movements')
        .insert({
          workday_id: targetWorkdayId,
          courier_id: targetCourierId,
          movement_type: 'cash_advance',
          direction: 'income',
          amount: numAmount,
          currency,
          payment_method: 'cash',
          description: fullDesc,
        })
        .select('id')
        .single()

      if (movErr) {
        throw new Error(movErr.message || 'Error al registrar la entrega de efectivo.')
      }

      // Registro en auditoría
      try {
        await supabase.rpc('log_audit_event', {
          p_action: 'cash_delivered',
          p_entity_type: 'cash_movement',
          p_entity_id: movement.id,
          p_entity_code: contextData?.work_date || todayStr,
          p_branch_id: branchId,
          p_changes: {
            admin_id: user?.id,
            admin_name: adminName,
            workday_id: targetWorkdayId,
            courier_id: targetCourierId,
            courier_name: contextData?.courier_name || initialCourierName,
            amount_delivered: numAmount,
            currency,
            delivery_type: deliveryType,
            total_before: totalDeliveredSoFar,
            total_after: newTotalDelivered,
            observations: observations.trim(),
          },
        })
      } catch (auditErr) {
        console.warn('[DeliverCash] Audit log warning:', auditErr)
      }

      toast.success('Entrega de efectivo registrada correctamente.')

      // Invalidad consultas react-query
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-kpis'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })

      setAmount('')
      setObservations('')
      onClose()
    } catch (err: any) {
      console.error('Error al entregar efectivo:', err)
      setFormError(err.message || 'Error al registrar la entrega de efectivo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedConfirmAmount = `${currency} ${numAmount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}`
  const courierDisplayName = contextData?.courier_name || initialCourierName || 'el motorizado'

  const handleSafeClose = () => {
    if (isSubmitting) return
    onClose()
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleSafeClose}
        closeOnBackdropClick={false}
        closeOnEscape={false}
      >
        <ModalContent size="lg" className="max-h-[90vh]">
          {/* Header Fijo */}
          <ModalHeader onClose={handleSafeClose} className="shrink-0 bg-white border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Banknote className="h-5 w-5" />
              </div>
              <div>
                <ModalTitle>Entrega de Efectivo al Motorizado</ModalTitle>
                <ModalDescription>
                  Registrar el dinero entregado al motorizado para su jornada.
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          {/* Formulario con Scroll Interno */}
          <form onSubmit={handlePreSubmit} className="flex flex-col flex-1 overflow-hidden">
            <ModalBody className="px-5 py-6 space-y-6 overflow-y-auto flex-1">

              {/* Selector de Motorizado si no hay uno fijo */}
              {!workdayId && !initialCourierName && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Seleccionar Motorizado <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedCourierId}
                    onChange={(e) => setSelectedCourierId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 font-medium"
                  >
                    {couriers.length === 0 ? (
                      <option value="">No hay motorizados activos en esta sucursal</option>
                    ) : (
                      couriers.map((c) => (
                        <option key={c.id} value={c.id}>
                          👤 {c.display_name || c.full_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* SECCIÓN 1 — Encabezado del motorizado */}
              {isLoadingContext ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse space-y-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-100 rounded-lg w-1/3" />
                      <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                    </div>
                  </div>
                </div>
              ) : contextData ? (
                <>
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs transition-all duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={contextData.courier_name}
                          src={contextData.courier_avatar || undefined}
                          size="sm"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {contextData.courier_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              {contextData.branch_name}
                            </span>
                            <span className="text-slate-300 text-xs">·</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              {new Date(contextData.work_date + 'T12:00:00').toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            {contextData.start_time && (
                              <>
                                <span className="text-slate-300 text-xs">·</span>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-slate-400" />
                                  {new Date(contextData.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={contextData.status === 'open' ? 'completed' : contextData.status === 'pending_settlement' ? 'pending' : 'neutral'}>
                          {WORKDAY_STATUS_LABELS[contextData.status] || contextData.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2 — Resumen de fondos entregados */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Fondos asignados actualmente · {currency === 'NIO' ? 'Córdobas' : 'Dólares'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col gap-1 shadow-xs">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Fondo Inicial</span>
                        <span className="text-sm font-bold text-slate-700 tabular-nums">
                          {currency === 'NIO' ? 'C$' : 'US$'}&nbsp;{initialCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex flex-col gap-1 shadow-xs">
                        <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Adelantos Adicionales</span>
                        <span className="text-sm font-bold text-blue-800 tabular-nums">
                          +{currency === 'NIO' ? 'C$' : 'US$'}&nbsp;{previousAdvances.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300 rounded-2xl p-3 flex flex-col gap-1 shadow-sm">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Total Entregado</span>
                        <span className="text-base font-black text-blue-900 tabular-nums">
                          {currency === 'NIO' ? 'C$' : 'US$'}&nbsp;{totalDeliveredSoFar.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-700 flex items-center gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>No se encontró una jornada activa para el motorizado seleccionado.</span>
                </div>
              )}

              {/* SECCIÓN 3 — Formulario de entrega */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Datos de la entrega
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Monto a Entregar *"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    className="font-bold tabular-nums text-base text-blue-900"
                  />

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600">Moneda *</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as Currency)}
                      className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 font-semibold"
                    >
                      <option value="NIO">Córdobas (C$)</option>
                      <option value="USD">Dólares (US$)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Tipo de Entrega *
                  </label>
                  <select
                    value={deliveryType}
                    onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 font-medium"
                  >
                    <option value="cash_advance">💵 Adelanto / Fondo adicional</option>
                    <option value="initial_cash">🪙 Fondo inicial de jornada</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-600">
                    Observaciones <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Ej: Entregado para viáticos de cambio o compra..."
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 resize-none"
                  />
                </div>
              </div>

              {/* SECCIÓN 4 — Resumen del movimiento */}
              {numAmount > 0 && contextData && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 text-center">
                    Vista previa de la entrega
                  </p>
                  <div className="flex flex-col items-center gap-0">
                    <div className="w-full max-w-[260px] bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-center shadow-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entregado antes</p>
                      <p className="text-xl font-bold text-slate-800 tabular-nums">
                        {currency === 'NIO' ? 'C$' : 'US$'}&nbsp;{totalDeliveredSoFar.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-px h-4 bg-slate-200" />
                      <div className="bg-blue-100 border border-blue-200 rounded-full px-4 py-1.5 flex flex-col items-center">
                        <span className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide">Entregas ahora</span>
                        <span className="text-sm font-black text-blue-800 tabular-nums">
                          +{currency === 'NIO' ? 'C$' : 'US$'}&nbsp;{numAmount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="w-px h-4 bg-slate-200" />
                    </div>

                    <div className="w-full max-w-[260px] bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3.5 text-center shadow-xs">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Nuevo total entregado</p>
                      <p className="text-xl font-bold text-blue-800 tabular-nums">
                        {currency === 'NIO' ? 'C$' : 'US$'}&nbsp;{newTotalDelivered.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error de Validación */}
              {formError && (
                <div className="text-xs text-rose-600 font-medium bg-rose-50 p-3.5 rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECCIÓN 5 — Historial de entregas en esta jornada */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    Entregas de esta jornada
                    {deliveryHistory.length > 0 && (
                      <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {deliveryHistory.length}
                      </span>
                    )}
                  </h3>
                  <span className="text-[10px] text-slate-400 italic">Solo consulta · Inmutable</span>
                </div>

                {deliveryHistory.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-2xl">
                    No se han registrado adelantos ni entregas adicionales en esta jornada.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {deliveryHistory.map((item) => {
                      const dateObj = new Date(item.created_at)
                      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      const dateStr = dateObj.toLocaleDateString('es-NI', { day: '2-digit', month: 'short', year: 'numeric' })

                      const descParts = item.description?.split(' | Reg. por: ')
                      const mainDesc = descParts?.[0]?.replace(/^Entrega de efectivo \([^)]+\)(: )?/, '') || ''
                      const registradoPor = descParts?.[1] || ''

                      return (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-slate-300"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-slate-400 mb-1">
                                {dateStr} · {timeStr}
                              </p>
                              <p className="font-semibold text-slate-800 text-sm leading-snug">Adelanto / Fondo adicional</p>
                              {registradoPor && (
                                <p className="text-[11px] text-slate-400 mt-1.5">
                                  Registrado por: <span className="text-slate-600 font-medium">{registradoPor}</span>
                                </p>
                              )}
                              {mainDesc && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Obs: <span className="text-slate-600">{mainDesc}</span>
                                </p>
                              )}
                            </div>
                            <div className="shrink-0 pt-4">
                              <span className="text-base font-bold text-blue-600 tabular-nums">
                                +{item.currency === 'NIO' ? 'C$' : 'US$'}&nbsp;{item.amount.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

            </ModalBody>

            {/* Footer Fijo */}
            <ModalFooter className="shrink-0 bg-white border-t border-slate-100 px-5 py-4 gap-3">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={handleSafeClose}
                disabled={isSubmitting}
                className="text-slate-500"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmitting}
                leftIcon={<HandCoins className="h-4 w-4" />}
                className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-transparent font-bold min-w-[190px] shadow-sm hover:shadow-md transition-all duration-200"
              >
                Guardar Entrega
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Diálogo Interactivo de Confirmación Previa */}
      <ConfirmDialog
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Confirmar Entrega de Efectivo"
        description={`¿Deseas registrar esta entrega de efectivo por ${formattedConfirmAmount} a ${courierDisplayName}? El movimiento quedará registrado en el historial de la jornada.`}
        confirmText="Sí, registrar entrega"
        cancelText="Revisar"
        variant="confirm"
        isLoading={isSubmitting}
        icon={<Receipt className="h-5 w-5 text-blue-600" />}
      />
    </>
  )
}
