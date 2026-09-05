import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Save,
  RotateCcw,
  Edit3,
  Truck,
  ShoppingBag,
  Fuel,
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  X,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useTaskTypesConfig } from '@/modules/tasks/hooks/useTaskTypesConfig'
import {
  buildDefaultCustomConfigs,
  type CustomTaskTypeConfig,
  type TaskNature,
} from '@/modules/tasks/services/taskTypeSettingsService'
import type { TaskType } from '@/shared/types'
import { Button, useToast, ConfirmDialog } from '@/shared/components/ui'
import { cn } from '@/shared/utils/cn'

const TYPE_ICONS: Record<TaskType, React.ReactNode> = {
  delivery: <Truck className="h-5 w-5 text-emerald-500" />,
  purchase: <ShoppingBag className="h-5 w-5 text-rose-500" />,
  fuel: <Fuel className="h-5 w-5 text-amber-500" />,
  bank_deposit: <Building2 className="h-5 w-5 text-blue-500" />,
  credit_payment: <CreditCard className="h-5 w-5 text-purple-500" />,
  service_payment: <FileText className="h-5 w-5 text-indigo-500" />,
  bus_shipment: <Truck className="h-5 w-5 text-cyan-500" />,
  logistics_shipment: <Truck className="h-5 w-5 text-slate-500" />,
  other_errand: <HelpCircle className="h-5 w-5 text-violet-500" />,
}

