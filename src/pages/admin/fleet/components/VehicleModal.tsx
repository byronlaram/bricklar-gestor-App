import { useState, useEffect } from 'react'
import { X, Bike, Save } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { useCouriers } from '@/modules/tasks/hooks/useCouriers'
import type { Vehicle } from '@/modules/fleet/types/fleet.types'

interface VehicleModalProps {
  isOpen: boolean
  onClose: () => void
  vehicleToEdit?: Vehicle | null
  onSave: (data: Partial<Vehicle>) => Promise<void>
  isLoading?: boolean
}

export function VehicleModal({
  isOpen,
  onClose,
  vehicleToEdit,
  onSave,
  isLoading = false,
}: VehicleModalProps) {
  const { data: branches = [] } = useBranches()

  const [formData, setFormData] = useState<Partial<Vehicle>>({
    plate: '',
    brand: 'Yamaha',
    model: 'YBR 125',
    year: new Date().getFullYear(),
    color: 'Negro',
    branch_id: '',
    assigned_courier_id: '',
    assigned_courier_name: '',
    current_odometer: 0,
    oil_change_interval_km: 2500,
    last_oil_change_km: 0,
    general_service_interval_km: 5000,
    last_general_service_km: 0,
    status: 'active',
    notes: '',
  })

  const { data: couriers = [] } = useCouriers(formData.branch_id || undefined)

  useEffect(() => {
    if (vehicleToEdit) {
      setFormData({
        ...vehicleToEdit,
      })
    } else {
      setFormData({
        plate: '',
        brand: 'Yamaha',
        model: 'YBR 125',
        year: new Date().getFullYear(),
        color: 'Negro',
        branch_id: branches[0]?.id || '',
        assigned_courier_id: '',
        assigned_courier_name: '',
        current_odometer: 0,
        oil_change_interval_km: 2500,
        last_oil_change_km: 0,
        general_service_interval_km: 5000,
        last_general_service_km: 0,
        status: 'active',
        notes: '',
      })
    }
  }, [vehicleToEdit, branches, isOpen])

  if (!isOpen) return null

  const handleCourierChange = (courierId: string) => {
    if (!courierId) {
      setFormData((prev) => ({
        ...prev,
        assigned_courier_id: null,
        assigned_courier_name: null,
      }))
      return
    }

    const courier = couriers.find((c) => c.id === courierId)
    setFormData((prev) => ({
      ...prev,
      assigned_courier_id: courierId,
      assigned_courier_name: courier?.display_name || courier?.full_name || null,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.plate?.trim()) return

    await onSave(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Bike className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {vehicleToEdit ? 'Editar Motocicleta' : 'Registrar Motocicleta'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Control de odómetro y ficha técnica del vehículo
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Número de Placa *
              </label>
              <input
                type="text"
                required
                value={formData.plate || ''}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                placeholder="Ej: M 123456"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Sucursal *
              </label>
              <select
                value={formData.branch_id || ''}
                onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Marca
              </label>
              <input
                type="text"
                value={formData.brand || ''}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="Ej: Yamaha, Bajaj"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Modelo
              </label>
              <input
                type="text"
                value={formData.model || ''}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="Ej: YBR 125"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Color
              </label>
              <input
                type="text"
                value={formData.color || ''}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="Ej: Negro"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Motorizado Asignado */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Motorizado Asignado Habitual (Opcional)
            </label>
            <select
              value={formData.assigned_courier_id || ''}
              onChange={(e) => handleCourierChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">-- Sin motorizado asignado (Flota libre) --</option>
              {couriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name || c.full_name}
                </option>
              ))}
            </select>
            <p className="text-3xs text-slate-400 mt-1">
              El odómetro se actualizará automáticamente al finalizar la jornada del repartidor.
            </p>
          </div>

          {/* Odómetro & Mantenimiento */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Control de Odómetro y Servicios
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">
                  Odómetro Actual (km) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.current_odometer || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, current_odometer: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">
                  Intervalo Cambio Aceite (km)
                </label>
                <input
                  type="number"
                  required
                  min={500}
                  step={100}
                  value={formData.oil_change_interval_km || 2500}
                  onChange={(e) =>
                    setFormData({ ...formData, oil_change_interval_km: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">
                  Último Cambio Aceite en (km)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.last_oil_change_km || 0}
                  onChange={(e) =>
                    setFormData({ ...formData, last_oil_change_km: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="text-2xs font-bold text-slate-600 block mb-1">
                  Estado Operativo
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white cursor-pointer"
                >
                  <option value="active">🟢 Activa en Ruta</option>
                  <option value="in_maintenance">🟡 En Taller / Mantenimiento</option>
                  <option value="inactive">🔴 Inactiva / Fuera de Servicio</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Notas Adicionales
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Detalles mecánicos, número de motor o historial..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isLoading}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isLoading ? 'Guardando...' : 'Guardar Motocicleta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
