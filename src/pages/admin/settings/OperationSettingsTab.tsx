import { useState, useEffect } from 'react'
import { Gauge, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import {
  getKilometrajeSettings,
  saveKilometrajeSettings,
  type KilometrajeSettings,
  DEFAULT_KILOMETRAJE_SETTINGS,
} from '@/modules/workdays/services/kilometrajeSettingsService'

export function OperationSettingsTab() {
  const { profile } = useAuth()
  const [kmSettings, setKmSettings] = useState<KilometrajeSettings>(DEFAULT_KILOMETRAJE_SETTINGS)
  const [isLoadingKmSettings, setIsLoadingKmSettings] = useState(true)
  const [isSavingKmSettings, setIsSavingKmSettings] = useState(false)
  const [kmSettingsSaved, setKmSettingsSaved] = useState(false)
  const [kmSettingsError, setKmSettingsError] = useState('')

  useEffect(() => {
    async function loadKmSettings() {
      setIsLoadingKmSettings(true)
      try {
        const settings = await getKilometrajeSettings()
        setKmSettings(settings)
      } catch (err) {
        console.error('Error loading km settings:', err)
      } finally {
        setIsLoadingKmSettings(false)
      }
    }
    loadKmSettings()
  }, [])

  const handleSaveKmSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingKmSettings(true)
    setKmSettingsSaved(false)
    setKmSettingsError('')
    try {
      await saveKilometrajeSettings(kmSettings, profile?.id)
      setKmSettingsSaved(true)
      setTimeout(() => setKmSettingsSaved(false), 3500)
    } catch (err: any) {
      setKmSettingsError(err.message || 'Error al guardar configuración de kilometraje.')
    } finally {
      setIsSavingKmSettings(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" />
            Control de kilometraje
          </h2>
          <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
            Define cómo deben registrar los motorizados la lectura del vehículo al iniciar su jornada.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          Reglas de Jornada
        </span>
      </div>

      {isLoadingKmSettings ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span>Cargando configuración de kilometraje...</span>
        </div>
      ) : (
        <form onSubmit={handleSaveKmSettings} className="space-y-4">
          {/* Habilitar control de kilometraje */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-border rounded-xl space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={kmSettings.enabled}
                onChange={(e) => setKmSettings({ ...kmSettings, enabled: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Habilitar control de kilometraje
                </span>
                <span className="text-[11px] text-foreground-muted block mt-0.5">
                  Si se desactiva, el sistema no solicitará kilometraje al iniciar la jornada del motorizado.
                </span>
              </div>
            </label>

            {/* Sub-configuración si está activado */}
            {kmSettings.enabled && (
              <div className="mt-3 pl-7 pt-3 border-t border-border space-y-2.5 animate-fade-in">
                <p className="text-xs font-semibold text-foreground">
                  Cuando no sea posible registrar el kilometraje:
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-foreground font-medium">
                    <input
                      type="radio"
                      name="km_rule"
                      checked={!kmSettings.allow_not_available}
                      onChange={() => setKmSettings({ ...kmSettings, allow_not_available: false })}
                      className="h-4 w-4 text-accent focus:ring-accent cursor-pointer"
                    />
                    <span>No permitir iniciar la jornada (Kilometraje obligatorio sin excepción)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-foreground font-medium">
                    <input
                      type="radio"
                      name="km_rule"
                      checked={kmSettings.allow_not_available}
                      onChange={() => setKmSettings({ ...kmSettings, allow_not_available: true })}
                      className="h-4 w-4 text-accent focus:ring-accent cursor-pointer"
                    />
                    <span>Permitir iniciar marcando "Kilometraje no disponible"</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {kmSettingsError && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              {kmSettingsError}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            {kmSettingsSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Configuración de kilometraje guardada
              </span>
            )}
            <button
              type="submit"
              disabled={isSavingKmSettings}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isSavingKmSettings ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar cambios
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
