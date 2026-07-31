import { useState, useEffect } from 'react'
import { X, Banknote, Plus, Loader2, DollarSign, User } from 'lucide-react'
import { useSettlementMutations } from '../hooks/useSettlements'
import { useCouriers } from '@/modules/tasks/hooks/useCouriers'
import { supabase } from '@/shared/lib/supabaseClient'
import { useQueryClient } from '@tanstack/react-query'
import type { Currency } from '@/shared/types'

interface AddCashAdvanceModalProps {
  workdayId?: string
  courierName?: string
  branchId: string
  isOpen: boolean
  onClose: () => void
}

export function AddCashAdvanceModal({
  workdayId,
  courierName,
  branchId,
  isOpen,
  onClose,
}: AddCashAdvanceModalProps) {
  const queryClient = useQueryClient()
  const todayStr = new Date().toISOString().split('T')[0]
  const [deliveryDate, setDeliveryDate] = useState<string>(todayStr)
  const [selectedCourierId, setSelectedCourierId] = useState<string>('')
  const [amount, setAmount] = useState<number | ''>('')
  const [concept, setConcept] = useState<string>('Fondo Inicial de Turno')
  const [description, setDescription] = useState<string>('')
  const [currency, setCurrency] = useState<Currency>('NIO')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const { data: couriers = [] } = useCouriers(branchId)
  const { addMovement } = useSettlementMutations()

  useEffect(() => {
    if (couriers.length > 0 && !selectedCourierId) {
      setSelectedCourierId(couriers[0].id)
    }
  }, [couriers, selectedCourierId])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!amount || Number(amount) <= 0) {
      setFormError('Ingresa un monto válido mayor a 0.')
      return
    }

    setIsSubmitting(true)

    try {
      let targetWorkdayId = workdayId
      let targetCourierId = selectedCourierId

      // Si no tenemos workdayId explícito, buscar o crear la jornada abierta para la fecha seleccionada
      if (!targetWorkdayId) {
        if (!targetCourierId) {
          throw new Error('Selecciona un motorizado.')
        }

        const targetDate = deliveryDate || todayStr

        // 1. Buscar si ya existe una jornada en esa fecha para este motorizado
        const { data: existingWorkday } = await supabase
          .from('workdays')
          .select('id')
          .eq('courier_id', targetCourierId)
          .eq('work_date', targetDate)
          .maybeSingle()

        if (existingWorkday) {
          targetWorkdayId = existingWorkday.id
        } else {
          // 2. Si no existe, crear la jornada laboral automáticamente con initial_cash = amount para esa fecha
          const { data: newWorkday, error: createErr } = await supabase
            .from('workdays')
            .insert({
              courier_id: targetCourierId,
              branch_id: branchId,
              work_date: targetDate,
              status: 'open',
              start_time: new Date().toISOString(),
              initial_km: 0,
              initial_cash: Number(amount),
              notes: `Jornada iniciada con entrega de efectivo de administración (${targetDate}).`,
            })
            .select('id')
            .single()

          if (createErr || !newWorkday) {
            throw new Error(createErr?.message || 'Error al iniciar jornada para el motorizado.')
          }

          targetWorkdayId = newWorkday.id
        }
      }

      // Registrar el movimiento de entrega de efectivo (cash_advance)
      const fullDesc = `${concept}${description.trim() ? `: ${description.trim()}` : ''}`

      await addMovement({
        workday_id: targetWorkdayId!,
        movement_type: 'cash_advance',
        direction: 'income',
        amount: Number(amount),
        currency,
        payment_method: 'cash',
        description: fullDesc,
      })

      // Invalidar consultas para refrescar la tabla de jornadas inmediatamente
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
      queryClient.invalidateQueries({ queryKey: ['active-workday'] })

      setAmount('')
      setDescription('')
      onClose()
    } catch (err: any) {
      console.error('Error al entregar efectivo:', err)
      setFormError(err.message || 'Error al procesar la entrega de efectivo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Entrega de Efectivo / Fondo de Caja</h2>
            <p className="text-xs text-foreground-muted">
              {courierName ? (
                <>
                  Motorizado: <span className="font-semibold text-foreground">{courierName}</span>
                </>
              ) : (
                'Asigna dinero inicial o adelantos de ruta a un motorizado.'
              )}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Fecha de Entrega <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                required
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
              />
            </div>

            {/* Si no hay motorizado preseleccionado, mostrar selector de motorizados */}
            {!workdayId && !courierName && (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Seleccionar Motorizado <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedCourierId}
                  onChange={(e) => setSelectedCourierId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
                >
                  {couriers.length === 0 ? (
                    <option value="">No hay motorizados en esta sucursal</option>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Monto Entregado <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Moneda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              >
                <option value="NIO">Córdobas (C$)</option>
                <option value="USD">Dólares (US$)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Concepto de Entrega <span className="text-destructive">*</span>
            </label>
            <select
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            >
              <option value="Fondo Inicial de Turno">💵 Fondo Inicial de Turno</option>
              <option value="Adelanto para Compras / Encargos">🛒 Adelanto para Compras / Encargos</option>
              <option value="Dinero para Pago de Encomiendas">📦 Dinero para Pago de Encomiendas</option>
              <option value="Refuerzo de Caja de Ruta">⛽ Refuerzo de Caja / Viáticos</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Observaciones / Detalle (Opcional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Entregado en efectivo en caja para compras del turno..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>

          {formError && (
            <p className="text-xs text-destructive font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/20">
              {formError}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando Entrega...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Registrar y Entregar Efectivo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
