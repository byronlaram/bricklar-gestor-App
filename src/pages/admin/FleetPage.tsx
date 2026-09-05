import { useState, useMemo } from 'react'
import {
  Bike,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Building2,
  Fuel,
  RefreshCw,
  Search,
  Edit2,
  Trash2,
  History,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useBranches } from '@/modules/branches/hooks/useBranches'
import { useVehicles, useMaintenanceRecords, useVehicleMutations } from '@/modules/fleet/hooks/useFleet'
import { calculateVehicleHealth } from '@/modules/fleet/services/fleetService'
import { VehicleModal } from './fleet/components/VehicleModal'
import { MaintenanceRecordModal } from './fleet/components/MaintenanceRecordModal'
import { Card, Button, Badge, Skeleton, ConfirmDialog } from '@/shared/components/ui'
import { formatDate } from '@/shared/utils/format'
import { MAINTENANCE_TYPE_LABELS } from '@/modules/fleet/types/fleet.types'
import type { Vehicle } from '@/modules/fleet/types/fleet.types'

export default function FleetPage() {
  const { profile } = useAuth()
  const { data: branches = [] } = useBranches()

  const defaultBranchId = profile?.primary_branch_id || profile?.branch_ids[0] || (branches[0]?.id ?? 'all')
  const [selectedBranchId, setSelectedBranchId] = useState<string>(defaultBranchId)
  const [activeTab, setActiveTab] = useState<'vehicles' | 'history'>('vehicles')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'urgent' | 'warning' | 'ok'>('all')

  // Modales
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null)

  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false)
  const [vehicleForMaintenance, setVehicleForMaintenance] = useState<Vehicle | null>(null)

  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Queries & Mutations
  const { data: vehicles = [], isLoading: isLoadingVehicles, refetch: refetchVehicles } = useVehicles(
    selectedBranchId === 'all' ? undefined : selectedBranchId
  )
  const { data: records = [], isLoading: isLoadingRecords, refetch: refetchRecords } = useMaintenanceRecords()
  const { saveVehicle, isSavingVehicle, deleteVehicle, addMaintenance, isAddingMaintenance } = useVehicleMutations()

  // Cálculo de estadísticas globales
  const stats = useMemo(() => {
    let total = vehicles.length
    let okCount = 0
    let warningCount = 0
    let urgentCount = 0
    let activeRiders = 0

    vehicles.forEach((v) => {
      const health = calculateVehicleHealth(v)
      if (health.overall_status === 'urgent') urgentCount++
      else if (health.overall_status === 'warning') warningCount++
      else okCount++

      if (v.assigned_courier_id) activeRiders++
    })

    return { total, okCount, warningCount, urgentCount, activeRiders }
  }, [vehicles])

  // Total gastado en mantenimientos
  const totalExpenses = useMemo(() => {
    let totalNIO = 0
    let totalUSD = 0

    records.forEach((r) => {
      if (r.currency === 'USD') totalUSD += r.cost
      else totalNIO += r.cost
    })

    return { totalNIO, totalUSD }
  }, [records])

  // Filtrado de motocicletas
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        v.plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        (v.assigned_courier_name && v.assigned_courier_name.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (statusFilter !== 'all') {
        const health = calculateVehicleHealth(v)
        if (health.overall_status !== statusFilter) return false
      }

      return true
    })
  }, [vehicles, searchQuery, statusFilter])

  const handleOpenCreateVehicle = () => {
    setVehicleToEdit(null)
    setIsVehicleModalOpen(true)
  }

  const handleOpenEditVehicle = (vehicle: Vehicle) => {
    setVehicleToEdit(vehicle)
    setIsVehicleModalOpen(true)
  }

  const handleOpenMaintenance = (vehicle: Vehicle) => {
    setVehicleForMaintenance(vehicle)
    setIsMaintenanceModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return
    setIsDeleting(true)
    try {
      await deleteVehicle(vehicleToDelete.id)
      setVehicleToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in pb-12">
      {/* ─── Encabezado Principal ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Flota & Mantenimiento Preventivo
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
              <Bike className="h-3 w-3" />
              Motos & Odómetros
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Control de kilometraje acumulado, alertas preventivas de cambio de aceite y bitácora de costos mecánicos.
          </p>
        </div>

        {/* Filtro Sucursal & Botón Nueva Moto */}
        <div className="flex flex-wrap items-center gap-2">
          {branches.length > 1 && (
            <div className="relative">
              <Building2 className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="pl-9 pr-8 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-900 shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="all">Todas las Sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchVehicles()
              refetchRecords()
            }}
            leftIcon={<RefreshCw className="h-3.5 w-3.5 text-slate-500" />}
            className="shadow-2xs"
          >
            Actualizar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenCreateVehicle}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shadow-xs font-bold"
          >
            Registrar Motocicleta
          </Button>
        </div>
      </div>

      {/* ─── Tarjetas de Métricas Rápidas ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 bg-white border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Flota Registrada</span>
            <Bike className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono">{stats.total}</span>
            <span className="text-2xs text-slate-500">motos ({stats.activeRiders} asignadas)</span>
          </div>
        </Card>

        <Card className="p-4 bg-emerald-50/80 border-emerald-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-emerald-900 uppercase tracking-wider">
            <span>Al Día / Óptimas</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-950 font-mono">{stats.okCount}</span>
            <span className="text-2xs text-emerald-800">motos con aceite OK</span>
          </div>
        </Card>

        <Card className="p-4 bg-amber-50/80 border-amber-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-amber-900 uppercase tracking-wider">
            <span>Próximas a Cambio</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-950 font-mono">{stats.warningCount}</span>
            <span className="text-2xs text-amber-800">a &lt;200 km del cambio</span>
          </div>
        </Card>

        <Card className="p-4 bg-rose-50/80 border-rose-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-2xs font-bold text-rose-900 uppercase tracking-wider">
            <span>Mantenimiento Vencido</span>
            <ShieldAlert className="h-4 w-4 text-rose-600 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-950 font-mono">{stats.urgentCount}</span>
            <span className="text-2xs text-rose-800">requieren taller urgente</span>
          </div>
        </Card>
      </div>

      {/* ─── Pestañas: Tablero de Motos vs Bitácora de Gastos ─── */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('vehicles')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'vehicles'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Bike className="h-4 w-4" />
            <span>Tablero de Motocicletas ({vehicles.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <History className="h-4 w-4" />
            <span>Bitácora de Servicios & Gastos ({records.length})</span>
          </button>
        </div>

        {/* Resumen de gasto en pestaña historial */}
        {activeTab === 'history' && (
          <div className="hidden sm:flex items-center gap-3 text-xs font-bold text-slate-700">
            <span>Gasto Acumulado:</span>
            <span className="font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
              C$ {totalExpenses.totalNIO.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {totalExpenses.totalUSD > 0 && (
              <span className="font-mono text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                $ {totalExpenses.totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ─── VISTA 1: TABLERO DE MOTOCICLETAS ─── */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          {/* Barra de Búsqueda y Filtros de Estado */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por placa, modelo, marca o motorizado..."
                className="w-full pl-9 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                Estado:
              </span>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'urgent', label: '🔴 Urgentes' },
                { id: 'warning', label: '🟡 Próximas' },
                { id: 'ok', label: '🟢 Al Día' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Estado de Carga */}
          {isLoadingVehicles && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-56 rounded-3xl" />
              <Skeleton className="h-56 rounded-3xl" />
              <Skeleton className="h-56 rounded-3xl" />
            </div>
          )}

          {/* Lista Vacía */}
          {!isLoadingVehicles && filteredVehicles.length === 0 && (
            <Card className="p-10 text-center space-y-3 bg-white border border-slate-200 rounded-3xl">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Bike className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No hay motocicletas registradas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'No se encontraron resultados para los filtros seleccionados.'
                  : 'Comienza agregando las motocicletas de tu flota para llevar el control automático de odómetros y cambios de aceite.'}
              </p>
              {!searchQuery && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreateVehicle}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Registrar Primera Moto
                </Button>
              )}
            </Card>
          )}

          {/* Grid de Tarjetas de Motocicletas */}
          {!isLoadingVehicles && filteredVehicles.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVehicles.map((v) => {
                const health = calculateVehicleHealth(v)

                return (
                  <Card
                    key={v.id}
                    className={`p-5 rounded-3xl border transition-all duration-200 space-y-4 shadow-2xs hover:shadow-md bg-white ${
                      health.overall_status === 'urgent'
                        ? 'border-rose-300 ring-2 ring-rose-200/50'
                        : health.overall_status === 'warning'
                        ? 'border-amber-300'
                        : 'border-slate-200'
                    }`}
                  >
                    {/* Header de Tarjeta */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black font-mono tracking-tight text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                            {v.plate}
                          </span>
                          <Badge
                            variant={
                              v.status === 'active'
                                ? 'completed'
                                : v.status === 'in_maintenance'
                                ? 'pending'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {v.status === 'active'
                              ? 'En Ruta'
                              : v.status === 'in_maintenance'
                              ? 'En Taller'
                              : 'Inactiva'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 font-bold mt-1">
                          {v.brand} {v.model} {v.year ? `(${v.year})` : ''} &bull; {v.color || 'Color N/D'}
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          title="Editar Ficha"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setVehicleToDelete(v)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar Moto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Odómetro Actual y Motorizado */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block">
                          Odómetro Actual
                        </span>
                        <span className="text-base font-black font-mono text-slate-900">
                          {v.current_odometer.toLocaleString()} km
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                        <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400 block">
                          Repartidor Asignado
                        </span>
                        <span className="text-xs font-bold text-slate-800 truncate block">
                          {v.assigned_courier_name || 'Sin asignar'}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Desgaste y Próximo Cambio de Aceite */}
                    <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/70">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <Fuel className="h-3.5 w-3.5 text-indigo-600" />
                          Vida del Aceite
                        </span>
                        <span
                          className={`font-black font-mono text-xs ${
                            health.oil_status === 'urgent'
                              ? 'text-rose-600'
                              : health.oil_status === 'warning'
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {health.oil_km_remaining > 0
                            ? `Restan ${health.oil_km_remaining} km`
                            : `¡Vencido por ${Math.abs(health.oil_km_remaining)} km!`}
                        </span>
                      </div>

                      {/* Barra de Progreso */}
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            health.oil_status === 'urgent'
                              ? 'bg-rose-500'
                              : health.oil_status === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${health.oil_percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-3xs text-slate-500 font-medium">
                        <span>Último: {v.last_oil_change_km.toLocaleString()} km</span>
                        <span>Intervalo: cada {v.oil_change_interval_km.toLocaleString()} km</span>
                      </div>
                    </div>

                    {/* Botón de Acción Rápida: Registrar Servicio */}
                    <Button
                      type="button"
                      variant={health.overall_status === 'urgent' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleOpenMaintenance(v)}
                      leftIcon={<Wrench className="h-3.5 w-3.5" />}
                      className="w-full justify-center font-bold text-xs shadow-2xs"
                    >
                      Registrar Cambio de Aceite / Servicio
                    </Button>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── VISTA 2: BITÁCORA HISTÓRICA DE SERVICIOS Y GASTOS ─── */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden border border-slate-200 rounded-3xl shadow-sm bg-white">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Historial de Servicios Mecánicos & Mantenimientos
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Registro detallado de cambios de aceite, repuestos cambiados y costos por vehículo.
              </p>
            </div>
          </div>

          {isLoadingRecords ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Wrench className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">
                No hay servicios mecánicos registrados en la bitácora aún.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-2xs font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Placa Moto</th>
                    <th className="py-3 px-4">Tipo de Servicio</th>
                    <th className="py-3 px-4">Odómetro</th>
                    <th className="py-3 px-4">Repuestos / Insumos</th>
                    <th className="py-3 px-4">Taller / Mecánico</th>
                    <th className="py-3 px-4 text-right">Costo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 whitespace-nowrap font-semibold">
                        {formatDate(r.service_date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {r.vehicle_plate}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-900">
                          {MAINTENANCE_TYPE_LABELS[r.service_type] || r.service_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {r.odometer_at_service.toLocaleString()} km
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.parts_replaced || 'N/D'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {r.mechanic_or_workshop || 'Taller General'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {r.currency === 'USD' ? '$' : 'C$'}{' '}
                        {r.cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ─── MODALES ─── */}
      <VehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        vehicleToEdit={vehicleToEdit}
        onSave={async (data) => {
          await saveVehicle(data)
        }}
        isLoading={isSavingVehicle}
      />

      <MaintenanceRecordModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        vehicle={vehicleForMaintenance}
        onSave={async (data) => {
          await addMaintenance(data)
        }}
        isLoading={isAddingMaintenance}
      />

      <ConfirmDialog
        isOpen={!!vehicleToDelete}
        onClose={() => {
          if (!isDeleting) setVehicleToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Eliminar Motocicleta"
        description={`¿Estás seguro de que deseas eliminar la moto ${vehicleToDelete?.plate} de la flota? Esta acción no se puede deshacer.`}
        confirmText={isDeleting ? 'Eliminando...' : 'Eliminar Motocicleta'}
        cancelText="Cancelar"
        variant="destructive"
      />
    </div>
  )
}