export function TaskTypesSettingsTab() {
  const { configs, saveConfigs, isSaving, isLoading } = useTaskTypesConfig()
  const toast = useToast()

  const [activeNatureTab, setActiveNatureTab] = useState<TaskNature | 'all'>('all')
  const [editingType, setEditingType] = useState<TaskType | null>(null)
  const [editForm, setEditForm] = useState<CustomTaskTypeConfig | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Estado para Crear Nueva Gestión
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newNature, setNewNature] = useState<TaskNature>('expense')
  const [newSuggestedTitle, setNewSuggestedTitle] = useState('')
  const [newRequiresCollection, setNewRequiresCollection] = useState(false)
  const [newRequiresPayment, setNewRequiresPayment] = useState(true)
  const [newPaymentMethod, setNewPaymentMethod] = useState<'cash' | 'bank_transfer' | 'mobile_wallet'>('cash')

  // Aplicar configuración recomendada automáticamente según la naturaleza elegida
  const handleSelectNatureInCreate = (nature: TaskNature) => {
    setNewNature(nature)
    if (nature === 'income') {
      setNewRequiresCollection(true)
      setNewRequiresPayment(false)
      if (!newSuggestedTitle || newSuggestedTitle.startsWith('Gestión') || newSuggestedTitle.startsWith('Pago') || newSuggestedTitle.startsWith('Compra')) {
        setNewSuggestedTitle(newLabel ? `Cobro / ${newLabel}` : 'Cobro de Gestión')
      }
    } else if (nature === 'expense') {
      setNewRequiresCollection(false)
      setNewRequiresPayment(true)
      setNewPaymentMethod('cash')
      if (!newSuggestedTitle || newSuggestedTitle.startsWith('Cobro') || newSuggestedTitle.startsWith('Gestión')) {
        setNewSuggestedTitle(newLabel ? `Pago / ${newLabel}` : 'Pago de Insumos')
      }
    } else {
      setNewRequiresCollection(false)
      setNewRequiresPayment(false)
      if (!newSuggestedTitle || newSuggestedTitle.startsWith('Cobro') || newSuggestedTitle.startsWith('Pago')) {
        setNewSuggestedTitle(newLabel ? `Trámite: ${newLabel}` : 'Gestión Operativa')
      }
    }
  }

  const handleCreateNewGestion = async () => {
    if (!newLabel.trim()) {
      toast.error('Nombre requerido', 'Por favor ingresa un nombre para la nueva gestión.')
      return
    }

    const slug = `custom_${newLabel.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString().slice(-4)}` as TaskType

    const newConfig: CustomTaskTypeConfig = {
      type: slug,
      label: newLabel.trim(),
      suggestedTitle: newSuggestedTitle.trim() || newLabel.trim(),
      entityType: 'custom',
      defaultRequiresCollection: newRequiresCollection,
      defaultRequiresPayment: newRequiresPayment,
      defaultPaymentMethod: newRequiresPayment ? newPaymentMethod : undefined,
      nature: newNature,
      enabled: true,
      descriptionPlaceholder: `Detalla las especificaciones de ${newLabel.trim()}...`,
      addressLabel: 'Dirección / Destino',
      addressPlaceholder: 'Ej: Altamira, de los semáforos...',
      contactNameLabel: 'Contacto / Titular',
      contactNamePlaceholder: 'Ej: Juan Pérez / Lic. Mendoza',
      referenceNumberLabel: 'N° de Referencia / Trámite',
      referenceNumberPlaceholder: 'Ej: REF-001',
      fastModeFields: ['contact_name', 'address', 'phone', 'financial'],
    }

    try {
      const updated = {
        ...configs,
        [slug]: newConfig,
      }
      await saveConfigs(updated)
      toast.success('Nueva Gestión Creada', `La gestión "${newLabel}" ha sido guardada con su configuración recomendada.`)
      setShowCreateModal(false)
      setNewLabel('')
      setNewSuggestedTitle('')
    } catch (err: any) {
      toast.error('Error al crear', err?.message || 'No se pudo registrar la nueva gestión.')
    }
  }

  // Abrir modal de edición
  const handleStartEdit = (typeKey: TaskType) => {
    const current = configs[typeKey]
    if (current) {
      setEditingType(typeKey)
      setEditForm({ ...current })
    }
  }

  // Guardar cambios individuales de una gestión
  const handleSaveIndividualEdit = async () => {
    if (!editingType || !editForm) return
    try {
      const updated = {
        ...configs,
        [editingType]: editForm,
      }
      await saveConfigs(updated)
      toast.success('Gestión actualizada', `Configuración para "${editForm.label}" guardada exitosamente.`)
      setEditingType(null)
      setEditForm(null)
    } catch (err: any) {
      toast.error('Error al guardar', err?.message || 'No se pudo actualizar la gestión.')
    }
  }

  // Toggle directo de activar/desactivar
  const handleToggleEnable = async (typeKey: TaskType, currentVal: boolean) => {
    try {
      const target = configs[typeKey]
      if (!target) return
      const updated = {
        ...configs,
        [typeKey]: {
          ...target,
          enabled: !currentVal,
        },
      }
      await saveConfigs(updated)
      toast.success(
        !currentVal ? 'Gestión Habilitada' : 'Gestión Deshabilitada',
        `La gestión "${target.label}" ${!currentVal ? 'ahora aparecerá' : 'ya no aparecerá'} en el selector.`
      )
    } catch (err: any) {
      toast.error('Error', 'No se pudo actualizar el estado de la gestión.')
    }
  }

  // Restaurar todo a valores por defecto
  const handleResetDefaults = async () => {
    setIsResetting(true)
    try {
      const defaults = buildDefaultCustomConfigs()
      await saveConfigs(defaults)
      toast.success('Valores restaurados', 'El catálogo de gestiones volvió a las configuraciones recomendadas.')
      setShowResetConfirm(false)
    } catch (err: any) {
      toast.error('Error al restaurar', err?.message || 'Ocurrió un error inesperado.')
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-card border border-border rounded-xl">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <p className="text-xs text-foreground-muted">Cargando catálogo de gestiones...</p>
      </div>
    )
  }

  const entries = Object.entries(configs) as [TaskType, CustomTaskTypeConfig][]
  const filteredEntries = entries.filter(([_, item]) => {
    if (activeNatureTab === 'all') return true
    return item.nature === activeNatureTab
  })

  const countIncome = entries.filter(([_, i]) => i.nature === 'income').length
  const countExpense = entries.filter(([_, i]) => i.nature === 'expense').length
  const countNeutral = entries.filter(([_, i]) => i.nature === 'neutral').length

  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 bg-card border border-border rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Catálogo de Tipos de Gestión</h2>
            <span className="text-[11px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              Adaptativo e Inteligente
            </span>
          </div>
          <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
            Define y clasifica cada gestión según su <strong className="text-foreground">naturaleza financiera</strong> (Ingreso, Egreso o Neutro). Al registrar tareas, el sistema guiará al operador precargando las opciones y campos recomendados automáticamente para evitar inconsistencias.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setShowCreateModal(true)
              handleSelectNatureInCreate('expense')
            }}
            className="gap-1.5 px-3.5 shrink-0 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Nueva Gestión
          </Button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-foreground-muted hover:text-foreground bg-muted/40 hover:bg-muted border border-border rounded-lg transition shrink-0 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restablecer Recomendados
          </button>
        </div>
      </div>

      {/* Selector de Pestañas por Naturaleza */}
      <div className="flex items-center gap-2 p-1 bg-muted/30 border border-border/80 rounded-xl overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveNatureTab('all')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0',
            activeNatureTab === 'all'
              ? 'bg-background text-foreground shadow-2xs'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          Todas las Gestiones ({entries.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveNatureTab('income')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0',
            activeNatureTab === 'income'
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-2xs border border-emerald-500/30'
              : 'text-foreground-muted hover:text-emerald-600'
          )}
        >
          <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
          🟢 Ingresos ({countIncome})
        </button>

        <button
          type="button"
          onClick={() => setActiveNatureTab('expense')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0',
            activeNatureTab === 'expense'
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-2xs border border-rose-500/30'
              : 'text-foreground-muted hover:text-rose-600'
          )}
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
          🔴 Egresos ({countExpense})
        </button>

        <button
          type="button"
          onClick={() => setActiveNatureTab('neutral')}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0',
            activeNatureTab === 'neutral'
              ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 shadow-2xs border border-slate-500/30'
              : 'text-foreground-muted hover:text-slate-600'
          )}
        >
          <Ban className="h-3.5 w-3.5 text-slate-500" />
          ⚪ Neutros ({countNeutral})
        </button>
      </div>

      {/* Grid de Tarjetas de Gestiones */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEntries.map(([typeKey, item]) => {
          const isEnabled = item.enabled !== false

          return (
            <div
              key={typeKey}
              className={cn(
                'relative flex flex-col justify-between p-4.5 rounded-xl border bg-card transition-all duration-200 shadow-2xs hover:shadow-sm',
                !isEnabled && 'opacity-60 bg-muted/20 border-dashed',
                item.nature === 'income' && 'border-emerald-500/20 hover:border-emerald-500/40',
                item.nature === 'expense' && 'border-rose-500/20 hover:border-rose-500/40',
                item.nature === 'neutral' && 'border-border hover:border-border/80'
              )}
            >
              <div className="space-y-3">
                {/* Header de la tarjeta */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-muted/60 border border-border/50">
                      {TYPE_ICONS[typeKey] || <HelpCircle className="h-5 w-5 text-accent" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-foreground leading-tight">{item.label}</h3>
                      <span className="text-[10px] text-foreground-muted font-mono">{typeKey}</span>
                    </div>
                  </div>

                  {/* Badge de Naturaleza */}
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border shrink-0',
                      item.nature === 'income' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
                      item.nature === 'expense' && 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
                      item.nature === 'neutral' && 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20'
                    )}
                  >
                    {item.nature === 'income' && <ArrowDownLeft size={11} />}
                    {item.nature === 'expense' && <ArrowUpRight size={11} />}
                    {item.nature === 'neutral' && <Ban size={11} />}
                    {item.nature === 'income' ? 'Ingreso' : item.nature === 'expense' ? 'Egreso' : 'Neutro'}
                  </span>
                </div>

                {/* Detalles y Título Sugerido */}
                <div className="space-y-2 text-xs pt-1">
                  <div className="bg-muted/30 p-2.5 rounded-lg border border-border/40">
                    <span className="block text-[10px] font-bold text-foreground-muted uppercase tracking-wider mb-0.5">
                      Título Sugerido:
                    </span>
                    <p className="text-xs text-foreground font-medium truncate">{item.suggestedTitle}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground-muted">
                    <div>
                      <span className="block font-semibold text-[10px] uppercase tracking-wider text-slate-400">Entidad:</span>
                      <span className="capitalize text-foreground font-medium">{item.entityType}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-[10px] uppercase tracking-wider text-slate-400">Cobro/Pago:</span>
                      <span className="font-medium text-foreground">
                        {item.defaultRequiresCollection ? '🟢 Cobro sugerido' : item.defaultRequiresPayment ? '🔴 Pago sugerido' : '⚪ Sin importe'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones de Tarjeta */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => handleToggleEnable(typeKey, isEnabled)}
                  className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition cursor-pointer"
                  title={isEnabled ? 'Hacer clic para desactivar' : 'Hacer clic para activar'}
                >
                  {isEnabled ? (
                    <>
                      <ToggleRight className="h-4 w-4 text-emerald-500" />
                      <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Activo</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-4 w-4 text-slate-400" />
                      <span className="text-[11px] font-medium text-slate-400">Inactivo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleStartEdit(typeKey)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/20 rounded-lg transition cursor-pointer"
                >
                  <Edit3 className="h-3 w-3" />
                  Configurar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de Configuración Individual de Gestión */}
      {editingType && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-background border border-border shadow-2xs">
                  {TYPE_ICONS[editingType] || <HelpCircle className="h-5 w-5 text-accent" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Configurar Gestión: {editForm.label}</h3>
                  <p className="text-xs text-foreground-muted">Ajusta la naturaleza y sugerencias del formulario adaptativo</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingType(null)
                  setEditForm(null)
                }}
                className="p-1.5 rounded-lg text-foreground-muted hover:text-foreground hover:bg-muted transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cuerpo del Formulario */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Selector de Naturaleza Financiera */}
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                  Naturaleza Financiera de la Gestión *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        nature: 'income',
                        defaultRequiresCollection: true,
                        defaultRequiresPayment: false,
                      })
                    }
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                      editForm.nature === 'income'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                        : 'bg-muted/30 border-border text-foreground-muted hover:bg-muted/60'
                    )}
                  >
                    <ArrowDownLeft className="h-4 w-4 mb-1 text-emerald-600" />
                    <span className="text-xs">🟢 Ingreso</span>
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">Cobro a cliente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        nature: 'expense',
                        defaultRequiresCollection: false,
                        defaultRequiresPayment: true,
                      })
                    }
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                      editForm.nature === 'expense'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-800 dark:text-rose-300 font-bold shadow-2xs ring-1 ring-rose-500/30'
                        : 'bg-muted/30 border-border text-foreground-muted hover:bg-muted/60'
                    )}
                  >
                    <ArrowUpRight className="h-4 w-4 mb-1 text-rose-600" />
                    <span className="text-xs">🔴 Egreso</span>
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">Pago / Desembolso</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({
                        ...editForm,
                        nature: 'neutral',
                        defaultRequiresCollection: false,
                        defaultRequiresPayment: false,
                      })
                    }
                    className={cn(
                      'flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all cursor-pointer',
                      editForm.nature === 'neutral'
                        ? 'bg-slate-500/15 border-slate-500 text-slate-800 dark:text-slate-300 font-bold shadow-2xs ring-1 ring-slate-500/30'
                        : 'bg-muted/30 border-border text-foreground-muted hover:bg-muted/60'
                    )}
                  >
                    <Ban className="h-4 w-4 mb-1 text-slate-500" />
                    <span className="text-xs">⚪ Neutro</span>
                    <span className="text-[10px] font-normal opacity-80 mt-0.5">Sin dinero directo</span>
                  </button>
                </div>
              </div>

              {/* Nombre / Etiqueta de la Gestión */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Nombre Visible</label>
                <input
                  type="text"
                  value={editForm.label}
                  onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              {/* Título Sugerido */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Título Sugerido por Defecto
                </label>
                <input
                  type="text"
                  value={editForm.suggestedTitle}
                  onChange={(e) => setEditForm({ ...editForm, suggestedTitle: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>

              {/* Placeholder de Instrucciones */}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Placeholder de Instrucciones / Descripción
                </label>
                <textarea
                  rows={2}
                  value={editForm.descriptionPlaceholder}
                  onChange={(e) => setEditForm({ ...editForm, descriptionPlaceholder: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                />
              </div>

              {/* Tipo de Entidad Principal Contextual */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Tipo de Entidad</label>
                  <select
                    value={editForm.entityType}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        entityType: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="client">Cliente</option>
                    <option value="provider">Proveedor / Comercio</option>
                    <option value="bank">Banco / Financiera</option>
                    <option value="transport">Transporte / Bus / Cargo</option>
                    <option value="custom">Personalizado / Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Estado de Uso</label>
                  <select
                    value={editForm.enabled ? 'enabled' : 'disabled'}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        enabled: e.target.value === 'enabled',
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  >
                    <option value="enabled">Habilitada (Visible)</option>
                    <option value="disabled">Deshabilitada (Oculta)</option>
                  </select>
                </div>
              </div>

              {/* Etiquetas de campos opcionales */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <span className="block text-xs font-bold text-foreground uppercase tracking-wider text-slate-400">
                  Etiquetas de Referencias
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Etiqueta N° Referencia / Factura
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: N° de Factura / Guía"
                      value={editForm.referenceNumberLabel || ''}
                      onChange={(e) => setEditForm({ ...editForm, referenceNumberLabel: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Etiqueta Nombre Contacto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Nombre del Titular"
                      value={editForm.contactNameLabel || ''}
                      onChange={(e) => setEditForm({ ...editForm, contactNameLabel: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingType(null)
                  setEditForm(null)
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveIndividualEdit}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Guardar Configuración
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Crear Nueva Gestión con Configuración Recomendada */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10 text-accent">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Crear Nueva Gestión / Tipo de Tarea</h3>
                  <p className="text-xs text-foreground-muted">
                    Define la naturaleza para obtener las configuraciones recomendadas automáticamente.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-foreground-muted hover:text-foreground rounded-lg hover:bg-muted transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Nombre de la Gestión */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Nombre de la Gestión <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Trámite Notarial, Retiro de Insumos, Inspección..."
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value)
                    if (!newSuggestedTitle || newSuggestedTitle.startsWith('Cobro') || newSuggestedTitle.startsWith('Pago') || newSuggestedTitle.startsWith('Trámite')) {
                      if (newNature === 'income') setNewSuggestedTitle(e.target.value ? `Cobro / ${e.target.value}` : '')
                      else if (newNature === 'expense') setNewSuggestedTitle(e.target.value ? `Pago / ${e.target.value}` : '')
                      else setNewSuggestedTitle(e.target.value ? `Trámite: ${e.target.value}` : '')
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium"
                />
              </div>

              {/* Selector de Naturaleza Financiera */}
              <div>
                <label className="block text-xs font-bold text-foreground mb-2">
                  1. Selecciona la Naturaleza de la Gestión <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectNatureInCreate('income')}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition cursor-pointer',
                      newNature === 'income'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : 'border-border bg-card hover:bg-muted/30'
                    )}
                  >
                    <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                    <span className="text-xs font-bold text-foreground">Ingreso</span>
                    <span className="text-[10px] text-foreground-muted">Entrada de dinero (Cobro al cliente)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectNatureInCreate('expense')}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition cursor-pointer',
                      newNature === 'expense'
                        ? 'border-rose-500 bg-rose-500/10 ring-2 ring-rose-500/30'
                        : 'border-border bg-card hover:bg-muted/30'
                    )}
                  >
                    <ArrowUpRight className="h-5 w-5 text-rose-500" />
                    <span className="text-xs font-bold text-foreground">Egreso</span>
                    <span className="text-[10px] text-foreground-muted">Salida de dinero (Compras / Pagos)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectNatureInCreate('neutral')}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition cursor-pointer',
                      newNature === 'neutral'
                        ? 'border-slate-400 bg-slate-500/10 ring-2 ring-slate-400/30'
                        : 'border-border bg-card hover:bg-muted/30'
                    )}
                  >
                    <Ban className="h-5 w-5 text-slate-400" />
                    <span className="text-xs font-bold text-foreground">Neutro</span>
                    <span className="text-[10px] text-foreground-muted">Sin dinero (Trámite / Logística)</span>
                  </button>
                </div>
              </div>

              {/* Banner de Recomendación Inteligente */}
              <div className={cn(
                'p-3.5 rounded-xl border space-y-2',
                newNature === 'income'
                  ? 'bg-emerald-500/5 border-emerald-500/30'
                  : newNature === 'expense'
                  ? 'bg-rose-500/5 border-rose-500/30'
                  : 'bg-slate-500/5 border-slate-500/30'
              )}>
                <div className="flex items-center gap-2">
                  <Sparkles className={cn(
                    'h-4 w-4',
                    newNature === 'income' ? 'text-emerald-500' : newNature === 'expense' ? 'text-rose-500' : 'text-slate-400'
                  )} />
                  <span className="text-xs font-bold text-foreground">
                    Configuración Recomendada por el Sistema
                  </span>
                </div>
                <p className="text-[11px] text-foreground-muted leading-relaxed">
                  {newNature === 'income' &&
                    'Al seleccionar "Ingreso", el sistema activará automáticamente el modo de Cobro Requerido para recibir dinero en caja/liquidación.'}
                  {newNature === 'expense' &&
                    'Al seleccionar "Egreso", el sistema preconfigurará el requerimiento de Desembolso / Pago en efectivo para el motorizado.'}
                  {newNature === 'neutral' &&
                    'Al seleccionar "Neutro", el sistema registrará la tarea sin flujo financiero predeterminado (gestión meramente operativa).'}
                </p>
              </div>

              {/* Título Sugerido */}
              <div>
                <label className="block text-xs font-medium text-foreground-muted mb-1">
                  Título Sugerido por Defecto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Cobro / Factura..."
                  value={newSuggestedTitle}
                  onChange={(e) => setNewSuggestedTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none"
                />
              </div>

              {/* Ajustes Financieros */}
              <div className="pt-2 border-t border-border/50 space-y-3">
                <span className="block text-xs font-bold text-foreground uppercase tracking-wider text-slate-400">
                  Comportamiento Financiero Inicial
                </span>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRequiresCollection}
                      onChange={(e) => {
                        setNewRequiresCollection(e.target.checked)
                        if (e.target.checked) setNewRequiresPayment(false)
                      }}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500/30"
                    />
                    <span>Requerir Cobro por Defecto (Entrada a Liquidación)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRequiresPayment}
                      onChange={(e) => {
                        setNewRequiresPayment(e.target.checked)
                        if (e.target.checked) setNewRequiresCollection(false)
                      }}
                      className="rounded border-border text-rose-600 focus:ring-rose-500/30"
                    />
                    <span>Requerir Pago / Compra por Defecto (Salida de Caja Chica)</span>
                  </label>
                </div>

                {newRequiresPayment && (
                  <div>
                    <label className="block text-[11px] font-medium text-foreground-muted mb-1">
                      Método de Pago Sugerido
                    </label>
                    <select
                      value={newPaymentMethod}
                      onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                      className="w-full px-3 py-1.5 text-xs bg-background border border-border rounded-lg text-foreground focus:outline-none"
                    >
                      <option value="cash">Efectivo en Mano</option>
                      <option value="bank_transfer">Transferencia Bancaria</option>
                      <option value="mobile_wallet">Billetera Móvil</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-border bg-muted/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateNewGestion}
                disabled={isSaving || !newLabel.trim()}
                className="gap-1.5"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Crear y Guardar Gestión
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación para Restablecer Recomendados */}
      <ConfirmDialog
        isOpen={showResetConfirm}
        title="¿Restablecer configuraciones recomendadas?"
        description="Esta acción reconfigurará todos los tipos de gestiones a sus valores iniciales sugeridos por el sistema (naturalezas, títulos y etiquetas)."
        confirmText="Restablecer"
        cancelText="Cancelar"
        variant="primary"
        isLoading={isResetting}
        onConfirm={handleResetDefaults}
        onClose={() => setShowResetConfirm(false)}
      />
    </div>
  )
}
