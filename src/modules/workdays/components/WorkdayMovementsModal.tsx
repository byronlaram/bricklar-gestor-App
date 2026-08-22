import { useState } from 'react'
import {
  X,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Clock,
  Banknote,
  FileText,
  RotateCcw,
} from 'lucide-react'
import type { Workday } from '../types/workdays.types'
import { useCashMovements } from '../hooks/useCashMovements'
import { VoidMovementModal } from './VoidMovementModal'
import type { DetailedCashMovement } from '../services/workdaysService'
import { Badge, TableSkeleton, EmptyState } from '@/shared/components/ui'

interface WorkdayMovementsModalProps {
  workday: Workday | null
  isOpen: boolean
  onClose: () => void
}

export function WorkdayMovementsModal({
  workday,
  isOpen,
  onClose,
}: WorkdayMovementsModalProps) {
  const [voidTarget, setVoidTarget] = useState<DetailedCashMovement | null>(null)
  const { data: movements = [], isLoading } = useCashMovements(
    workday ? { workday_id: workday.id } : { workday_id: 'none' }
  )

  if (!isOpen || !workday) return null

  const courierName =
    workday.courier_profile?.display_name ||
    workday.courier_profile?.full_name ||
    'Motorizado'

  const cashSummary = workday.cash_summary
  const initialCash = cashSummary?.initialCashNIO ?? workday.initial_cash ?? 0
  const cashInHand = cashSummary?.cashInHandNIO ?? initialCash

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col relative">
        {/* Botón Cerrar */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition cursor-pointer p-1 rounded-full hover:bg-slate-100"
          aria-label="Cerrar modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Encabezado */}
        <div className="flex items-center gap-3 pr-8">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004594] shrink-0">
            <History className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                Flujo de Efectivo & Movimientos de Jornada
              </h2>
              <Badge variant="neutral" size="sm">
                {workday.work_date}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Motorizado: <strong className="text-slate-800">{courierName}</strong></span>
              {workday.branch?.name && (
                <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-2xs text-slate-600 font-medium">
                  <Building2 className="h-3 w-3 text-slate-400" />
                  {workday.branch.name}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Tarjetas de Resumen de la Jornada */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">
              Fondo Inicial (+)
            </span>
            <span className="text-sm font-extrabold text-slate-900 font-mono">
              C$ {initialCash.toFixed(2)}
            </span>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-tight block">
              Entregas Admon (+)
            </span>
            <span className="text-sm font-extrabold text-indigo-950 font-mono">
              +C$ {(cashSummary?.advancesNIO ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight block">
              Cobrado / Ingresos (+)
            </span>
            <span className="text-sm font-extrabold text-emerald-950 font-mono">
              +C$ {(cashSummary?.collectionsNIO ?? 0).toFixed(2)}
            </span>
          </div>

          <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl">
            <span className="text-[10px] font-bold text-rose-700 uppercase tracking-tight block">
              Pagado / Egresos (-)
            </span>
            <span className="text-sm font-extrabold text-rose-950 font-mono">
              -C$ {((cashSummary?.expensesNIO ?? 0) + (cashSummary?.alreadyReceivedNIO ?? 0)).toFixed(2)}
            </span>
          </div>

          <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold text-[#004594] uppercase tracking-tight block">
              En Mano Ahora (=)
            </span>
            <span className="text-sm font-extrabold text-[#004594] font-mono">
              C$ {cashInHand.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Lista de Movimientos Registrados */}
        <div className="flex-1 overflow-y-auto min-h-[220px] border border-slate-200 rounded-2xl">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton columns={4} rows={4} />
            </div>
          ) : movements.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <EmptyState
                title="Sin movimientos registrados en este turno"
                description="Las entregas de fondos iniciales, cobros de tareas o devoluciones se registrarán cronológicamente aquí."
                icon={<Banknote className="h-8 w-8 text-slate-300" />}
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              <div className="bg-slate-50 px-4 py-2.5 text-2xs font-extrabold text-slate-500 uppercase tracking-wider grid grid-cols-12 gap-2">
                <span className="col-span-3">Hora & Tipo</span>
                <span className="col-span-6">Concepto / Descripción</span>
                <span className="col-span-3 text-right">Monto</span>
              </div>

              {movements.map((m) => {
                const isIncome = m.direction === 'income'
                const isVoided = (m.description || '').includes('[ANULADO]')
                const dateObj = new Date(m.created_at)
                const timeStr = dateObj.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })

                return (
                  <div
                    key={m.id}
                    className={`grid grid-cols-12 items-center gap-2 p-3 rounded-2xl border text-xs transition ${
                      isVoided
                        ? 'bg-rose-50/20 border-rose-100 opacity-60'
                        : 'bg-white border-slate-100 hover:border-slate-200 shadow-2xs'
                    }`}
                  >
                    {/* Hora y Tipo */}
                    <div className="col-span-3 space-y-1">
                      <div className="font-mono text-2xs text-slate-400 font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" />
                        {timeStr}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                            isVoided
                              ? 'bg-slate-100 text-slate-500 line-through'
                              : m.movement_type === 'initial_cash' || m.movement_type === 'cash_advance'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : m.movement_type === 'reception'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : m.movement_type === 'expense'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {m.movement_type === 'initial_cash'
                            ? 'Fondo Inicial'
                            : m.movement_type === 'cash_advance'
                            ? 'Entrega / Adelanto'
                            : m.movement_type === 'reception'
                            ? 'Recepción Oficina'
                            : m.movement_type === 'expense'
                            ? 'Gasto / Compra'
                            : m.movement_type}
                        </span>
                        {isVoided && (
                          <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
                            ANULADO
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Descripción y Detalles */}
                    <div className="col-span-5 space-y-0.5 pr-2">
                      <p
                        className={`text-slate-800 font-semibold leading-tight ${
                          isVoided ? 'line-through text-slate-400 italic' : ''
                        }`}
                      >
                        {m.description || 'Movimiento de efectivo'}
                      </p>
                      {m.task && (
                        <p className="text-2xs text-indigo-600 font-mono font-bold flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          Tarea {m.task.code}: {m.task.title}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-medium">
                        Método: {m.payment_method === 'cash' ? 'Efectivo' : m.payment_method}
                      </p>
                    </div>

                    {/* Monto con Color */}
                    <div className="col-span-2 text-right">
                      <div
                        className={`font-mono text-sm font-extrabold flex items-center justify-end gap-0.5 ${
                          isVoided
                            ? 'text-slate-400 line-through'
                            : isIncome
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        )}
                        <span>
                          {isIncome ? '+' : '-'}C$ {Number(m.amount).toFixed(2)}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {m.currency || 'NIO'}
                      </span>
                    </div>

                    {/* Acción Anular */}
                    <div className="col-span-2 text-right">
                      {!isVoided &&
                      ['cash_advance', 'initial_cash', 'reception', 'deposit', 'cash_return'].includes(
                        m.movement_type
                      ) ? (
                        <button
                          type="button"
                          onClick={() => setVoidTarget(m)}
                          className="text-2xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                          title="Anular o revertir este movimiento"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Anular
                        </button>
                      ) : (
                        <span className="text-2xs text-slate-300">—</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            Total Movimientos: <strong className="text-slate-800 font-mono">{movements.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Anulación */}
      <VoidMovementModal
        movement={voidTarget}
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
      />
    </div>
  )
}
