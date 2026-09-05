import { useState, useEffect } from 'react'
import {
  Gauge,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Sparkles,
  RotateCcw,
  Eye,
  Info,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import {
  getKilometrajeSettings,
  saveKilometrajeSettings,
  type KilometrajeSettings,
  DEFAULT_KILOMETRAJE_SETTINGS,
} from '@/modules/workdays/services/kilometrajeSettingsService'
import {
  getWhatsAppTemplatesSettings,
  saveWhatsAppTemplatesSettings,
  renderWhatsAppTemplate,
  type WhatsAppTemplatesSettings,
  DEFAULT_WHATSAPP_SETTINGS,
  DEFAULT_DEPARTURE_TEMPLATE,
  DEFAULT_COMPLETION_TEMPLATE,
} from '@/modules/tasks/services/whatsappTemplatesService'

const AVAILABLE_VARIABLES = [
  { tag: '{cliente}', label: 'Nombre Cliente', desc: 'Ej: Juan Pérez' },
  { tag: '{pedido}', label: 'Cód. Pedido', desc: 'Ej: TRK-0042' },
  { tag: '{direccion}', label: 'Dirección', desc: 'Ej: Altamira D\'Este casa #12' },
  { tag: '{monto_seccion}', label: 'Sección Cobro', desc: 'Muestra monto si aplica' },
  { tag: '{repartidor}', label: 'Motorizado', desc: 'Ej: Carlos Gómez' },
  { tag: '{link_rastreo}', label: 'Link Rastreo', desc: 'Enlace en vivo' },
  { tag: '{empresa}', label: 'Empresa', desc: 'Ej: Bricklar Logística' },
]

export function OperationSettingsTab() {
  const { profile } = useAuth()

  // Kilometraje settings state
  const [kmSettings, setKmSettings] = useState<KilometrajeSettings>(DEFAULT_KILOMETRAJE_SETTINGS)
  const [isLoadingKmSettings, setIsLoadingKmSettings] = useState(true)
  const [isSavingKmSettings, setIsSavingKmSettings] = useState(false)
  const [kmSettingsSaved, setKmSettingsSaved] = useState(false)
  const [kmSettingsError, setKmSettingsError] = useState('')

  // WhatsApp templates state
  const [waSettings, setWaSettings] = useState<WhatsAppTemplatesSettings>(DEFAULT_WHATSAPP_SETTINGS)
  const [isLoadingWaSettings, setIsLoadingWaSettings] = useState(true)
  const [isSavingWaSettings, setIsSavingWaSettings] = useState(false)
  const [waSettingsSaved, setWaSettingsSaved] = useState(false)
  const [waSettingsError, setWaSettingsError] = useState('')
  const [activeTab, setActiveTab] = useState<'departure' | 'completion'>('departure')

  useEffect(() => {
    async function loadData() {
      setIsLoadingKmSettings(true)
      setIsLoadingWaSettings(true)
      try {
        const [km, wa] = await Promise.all([
          getKilometrajeSettings(),
          getWhatsAppTemplatesSettings(),
        ])
        setKmSettings(km)
        setWaSettings(wa)
      } catch (err) {
        console.error('Error loading operation settings:', err)
      } finally {
        setIsLoadingKmSettings(false)
        setIsLoadingWaSettings(false)
      }
    }
    loadData()
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

  const handleSaveWaSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingWaSettings(true)
    setWaSettingsSaved(false)
    setWaSettingsError('')
    try {
      await saveWhatsAppTemplatesSettings(waSettings, profile?.id)
      setWaSettingsSaved(true)
      setTimeout(() => setWaSettingsSaved(false), 3500)
    } catch (err: any) {
      setWaSettingsError(err.message || 'Error al guardar plantillas de WhatsApp.')
    } finally {
      setIsSavingWaSettings(false)
    }
  }

  const insertVariable = (tag: string) => {
    if (activeTab === 'departure') {
      setWaSettings((prev) => ({
        ...prev,
        departure_template: prev.departure_template + ' ' + tag,
      }))
    } else {
      setWaSettings((prev) => ({
        ...prev,
        completion_template: prev.completion_template + ' ' + tag,
      }))
    }
  }

  const restoreDefaultTemplate = () => {
    if (activeTab === 'departure') {
      setWaSettings((prev) => ({
        ...prev,
        departure_template: DEFAULT_DEPARTURE_TEMPLATE,
      }))
    } else {
      setWaSettings((prev) => ({
        ...prev,
        completion_template: DEFAULT_COMPLETION_TEMPLATE,
      }))
    }
  }

  // Live preview sample
  const previewText = renderWhatsAppTemplate(
    activeTab === 'departure' ? waSettings.departure_template : waSettings.completion_template,
    {
      cliente: 'Mariana López',
      pedido: 'TRK-0042',
      direccion: 'Colonia Los Robles, semáforos 1c al sur, casa #45',
      monto: 350,
      moneda: 'NIO',
      repartidor: 'Carlos Mendoza',
      link_rastreo: 'https://app.bricklar.com/rastreo/TRK-0042',
      empresa: 'Bricklar Logística',
    }
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* TARJETA 1: CONTROL DE KILOMETRAJE */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
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

      {/* TARJETA 2: PLANTILLAS DE WHATSAPP PARA CLIENTES */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              Plantillas de Mensajes WhatsApp a Clientes
            </h2>
            <p className="text-xs text-foreground-muted mt-1 leading-relaxed">
              Personaliza los mensajes automáticos que los motorizados envían a los clientes con enlace de rastreo en vivo y detalles del pedido.
            </p>
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 px-2.5 py-0.5 rounded-full">
            Notificaciones
          </span>
        </div>

        {isLoadingWaSettings ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            <span>Cargando plantillas de WhatsApp...</span>
          </div>
        ) : (
          <form onSubmit={handleSaveWaSettings} className="space-y-5">
            {/* Tabs de Tipo de Notificación */}
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('departure')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'departure'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>🛵 Al Salir a Ruta</span>
                {waSettings.departure_enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completion')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'completion'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-foreground-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>✅ Al Completar Entrega</span>
                {waSettings.completion_enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                )}
              </button>
            </div>

            {/* Activar / Desactivar notificación actual */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-900/40 border border-border rounded-xl">
              <label className="flex items-center justify-between cursor-pointer select-none">
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {activeTab === 'departure'
                      ? 'Habilitar modal de aviso al iniciar ruta (En camino)'
                      : 'Habilitar modal de confirmación al entregar con éxito'}
                  </span>
                  <span className="text-[11px] text-foreground-muted block mt-0.5">
                    Permite al motorizado enviar este mensaje con 1 clic al cambiar el estado.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={
                    activeTab === 'departure'
                      ? waSettings.departure_enabled
                      : waSettings.completion_enabled
                  }
                  onChange={(e) => {
                    const checked = e.target.checked
                    if (activeTab === 'departure') {
                      setWaSettings({ ...waSettings, departure_enabled: checked })
                    } else {
                      setWaSettings({ ...waSettings, completion_enabled: checked })
                    }
                  }}
                  className="h-4 w-4 rounded border-border text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Columna Izquierda: Editor y Variables */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                    Cuerpo del Mensaje
                  </label>
                  <button
                    type="button"
                    onClick={restoreDefaultTemplate}
                    className="text-[11px] font-semibold text-slate-500 hover:text-foreground flex items-center gap-1 cursor-pointer transition"
                    title="Restaurar plantilla predeterminada"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restaurar defecto
                  </button>
                </div>

                <textarea
                  rows={8}
                  value={
                    activeTab === 'departure'
                      ? waSettings.departure_template
                      : waSettings.completion_template
                  }
                  onChange={(e) => {
                    const val = e.target.value
                    if (activeTab === 'departure') {
                      setWaSettings({ ...waSettings, departure_template: val })
                    } else {
                      setWaSettings({ ...waSettings, completion_template: val })
                    }
                  }}
                  className="w-full text-xs font-mono p-3 bg-card border border-border rounded-xl text-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none leading-relaxed transition shadow-inner"
                  placeholder="Escribe el mensaje..."
                />

                {/* Chips de variables dinámicas */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground-muted flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Haz clic en una variable para insertarla en el texto:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => insertVariable(v.tag)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition cursor-pointer"
                        title={v.desc}
                      >
                        <span className="font-bold">{v.tag}</span>
                        <span className="text-[9px] opacity-75 font-sans">({v.label})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Vista Previa Estilo WhatsApp */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Vista previa en vivo (WhatsApp)</span>
                </div>

                <div className="bg-[#E5DDD5] dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl p-3 space-y-2 shadow-sm min-h-[220px] flex flex-col justify-end">
                  <div className="bg-emerald-700 text-white px-3 py-1.5 rounded-t-xl -mx-3 -mt-3 mb-2 flex items-center justify-between text-2xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" />
                      Chat con Cliente
                    </span>
                    <span className="text-emerald-200 text-[10px]">En línea</span>
                  </div>

                  {/* Burbuja WhatsApp */}
                  <div className="bg-white dark:bg-[#005c4b] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tr-xs p-3 text-[11px] leading-relaxed shadow-xs border border-slate-100 dark:border-emerald-800 whitespace-pre-line self-end max-w-full">
                    {previewText}
                    <div className="text-[9px] text-slate-400 dark:text-emerald-200 text-right mt-1 font-mono">
                      10:42 a.m. ✓✓
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {waSettingsError && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {waSettingsError}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              {waSettingsSaved && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Plantillas guardadas correctamente
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingWaSettings}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
              >
                {isSavingWaSettings ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Guardar Plantillas WhatsApp
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
