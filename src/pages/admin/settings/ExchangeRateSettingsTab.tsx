import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRightLeft,
  Trash2,
  Building2,
  Info,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { getBranches } from '@/modules/branches/services/branchesService'
import type { Branch } from '@/modules/branches/types/branches.types'
import { useExchangeRates } from '@/modules/exchange-rates/hooks/useExchangeRates'
import type { SaveExchangeRatePayload } from '@/modules/exchange-rates/types/exchangeRates.types'

export function ExchangeRateSettingsTab() {
  const { profile } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')

  // Filters & hooks
  const filters = useMemo(() => ({
    branch_id: selectedBranchId || undefined,
  }), [selectedBranchId])

  const {
    rates,
    latestRate,
    isLoading,
    isSaving,
    error,
    refresh,
    saveRate,
    deleteRate,
  } = useExchangeRates(filters)

  // Form state
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0])
  const [formRate, setFormRate] = useState<string>('36.6242')
  const [formSource, setFormSource] = useState<string>('BCN')
  const [formBranchId, setFormBranchId] = useState<string>('')
  const [formNotes, setFormNotes] = useState<string>('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Converter state
  const [calcUsd, setCalcUsd] = useState<string>('100')
  const [calcNio, setCalcNio] = useState<string>('')

  // Load branches
  useEffect(() => {
    async function loadBranches() {
      try {
        const data = await getBranches()
        setBranches(data)
        const defaultBranch = profile?.primary_branch_id || profile?.branch_ids[0] || (data[0]?.id ?? '')
        if (defaultBranch) {
          setSelectedBranchId(defaultBranch)
          setFormBranchId(defaultBranch)
        }
      } catch (err) {
        console.error('Error loading branches in exchange rate tab:', err)
      }
    }
    loadBranches()
  }, [profile])

  // Update calculator NIO when rate or USD changes
  const activeRateValue = latestRate?.nio_per_usd || (parseFloat(formRate) || 36.6242)

  useEffect(() => {
    const usd = parseFloat(calcUsd)
    if (!isNaN(usd) && activeRateValue > 0) {
      setCalcNio((usd * activeRateValue).toFixed(2))
    } else {
      setCalcNio('')
    }
  }, [calcUsd, activeRateValue])

  const handleNioChange = (val: string) => {
    setCalcNio(val)
    const nio = parseFloat(val)
    if (!isNaN(nio) && activeRateValue > 0) {
      setCalcUsd((nio / activeRateValue).toFixed(2))
    } else {
      setCalcUsd('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const rateNum = parseFloat(formRate)
    if (isNaN(rateNum) || rateNum <= 0) {
      alert('Por favor ingrese una tasa de cambio válida mayor a 0.')
      return
    }

    const branchToUse = formBranchId || selectedBranchId || branches[0]?.id
    if (!branchToUse) {
      alert('Debe seleccionar una sucursal.')
      return
    }

    try {
      const payload: SaveExchangeRatePayload = {
        branch_id: branchToUse,
        rate_date: formDate,
        nio_per_usd: rateNum,
        source: formSource,
        notes: formNotes.trim() || null,
      }
      await saveRate(payload)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    } catch (err) {
      console.error('Error saving rate:', err)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRate(id)
      setDeleteConfirmId(null)
    } catch (err) {
      console.error('Error deleting rate:', err)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner & Quick Converter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Rate Card */}
        <div className="md:col-span-2 bg-gradient-to-br from-[#003875] to-[#1E293B] text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <DollarSign className="w-40 h-40 -mr-10 -mt-10" />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Tasa Activa Vigente
              </span>
              <button
                onClick={() => refresh()}
                title="Actualizar datos"
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="mt-2">
              <p className="text-xs text-slate-300 font-medium">1 Dólar Estadounidense (USD) =</p>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
                C$ {latestRate ? latestRate.nio_per_usd.toFixed(4) : '36.6242'}{' '}
                <span className="text-sm font-semibold text-slate-300">NIO</span>
              </h2>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              <span className="text-slate-400">Fecha de vigencia:</span>{' '}
              <span className="font-semibold text-white">
                {latestRate?.rate_date || 'No registrada'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Fuente:</span>{' '}
              <span className="font-semibold text-white">
                {latestRate?.source || 'BCN (Oficial)'}
              </span>
            </div>
            {latestRate?.creator_name && (
              <div>
                <span className="text-slate-400">Por:</span>{' '}
                <span className="font-semibold text-white">{latestRate.creator_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Converter Widget */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <ArrowRightLeft className="w-3.5 h-3.5 text-accent" />
              Calculadora Rápida
            </h3>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Conversión al tipo de cambio activo
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-foreground-subtle block mb-1">
                  Monto en USD ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="any"
                    value={calcUsd}
                    onChange={(e) => setCalcUsd(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden"
                    placeholder="100.00"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-foreground-subtle block mb-1">
                  Equivalente en Córdobas (C$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">C$</span>
                  <input
                    type="number"
                    step="any"
                    value={calcNio}
                    onChange={(e) => handleNioChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden"
                    placeholder="3662.42"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border flex items-center gap-1.5 text-[10px] text-foreground-muted">
            <Info className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Útil para validar liquidaciones y cobranzas mixtas.</span>
          </div>
        </div>
      </div>

      {/* Form: Register/Update Exchange Rate */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              Registrar o Actualizar Tipo de Cambio
            </h2>
            <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
              Establece la tasa oficial del día que se aplicará en cierres diarios, liquidaciones y conversiones multimoneda.
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
            USD / NIO
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Fecha */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Fecha de Vigencia *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden"
                />
              </div>
            </div>

            {/* Tasa NIO */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Córdobas por 1 USD *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.0001"
                  min="0.01"
                  required
                  value={formRate}
                  onChange={(e) => setFormRate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden"
                  placeholder="36.6242"
                />
              </div>
            </div>

            {/* Fuente */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Fuente / Origen
              </label>
              <select
                value={formSource}
                onChange={(e) => setFormSource(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden cursor-pointer"
              >
                <option value="BCN">Banco Central (BCN)</option>
                <option value="Banco Comercial">Banco Comercial (Banpro/BAC/etc)</option>
                <option value="Paralelo">Mercado Paralelo</option>
                <option value="Manual">Ajuste Manual Interno</option>
              </select>
            </div>

            {/* Sucursal */}
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Sucursal *
              </label>
              <select
                value={formBranchId}
                onChange={(e) => setFormBranchId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Notas u Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Ej. Tasa oficial publicada según tabla cambiaria mensual BCN..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden"
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Tipo de cambio guardado correctamente
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar Tipo de Cambio
            </button>
          </div>
        </form>
      </div>

      {/* Historical Rates Table */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              Historial de Tipos de Cambio
            </h3>
            <p className="text-xs text-foreground-muted mt-0.5">
              Registro cronológico de tasas registradas en el sistema.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground-muted flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              Filtrar por sucursal:
            </span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background focus:ring-1 focus:ring-accent focus:outline-hidden cursor-pointer"
            >
              <option value="">Todas las sucursales</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span>Cargando historial de tasas de cambio...</span>
          </div>
        ) : rates.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-border rounded-xl">
            <TrendingUp className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-foreground-muted font-medium">
              No hay tasas de cambio registradas para la sucursal seleccionada.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-foreground-muted uppercase text-[10px] font-bold tracking-wider border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Fecha</th>
                  <th className="px-4 py-2.5">Tasa (NIO / USD)</th>
                  <th className="px-4 py-2.5">Fuente</th>
                  <th className="px-4 py-2.5">Sucursal</th>
                  <th className="px-4 py-2.5">Registrado por</th>
                  <th className="px-4 py-2.5">Notas</th>
                  <th className="px-4 py-2.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rates.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                    <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">
                      {r.rate_date}
                    </td>
                    <td className="px-4 py-3 font-bold text-accent whitespace-nowrap">
                      C$ {r.nio_per_usd.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {r.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">
                      {r.branch_name}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted whitespace-nowrap">
                      {r.creator_name}
                    </td>
                    <td className="px-4 py-3 text-foreground-muted max-w-[200px] truncate" title={r.notes || ''}>
                      {r.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {deleteConfirmId === r.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="px-2 py-1 bg-destructive text-white text-[10px] font-bold rounded-md hover:bg-destructive/90 transition cursor-pointer"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-foreground text-[10px] rounded-md transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(r.id)}
                          title="Eliminar registro"
                          className="p-1 rounded-md text-slate-400 hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
