import { useState, useEffect } from 'react'
import { X, Wrench, CheckCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui'
import { MAINTENANCE_TYPE_LABELS } from '@/modules/fleet/types/fleet.types'
import type { Vehicle, MaintenanceServiceType } from '@/modules/fleet/types/fleet.types'

interface MaintenanceRecordModalProps {
  isOpen: boolean
  onClose: () => void
  vehicle: Vehicle | null
  onSave: (data: {
    vehicle_id: string
    vehicle_plate: string
    service_type: MaintenanceServiceType
    odometer_at_service: number
    cost: number
    currency: 'NIO' | 'USD'
    service_date: string
    mechanic_or_workshop?: string
    parts_replaced?: string
    notes?: string
  }) => Promise<void>
  isLoading?: boolean
}

export function MaintenanceRecordModal({
  isOpen,
  onClose,
  vehicle,
  onSave,
  isLoading = false,
}: MaintenanceRecordModalProps) {
  const [serviceType, setServiceType] = useState<MaintenanceServiceType>('oil_change')
  const [odometer, setOdometer] = useState<number>(0)
  const [cost, setCost] = useState<number>(0)
  const [currency, setCurrency] = useState<'NIO' | 'USD'>('NIO')
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [workshop, setWorkshop] = useState<string>('')
  const [parts, setParts] = useState<string>('Aceite 20W-50 4T + Filtro')
  const [notes, setNotes] = useState<string>('')

  useEffect(() => {
    if (vehicle) {
      setOdometer(vehicle.current_odometer || 0)
      setServiceDate(new Date().toISOString().split('T')[0])
      setServiceType('oil_change')
      setParts('Aceite 20W-50 4T + Filtro')
      setCost(350)
      setWorkshop('Taller Autorizado')
      setNotes('')
    }
  }, [vehicle, isOpen])

  const handleTypeChange = (type: MaintenanceServiceType) => {
    setServiceType(type)
    if (type === 'oil_change') {
      setParts('Aceite 20W-50 4T + Filtro')
      setCost(350)
    } else if (type === 'tires') {
      setParts('Llanta Trasera / Delantera')
      setCost(1200)
    } else if (type === 'brakes') {
      setParts('Pastillas de freno / Bandas')
      setCost(450)
    } else {
      setParts('')
      setCost(0)
    }
  }

  if (!isOpen || !vehicle) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await onSave({
      vehicle_id: vehicle.id,
      vehicle_plate: vehicle.plate,
      service_type: serviceType,
      odometer_at_service: odometer,
      cost,
      currency,
      service_date: serviceDate,
      mechanic_or_workshop: workshop,
      parts_replaced: parts,
      notes,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-50/50">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                Registrar Servicio Mecánico
              </h2>
              <p className="text-xs text-slate-500 font-medium font-mono">
                Moto {vehicle.plate} &bull; {vehicle.brand} {vehicle.model}
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
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tipo de Servicio *
            </label>
            <select
              value={serviceType}
              onChange={(e) => handleTypeChange(e.target.value as MaintenanceServiceType)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {(Object.keys(MAINTENANCE_TYPE_LABELS) as MaintenanceServiceType[]).map((key) => (
                <option key={key} value={key}>
                  {MAINTENANCE_TYPE_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Kilometraje del Servicio (km) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={odometer}
                onChange={(e) => setOdometer(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Fecha de Realización *
              </label>
              <input
                type="date"
                required
                value={serviceDate}
                onChange={(e) => setServiceDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Costo del Servicio / Repuestos
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Moneda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'NIO' | 'USD')}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
              >
                <option value="NIO">C$ (Córdobas)</option>
                <option value="USD">$ (Dólares)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Repuestos o Insumos Utilizados
            </label>
            <input
              type="text"
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              placeholder="Ej: Aceite Motul 20w50, Filtro de aire"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Taller o Mecánico Encargado
            </label>
            <input
              type="text"
              value={workshop}
              onChange={(e) => setWorkshop(e.target.value)}
              placeholder="Ej: Taller Central, Moto Repuestos X"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Observaciones del Mantenimiento
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre el estado mecánico o recomendaciones..."
              rows={2}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              leftIcon={<CheckCircle className="h-4 w-4" />}
            >
              {isLoading ? 'Guardando...' : 'Completar Registro'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
