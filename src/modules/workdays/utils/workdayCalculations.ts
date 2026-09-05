export interface WorkdayCashSummary {
  initialCashNIO: number
  initialCashUSD: number
  advancesNIO: number
  advancesUSD: number
  collectionsNIO: number
  collectionsUSD: number
  expensesNIO: number
  expensesUSD: number
  alreadyReceivedNIO: number
  alreadyReceivedUSD: number
  cashInHandNIO: number
  cashInHandUSD: number
  isDiscrepancyNIO: boolean
  isDiscrepancyUSD: boolean
  isFullyDeliveredNIO: boolean
  isFullyDeliveredUSD: boolean
}

/**
 * Función helper centralizada para el cálculo único del estado financiero de una jornada.
 *
 * FÓRMULA:
 * Efectivo en Mano = Fondo Inicial + Entregas/Adelantos de Admin + Cobros Realizados - Gastos Registrados - Dinero Ya Recibido por Administración
 */
export function calculateWorkdayCashSummary(
  initialCash: number = 0,
  tasks: Array<{
    expected_collection_amount?: number | null
    expected_collection_currency?: string | null
    requires_collection?: boolean
    expected_payment_amount?: number | null
    expected_payment_currency?: string | null
    requires_payment?: boolean
    expected_payment_method?: string | null
    status?: string
    metadata?: any
  }> = [],
  movements: Array<{
    amount: number
    currency?: string | null
    direction: string
    movement_type: string
    description?: string | null
  }> = []
): WorkdayCashSummary {
  let initialCashNIO = initialCash || 0
  let initialCashUSD = 0
  let advancesNIO = 0
  let advancesUSD = 0
  let collectionsNIO = 0
  let collectionsUSD = 0
  let expensesNIO = 0
  let expensesUSD = 0
  let alreadyReceivedNIO = 0
  let alreadyReceivedUSD = 0

  // 1. Cobros y pagos de tareas completadas
  tasks.forEach((t) => {
    const isCompleted = !t.status || t.status === 'completed'
    if (isCompleted) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pb = (t as any).metadata?.payment_breakdown

      // Cobros a favor de la empresa
      if (t.requires_collection) {
        if (pb) {
          // Si hubo desglose explícito al completar la tarea, solo el efectivo físico entra a la billetera
          const cashAmt = typeof pb.cash_amount === 'number' ? pb.cash_amount : 0
          const curr = t.expected_collection_currency || 'NIO'
          if (curr === 'USD') collectionsUSD += cashAmt
          else collectionsNIO += cashAmt
        } else if (!t.expected_payment_method || t.expected_payment_method === 'cash') {
          // Si no hubo desglose registrado pero la tarea estaba configurada para cobro en efectivo
          const amt = t.expected_collection_amount || 0
          const curr = t.expected_collection_currency || 'NIO'
          if (curr === 'USD') collectionsUSD += amt
          else collectionsNIO += amt
        }
      }

      // Pagos a proveedores / compras realizadas en ruta
      if (t.requires_payment) {
        if (pb) {
          // Si se pagó en efectivo (o no se especificó método distinto), descuenta de la billetera
          const isCash = !pb.paid_method || pb.paid_method === 'cash'
          if (isCash) {
            const paidAmt =
              typeof pb.actual_paid_amount === 'number'
                ? pb.actual_paid_amount
                : typeof pb.cash_amount === 'number'
                ? pb.cash_amount
                : 0
            const curr = t.expected_payment_currency || 'NIO'
            if (curr === 'USD') expensesUSD += paidAmt
            else expensesNIO += paidAmt
          }
        } else if (!t.expected_payment_method || t.expected_payment_method === 'cash') {
          const amt = t.expected_payment_amount || 0
          const curr = t.expected_payment_currency || 'NIO'
          if (curr === 'USD') expensesUSD += amt
          else expensesNIO += amt
        }
      }
    }
  })

  // 2. Movimientos de caja (gastos e ingresos por recepciones/adelantos de administración)
  movements.forEach((m) => {
    const amt = m.amount || 0
    const curr = m.currency || 'NIO'
    const desc = (m.description || '').toLowerCase()

    // Movimientos anulados o de reversión de auditoría no impactan el balance activo
    if (desc.includes('[anulado]') || m.movement_type === 'void_adjustment') {
      return
    }

    // A. Entregas parciales / recepciones de efectivo entregadas a administración / caja
    const isPartialDelivery =
      ['cash_return', 'deposit', 'adjustment', 'reception', 'partial_delivery'].includes(
        m.movement_type
      ) ||
      desc.includes('recepción de efectivo') ||
      desc.includes('entrega parcial') ||
      desc.includes('entrega previa') ||
      desc.includes('devolución de efectivo')

    if (isPartialDelivery) {
      if (curr === 'USD') alreadyReceivedUSD += amt
      else alreadyReceivedNIO += amt
      return
    }

    // B. Fondo inicial
    const isInitialCashEntry =
      m.movement_type === 'initial_cash' || desc.includes('fondo inicial')

    if (isInitialCashEntry) {
      // Es el registro de auditoría de la entrega del fondo inicial.
      // Si la jornada tenía initialCash = 0, se lo asignamos aquí.
      // Si ya tenía initialCash > 0, NO se suma como adelanto extra para evitar duplicar el fondo inicial.
      if (curr === 'USD') {
        if (initialCashUSD === 0) initialCashUSD = amt
      } else {
        if (initialCashNIO === 0) initialCashNIO = amt
      }
      return
    }

    // C. Adelantos adicionales de administración durante el turno
    if (
      ['cash_advance', 'advance', 'additional_fund'].includes(m.movement_type) ||
      desc.includes('adelanto') ||
      desc.includes('fondo adicional')
    ) {
      if (curr === 'USD') advancesUSD += amt
      else advancesNIO += amt
      return
    }

    // D. Gastos y compras operativas en calle
    if (m.direction === 'expense') {
      if (curr === 'USD') expensesUSD += amt
      else expensesNIO += amt
    }
  })

  const cashInHandNIO =
    initialCashNIO + advancesNIO + collectionsNIO - expensesNIO - alreadyReceivedNIO
  const cashInHandUSD =
    initialCashUSD + advancesUSD + collectionsUSD - expensesUSD - alreadyReceivedUSD

  return {
    initialCashNIO,
    initialCashUSD,
    advancesNIO,
    advancesUSD,
    collectionsNIO,
    collectionsUSD,
    expensesNIO,
    expensesUSD,
    alreadyReceivedNIO,
    alreadyReceivedUSD,
    cashInHandNIO,
    cashInHandUSD,
    isDiscrepancyNIO: cashInHandNIO < -0.009,
    isDiscrepancyUSD: cashInHandUSD < -0.009,
    isFullyDeliveredNIO: Math.abs(cashInHandNIO) < 0.009,
    isFullyDeliveredUSD: Math.abs(cashInHandUSD) < 0.009,
  }
}
