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
    status?: string
  }> = [],
  movements: Array<{
    amount: number
    currency?: string | null
    direction: string
    movement_type: string
  }> = []
): WorkdayCashSummary {
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
      // Cobros a favor de la empresa
      if (t.requires_collection && t.expected_collection_amount) {
        const amt = t.expected_collection_amount
        const curr = t.expected_collection_currency || 'NIO'
        if (curr === 'USD') collectionsUSD += amt
        else collectionsNIO += amt
      }
      // Pagos a proveedores / compras realizadas en ruta
      if (t.requires_payment && t.expected_payment_amount) {
        const amt = t.expected_payment_amount
        const curr = t.expected_payment_currency || 'NIO'
        if (curr === 'USD') expensesUSD += amt
        else expensesNIO += amt
      }
    }
  })

  // 2. Movimientos de caja (gastos e ingresos por recepciones/adelantos de administración)
  movements.forEach((m) => {
    const amt = m.amount || 0
    const curr = m.currency || 'NIO'

    if (m.direction === 'expense') {
      if (curr === 'USD') expensesUSD += amt
      else expensesNIO += amt
    } else if (m.direction === 'income') {
      if (['cash_advance', 'advance', 'initial_cash'].includes(m.movement_type)) {
        if (curr === 'USD') advancesUSD += amt
        else advancesNIO += amt
      } else if (['cash_return', 'deposit', 'adjustment', 'settlement_payment'].includes(m.movement_type)) {
        if (curr === 'USD') alreadyReceivedUSD += amt
        else alreadyReceivedNIO += amt
      }
    }
  })

  const initialCashNIO = initialCash || 0
  const initialCashUSD = 0

  const cashInHandNIO = initialCashNIO + advancesNIO + collectionsNIO - expensesNIO - alreadyReceivedNIO
  const cashInHandUSD = initialCashUSD + advancesUSD + collectionsUSD - expensesUSD - alreadyReceivedUSD

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
