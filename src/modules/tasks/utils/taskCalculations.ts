import type { Task, TaskWithCourier } from '../types/task.types'

export interface TaskFinancialDetails {
  // Pagos / Compras / Viáticos
  requiresPayment: boolean
  expectedPaymentAmount: number
  actualPaidAmount: number
  displayPaymentAmount: number
  isActualPaid: boolean
  paidMethod?: string
  invoiceNumber?: string
  paymentDiscrepancy: number
  paymentDiscrepancyReason?: string

  // Cobros / Entregas
  requiresCollection: boolean
  expectedCollectionAmount: number
  actualCollectionAmount: number
  displayCollectionAmount: number
  isActualCollection: boolean
  collectionMethod?: string
  collectionDiscrepancy: number
  collectionDiscrepancyReason?: string

  // Símbolo de moneda
  currencySymbol: string
}

export function getTaskFinancialDetails(task: Task | TaskWithCourier): TaskFinancialDetails {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pb = (task as any)?.metadata?.payment_breakdown
  const isCompleted = task.status === 'completed'

  const currencySymbol =
    (task.expected_collection_currency || task.expected_payment_currency) === 'USD' ? 'US$' : 'C$'

  // 1. Pagos
  const expectedPayment = task.expected_payment_amount ?? 0
  let actualPaid = expectedPayment
  let isActualPaid = false

  if (isCompleted && pb && typeof pb.actual_paid_amount === 'number') {
    actualPaid = pb.actual_paid_amount
    isActualPaid = true
  }

  const paymentDiff = isActualPaid ? actualPaid - expectedPayment : 0

  // 2. Cobros
  const expectedCollection = task.expected_collection_amount ?? 0
  let actualCollection = expectedCollection
  let isActualCollection = false

  if (isCompleted && pb) {
    const totalMixed = (pb.cash_amount ?? 0) + (pb.transfer_amount ?? 0) + (pb.cheque_amount ?? 0)
    if (
      totalMixed > 0 ||
      typeof pb.actual_collected_amount === 'number' ||
      typeof pb.cash_amount === 'number'
    ) {
      actualCollection =
        typeof pb.actual_collected_amount === 'number' ? pb.actual_collected_amount : totalMixed
      isActualCollection = true
    }
  }

  const collectionDiff = isActualCollection ? actualCollection - expectedCollection : 0

  return {
    requiresPayment: !!task.requires_payment,
    expectedPaymentAmount: expectedPayment,
    actualPaidAmount: actualPaid,
    displayPaymentAmount: isCompleted && isActualPaid ? actualPaid : expectedPayment,
    isActualPaid,
    paidMethod: pb?.paid_method,
    invoiceNumber: pb?.invoice_number,
    paymentDiscrepancy: paymentDiff,
    paymentDiscrepancyReason: pb?.discrepancy_payment_reason,

    requiresCollection: !!task.requires_collection,
    expectedCollectionAmount: expectedCollection,
    actualCollectionAmount: actualCollection,
    displayCollectionAmount: isCompleted && isActualCollection ? actualCollection : expectedCollection,
    isActualCollection,
    collectionMethod: task.expected_payment_method ?? undefined,
    collectionDiscrepancy: collectionDiff,
    collectionDiscrepancyReason: pb?.discrepancy_collection_reason,

    currencySymbol,
  }
}
