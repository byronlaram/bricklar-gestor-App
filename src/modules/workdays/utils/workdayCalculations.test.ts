import { describe, it, expect } from 'vitest'
import { calculateWorkdayCashSummary } from './workdayCalculations'

describe('Cálculo Financiero de Jornadas y Liquidaciones (calculateWorkdayCashSummary)', () => {
  it('Caso 1: Cuadre exacto (Diferencia = 0)', () => {
    // Fondo inicial 500, cobro en efectivo de 300, gasto de 100, entrega parcial a oficina de 200
    // Neto esperado en mano = 500 + 300 - 100 - 200 = 500
    const summary = calculateWorkdayCashSummary(
      500,
      [
        {
          status: 'completed',
          requires_collection: true,
          expected_collection_amount: 300,
          expected_collection_currency: 'NIO',
          expected_payment_method: 'cash',
        },
      ],
      [
        {
          amount: 100,
          currency: 'NIO',
          direction: 'expense',
          movement_type: 'fuel',
        },
        {
          amount: 200,
          currency: 'NIO',
          direction: 'income',
          movement_type: 'partial_delivery',
          description: 'Entrega parcial a oficina',
        },
      ]
    )

    expect(summary.initialCashNIO).toBe(500)
    expect(summary.collectionsNIO).toBe(300)
    expect(summary.expensesNIO).toBe(100)
    expect(summary.alreadyReceivedNIO).toBe(200)
    expect(summary.cashInHandNIO).toBe(500)

    const fisicoEntregado = 500
    const diferencia = fisicoEntregado - summary.cashInHandNIO
    expect(diferencia).toBe(0)
  })

  it('Caso 2: Faltante de dinero (Diferencia negativa)', () => {
    // Fondo inicial 1000, cobro 500. Efectivo esperado = 1500
    // Motorizado entrega 1400. Diferencia = -100
    const summary = calculateWorkdayCashSummary(
      1000,
      [
        {
          status: 'completed',
          requires_collection: true,
          expected_collection_amount: 500,
          expected_collection_currency: 'NIO',
          expected_payment_method: 'cash',
        },
      ],
      []
    )

    expect(summary.cashInHandNIO).toBe(1500)
    const fisicoEntregado = 1400
    const diferencia = fisicoEntregado - summary.cashInHandNIO
    expect(diferencia).toBe(-100)
  })

  it('Caso 3: Sobrante de dinero por propina/cambio (Diferencia positiva)', () => {
    // Fondo inicial 300, cobro 200. Efectivo esperado = 500
    // Motorizado entrega 530. Diferencia = +30
    const summary = calculateWorkdayCashSummary(
      300,
      [
        {
          status: 'completed',
          requires_collection: true,
          expected_collection_amount: 200,
          expected_collection_currency: 'NIO',
          expected_payment_method: 'cash',
        },
      ],
      []
    )

    expect(summary.cashInHandNIO).toBe(500)
    const fisicoEntregado = 530
    const diferencia = fisicoEntregado - summary.cashInHandNIO
    expect(diferencia).toBe(30)
  })

  it('Caso 4: Saldo arrastrado de jornada anterior', () => {
    // Saldo turno actual: Fondo 400 + Cobro 300 = 700
    // Saldo pendiente no liquidado de ayer: 150
    // Total a entregar requerido = 700 + 150 = 850
    const summary = calculateWorkdayCashSummary(
      400,
      [
        {
          status: 'completed',
          requires_collection: true,
          expected_collection_amount: 300,
          expected_collection_currency: 'NIO',
          expected_payment_method: 'cash',
        },
      ],
      []
    )

    const saldoArrastradoAyer = 150
    const totalNetoRequerido = summary.cashInHandNIO + saldoArrastradoAyer
    expect(totalNetoRequerido).toBe(850)
  })

  it('Caso 5: Operación Multimoneda simultánea (NIO y USD)', () => {
    // NIO: Fondo 1000 + Cobro 500 - Gasto 200 = 1300 NIO
    // USD: Cobro 50 USD - Pago proveedor 20 USD = 30 USD
    const summary = calculateWorkdayCashSummary(
      1000,
      [
        {
          status: 'completed',
          requires_collection: true,
          expected_collection_amount: 500,
          expected_collection_currency: 'NIO',
          expected_payment_method: 'cash',
        },
        {
          status: 'completed',
          requires_collection: true,
          expected_collection_amount: 50,
          expected_collection_currency: 'USD',
          expected_payment_method: 'cash',
        },
        {
          status: 'completed',
          requires_payment: true,
          expected_payment_amount: 20,
          expected_payment_currency: 'USD',
          expected_payment_method: 'cash',
        },
      ],
      [
        {
          amount: 200,
          currency: 'NIO',
          direction: 'expense',
          movement_type: 'expense',
        },
      ]
    )

    expect(summary.cashInHandNIO).toBe(1300)
    expect(summary.cashInHandUSD).toBe(30)
  })

  it('Caso 6: Múltiples adelantos en el día y prevención de doble conteo de fondo inicial', () => {
    // Fondo inicial = 500
    // Movimientos:
    // 1. Registro audit de fondo inicial (500) -> NO debe duplicarse a 1000
    // 2. Adelanto adicional 1 = 300
    // 3. Adelanto adicional 2 = 200
    // Total efectivo = 500 (inicial) + 300 + 200 = 1000
    const summary = calculateWorkdayCashSummary(
      500,
      [],
      [
        {
          amount: 500,
          currency: 'NIO',
          direction: 'income',
          movement_type: 'initial_cash',
          description: 'Fondo Inicial asignado al abrir turno',
        },
        {
          amount: 300,
          currency: 'NIO',
          direction: 'income',
          movement_type: 'cash_advance',
          description: 'Adelanto 1 para compras',
        },
        {
          amount: 200,
          currency: 'NIO',
          direction: 'income',
          movement_type: 'additional_fund',
          description: 'Adelanto 2 para combustible',
        },
      ]
    )

    expect(summary.initialCashNIO).toBe(500)
    expect(summary.advancesNIO).toBe(500) // 300 + 200
    expect(summary.cashInHandNIO).toBe(1000)
  })
})
