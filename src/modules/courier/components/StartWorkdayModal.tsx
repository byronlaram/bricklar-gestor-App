import { useState, useEffect } from 'react'
import { X, Play, Loader2, Gauge, Banknote, AlertCircle } from 'lucide-react'
import { useWorkdayMutations } from '@/modules/workdays/hooks/useWorkday'
import {
  getKilometrajeSettings,
  type KilometrajeSettings,
  DEFAULT_KILOMETRAJE_SETTINGS,
} from '@/modules/workdays/services/kilometrajeSettingsService'
import { useAuth } from '@/modules/auth/useAuth'
import { supabase } from '@/shared/lib/supabaseClient'

import { getLocalDateString } from '@/shared/utils/date'

interface StartWorkdayModalProps {
  branchId: string
  isOpen: boolean
  onClose: () => void
}

const KM_REASON_OPTIONS = [
  'Tacómetro / odómetro dañado',
  'Vehículo sin odómetro',
  'Cambio de vehículo',
  'No fue posible obtener la lectura',
  'Otro',
]

export function StartWorkdayModal({ branchId, isOpen, onClose }: StartWorkdayModalProps) {
  const { user } = useAuth()
  const { startWorkday, isStarting, startError } = useWorkdayMutations()

  const [kmSettings, setKmSettings] = useState<KilometrajeSettings>(DEFAULT_KILOMETRAJE_SETTINGS)
  const [isLoadingSettings, setIsLoadingSettings] = useState<boolean>(true)

  const [initialKm, setInitialKm] = useState<number | ''>('')
  const [isKmNotAvailable, setIsKmNotAvailable] = useState<boolean>(false)
  const [reason, setReason] = useState<string>('')
  const [otherReason, setOtherReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [preAssignedCash, setPreAssignedCash] = useState<number>(0)
  const [validationError, setValidationError] = useState<string | null>(null)

  // Cargar configuración de kilometraje y fondo asignado al abrir
  useEffect(() => {
    if (!isOpen) return

    async function loadData() {
      setIsLoadingSettings(true)
      setValidationError(null)
      try {
        const settings = await getKilometrajeSettings()
        setKmSettings(settings)

        if (user?.id) {
          const todayStr = getLocalDateString()
          const { data: wd } = await supabase
            .from('workdays')
            .select('initial_cash')
            .eq('courier_id', user.id)
            .eq('work_date', todayStr)
            .maybeSingle()

          if (wd && wd.initial_cash > 0) {
            setPreAssignedCash(wd.initial_cash)
          } else {
            setPreAssignedCash(0)
          }
        }
      } catch (err) {
        console.error('Error loading data for StartWorkdayModal:', err)
      } finally {
        setIsLoadingSettings(false)
      }
    }

    loadData()
  }, [isOpen, user?.id])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Validaciones de kilometraje según la configuración de la empresa
    if (kmSettings.enabled) {
      if (!kmSettings.allow_not_available) {
        // Caso 2: Obligatorio estricto
        if (!initialKm || Number(initialKm) <= 0) {
          setValidationError('Ingrese el kilometraje inicial para comenzar la jornada.')
          return
        }
      } else {
        // Caso 3: Permitir marcar "No disponible"
        if (!initialKm && !isKmNotAvailable) {
          setValidationError('Ingrese el kilometraje o indique que no está disponible.')
          return
        }

        if (isKmNotAvailable) {
          if (!reason) {
            setValidationError('Seleccione un motivo por el cual el kilometraje no está disponible.')
            return
          }

          if (reason === 'Otro' && !otherReason.trim()) {
            setValidationError('Escriba las observaciones sobre el motivo del kilometraje no disponible.')
            return
          }
        }
      }
    }

    const finalKmReason = isKmNotAvailable
      ? (reason === 'Otro' ? `Otro: ${otherReason.trim()}` : reason)
      : null

    try {
      await startWorkday({
        branch_id: branchId,
        initial_km: isKmNotAvailable || !kmSettings.enabled ? null : Number(initialKm),
        initial_cash: preAssignedCash,
        km_not_available: isKmNotAvailable,
        km_reason: finalKmReason,
        km_observations: otherReason.trim() || undefined,
        notes: notes.trim() || undefined,
      })

      // Limpiar estado y cerrar
      setInitialKm('')
      setIsKmNotAvailable(false)
      setReason('')
      setOtherReason('')
      setNotes('')
      onClose()
    } catch (err) {
      console.error('Error starting workday:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          disabled={isStarting}
          className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Play className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Iniciar Jornada Laboral</h2>
            <p className="text-xs text-foreground-muted">Registra los datos de inicio para comenzar tus entregas.</p>
          </div>
        </div>

        {isLoadingSettings ? (
          <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            <span>Cargando configuración de la empresa...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* fondo inicial — solo lectura */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-emerald-600" />
                Fondo Inicial de Efectivo en Caja
              </label>

              {preAssignedCash > 0 ? (
                <div>
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                    C$ {preAssignedCash.toLocaleString('es-NI', { minimumFractionDigits: 2 })}
                  </span>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    Fondo asignado previamente por Administración.
                  </p>
                </div>
              ) : (
                <div>
                  <span className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                    C$0.00
                  </span>
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                    No hay fondo asignado para esta jornada.
                  </p>
                </div>
              )}
            </div>

            {/* SECCIÓN DE KILOMETRAJE */}
            {kmSettings.enabled && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Gauge className="h-4 w-4 text-accent" />
                      Kilometraje Inicial {(!kmSettings.allow_not_available) && <span className="text-destructive">*</span>}
                    </span>
                  </label>

                  <input
                    type="number"
                    min={1}
                    disabled={isKmNotAvailable}
                    placeholder={isKmNotAvailable ? 'Marcado como no disponible' : 'Ej: 45230'}
                    value={initialKm}
                    onChange={(e) => setInitialKm(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2.5 text-base sm:text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground disabled:opacity-50 disabled:bg-muted/40 font-medium"
                  />
                </div>

                {/* Casilla de Kilometraje No Disponible si está permitida */}
                {kmSettings.allow_not_available && (
                  <div className="space-y-3 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-foreground">
                      <input
                        type="checkbox"
                        checked={isKmNotAvailable}
                        onChange={(e) => {
                          setIsKmNotAvailable(e.target.checked)
                          if (e.target.checked) {
                            setInitialKm('')
                          }
                        }}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
                      />
                      <span>Kilometraje no disponible</span>
                    </label>

                    {/* Formulario desplegable si se marca No Disponible */}
                    {isKmNotAvailable && (
                      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3 animate-fade-in">
                        <div>
                          <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                            Motivo <span className="text-destructive">*</span>
                          </label>
                          <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100 font-medium"
                          >
                            <option value="">-- Seleccionar motivo --</option>
                            {KM_REASON_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>

                        {reason === 'Otro' && (
                          <div>
                            <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200 mb-1">
                              Observaciones del motivo <span className="text-destructive">*</span>
                            </label>
                            <textarea
                              rows={2}
                              value={otherReason}
                              onChange={(e) => setOtherReason(e.target.value)}
                              placeholder="Describe brevemente el motivo..."
                              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-slate-100 resize-none"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* NOTAS GENERALES */}
            <div>
              <label className="block text-xs font-medium text-foreground-muted mb-1.5">
                Notas adicionales (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Tanque lleno, casco en buen estado..."
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
              />
            </div>

            {/* MENSAJES DE ERROR */}
            {validationError && (
              <div className="text-xs text-rose-600 font-semibold bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{validationError}</span>
              </div>
            )}

            {startError && (
              <div className="text-xs text-destructive font-medium bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                <span>{(startError as Error).message}</span>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isStarting}
                className="w-full py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Iniciando Jornada...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Confirmar e Iniciar Jornada
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
