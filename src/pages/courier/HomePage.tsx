import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Play,
  CheckCircle2,
  Navigation,
  Calendar,
  Search,
  SlidersHorizontal,
  Plus,
  Flag,
  MoreVertical,
  Check,
  StopCircle,
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Banknote,
  Calculator,
  Bus,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday, useWorkdayMutations } from '@/modules/workdays/hooks/useWorkday'
import { useCourierPendingBalances } from '@/modules/settlements/hooks/usePendingBalances'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { StartWorkdayModal } from '@/modules/courier/components/StartWorkdayModal'
import {
  Button,
  Skeleton,
  EmptyState,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Input,
} from '@/shared/components/ui'
import { getLocalDateString } from '@/shared/utils/date'

export default function CourierHomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''

  const todayStr = getLocalDateString()

  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<'today' | 'delayed'>('today')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'en_route' | 'completed'>('all')
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [endKm, setEndKm] = useState<number | ''>('')
  const [isEndOpen, setIsEndOpen] = useState(false)

  const { data: activeWorkday } = useActiveWorkday(profile?.id)
  const { data: pendingBalances } = useCourierPendingBalances(profile?.id, todayStr)
  
  // Consultar todas las tareas asignadas al motorizado
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks(
    {
      courier_id: profile?.id,
      page_size: 100,
    },
    { enabled: !!profile?.id }
  )

  const { endWorkday, isEnding } = useWorkdayMutations()

  const allTasks = tasksData?.data || []

  // Clasificación dinámica: Tareas de hoy vs Retrasadas acumuladas
  const todayTasks = useMemo(
    () => allTasks.filter((t) => t.scheduled_date === todayStr),
    [allTasks, todayStr]
  )

  const delayedTasks = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.scheduled_date < todayStr &&
          t.status !== 'completed' &&
          t.status !== 'cancelled'
      ),
    [allTasks, todayStr]
  )

  // Conjunto base: Entregas de hoy o Retrasadas
  const currentBaseTasks = useMemo(() => {
    return timeFilter === 'delayed' ? delayedTasks : todayTasks
  }, [timeFilter, todayTasks, delayedTasks])

  // Contadores de estado en el grupo seleccionado
  const pendingCount = currentBaseTasks.filter(
    (t) =>
      t.status === 'pending' ||
      t.status === 'assigned' ||
      t.status === 'not_completed' ||
      t.status === 'rescheduled'
  ).length
  const enRouteCount = currentBaseTasks.filter(
    (t) => t.status === 'en_route' || t.status === 'in_progress'
  ).length
  const completedCount = currentBaseTasks.filter((t) => t.status === 'completed').length

  // Lista final filtrada por búsqueda y estado
  const filteredTasks = useMemo(() => {
    return currentBaseTasks.filter((t) => {
      const matchesSearch = searchQuery
        ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.contact_name && t.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (t.institution_name && t.institution_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (t.address && t.address.toLowerCase().includes(searchQuery.toLowerCase()))
        : true

      if (!matchesSearch) return false

      if (statusFilter === 'pending') {
        return (
          t.status === 'pending' ||
          t.status === 'assigned' ||
          t.status === 'not_completed' ||
          t.status === 'rescheduled'
        )
      }
      if (statusFilter === 'en_route') return t.status === 'en_route' || t.status === 'in_progress'
      if (statusFilter === 'completed') return t.status === 'completed'
      return true
    })
  }, [currentBaseTasks, searchQuery, statusFilter])

  const handleEndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkday || !endKm) return

    try {
      await endWorkday({
        workday_id: activeWorkday.id,
        final_km: Number(endKm),
      })
      setIsEndOpen(false)
    } catch (err) {
      console.error('Error ending workday:', err)
    }
  }

  // Título contextual para la lista
  const sectionTitle = useMemo(() => {
    return timeFilter === 'delayed' ? 'Tareas retrasadas pendientes' : 'Entregas de hoy'
  }, [timeFilter])

  return (
    <div className="space-y-3.5 animate-fade-in pb-20 max-w-2xl mx-auto">
      {/* 0. Saludo y Fecha (Debajo de la franja azul, encima de todo) */}
      <div className="flex items-center justify-between px-0.5 pt-0.5 pb-1">
        <div>
          <h1 className="text-lg font-black text-[#0A2540] tracking-tight flex items-center gap-1.5 leading-tight">
            ¡Hola, {profile?.display_name || profile?.full_name?.split(' ')[0] || 'Motorizado'}! 👋
          </h1>
          <p className="text-xs font-semibold text-slate-500 capitalize mt-0.5">
            {new Date().toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* 1. Buscador Superior */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar tareas, clientes o direcciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-3.5 bg-slate-100/90 text-slate-800 text-xs font-medium rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-[#004594]/30 placeholder:text-slate-400 transition-all"
          />
        </div>
        <button
          onClick={() => navigate('/motorizado/tareas')}
          className="w-10 h-10 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition cursor-pointer shrink-0"
          aria-label="Ir a Mis Tareas"
          title="Ver en Vista Completa"
        >
          <SlidersHorizontal size={16} className="text-slate-600" />
        </button>
      </div>

      {/* ⚠️ ALERTA DE SALDO / CIERRES PENDIENTES DE DÍAS ANTERIORES */}
      {pendingBalances?.hasPendingBalances && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white p-3.5 rounded-2xl shadow-sm space-y-2 animate-fade-in">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-white/20 rounded-xl shrink-0 mt-0.5">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-black uppercase tracking-wider text-amber-100">
                  Saldo Pendiente Acumulado
                </h4>
                <span className="text-[11px] font-black bg-white/20 px-2 py-0.5 rounded-full font-tabular">
                  + C$ {pendingBalances.totalPendingCash.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[11px] text-white/95 mt-0.5 leading-snug">
                Tienes {pendingBalances.breakdown.length} jornada(s) anterior(es) con saldo o liquidación pendiente por entregar en caja.
              </p>
              <button
                onClick={() => navigate('/motorizado/liquidacion')}
                className="mt-2 inline-flex items-center gap-1 bg-white text-[#0A2540] text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-2xs hover:bg-slate-100 transition cursor-pointer"
              >
                <span>Ver Liquidación</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Resumen de Estados (Filtros Circulares Interactivos) */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#0A2540]">
            Resumen ({sectionTitle})
          </h2>
          {statusFilter !== 'all' && (
            <button
              onClick={() => {
                setStatusFilter('all')
                setTimeFilter('today')
              }}
              className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100"
            >
              Quitar filtro
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          {/* Pendientes — Círculo Azul */}
          <div
            className="flex flex-col items-center gap-1 cursor-pointer group"
            onClick={() => setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
          >
            <div
              className={`w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs transition-all ${
                statusFilter === 'pending'
                  ? 'ring-3 ring-blue-500/40 scale-105'
                  : 'group-hover:scale-105'
              }`}
            >
              <Calendar size={17} />
            </div>
            <span className="text-sm font-extrabold text-[#0A2540] font-mono leading-none mt-0.5">
              {pendingCount}
            </span>
            <span
              className={`text-[9px] font-semibold ${
                statusFilter === 'pending' ? 'text-blue-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              Pendientes
            </span>
          </div>

          {/* En progreso — Círculo Naranja */}
          <div
            className="flex flex-col items-center gap-1 cursor-pointer group"
            onClick={() => setStatusFilter((prev) => (prev === 'en_route' ? 'all' : 'en_route'))}
          >
            <div
              className={`w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs transition-all ${
                statusFilter === 'en_route'
                  ? 'ring-3 ring-amber-500/40 scale-105'
                  : 'group-hover:scale-105'
              }`}
            >
              <Play size={17} className="fill-current ml-0.5" />
            </div>
            <span className="text-sm font-extrabold text-[#0A2540] font-mono leading-none mt-0.5">
              {enRouteCount}
            </span>
            <span
              className={`text-[9px] font-semibold ${
                statusFilter === 'en_route' ? 'text-amber-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              En ruta
            </span>
          </div>

          {/* Completadas — Círculo Verde */}
          <div
            className="flex flex-col items-center gap-1 cursor-pointer group"
            onClick={() => setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
          >
            <div
              className={`w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs transition-all ${
                statusFilter === 'completed'
                  ? 'ring-3 ring-emerald-500/40 scale-105'
                  : 'group-hover:scale-105'
              }`}
            >
              <Check size={17} strokeWidth={2.8} />
            </div>
            <span className="text-sm font-extrabold text-[#0A2540] font-mono leading-none mt-0.5">
              {completedCount}
            </span>
            <span
              className={`text-[9px] font-semibold ${
                statusFilter === 'completed' ? 'text-emerald-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              Listas
            </span>
          </div>

          {/* Retrasadas — Círculo Rojo */}
          <div
            className="flex flex-col items-center gap-1 cursor-pointer group"
            onClick={() => {
              setTimeFilter('delayed')
              setStatusFilter('all')
            }}
          >
            <div
              className={`w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs transition-all ${
                timeFilter === 'delayed'
                  ? 'ring-3 ring-rose-500/40 scale-105'
                  : 'group-hover:scale-105'
              }`}
            >
              <Flag size={17} />
            </div>
            <span className="text-sm font-extrabold text-[#0A2540] font-mono leading-none mt-0.5">
              {delayedTasks.length}
            </span>
            <span
              className={`text-[9px] font-semibold ${
                timeFilter === 'delayed' ? 'text-rose-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              Atrasadas
            </span>
          </div>
        </div>
      </div>

      {/* 2.5 Control de Jornada Laboral */}
      {!activeWorkday ? (
        <button
          onClick={() => setIsStartModalOpen(true)}
          className="w-full h-11 rounded-2xl bg-[#004594] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-[#083570] active:scale-[0.99] transition cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Iniciar Jornada de Hoy</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/motorizado/tareas')}
            className="flex-1 h-11 rounded-2xl bg-[#004594] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-[#083570] active:scale-[0.99] transition cursor-pointer"
          >
            <Navigation size={16} />
            <span>Ver Mis Tareas / Ruta</span>
          </button>

          <button
            onClick={() => setIsEndOpen(true)}
            className="h-11 px-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100 transition cursor-pointer shrink-0"
          >
            <StopCircle size={15} />
            <span>Cierre</span>
          </button>
        </div>
      )}

      {/* 3. Accesos Rápidos a Módulos (Mis Tareas, Fondos, Liquidación, Buses) */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-bold text-[#0A2540]">Accesos Rápidos</h2>
          <span className="text-[10px] text-slate-500 font-medium">Módulos de trabajo</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Mis Tareas */}
          <div
            onClick={() => navigate('/motorizado/tareas')}
            className="rounded-2xl p-3 flex flex-col justify-between min-h-[82px] sm:min-h-[88px] border bg-[#F5F8FE] border-blue-200/80 hover:border-[#004594] transition cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#004594]/10 text-[#004594] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <ClipboardList size={16} />
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:text-[#004594] group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-extrabold text-[#0A2540] block leading-tight">
                Mis Tareas
              </span>
              <span className="text-[10px] font-semibold text-blue-700/90 block mt-0.5 leading-tight">
                {todayTasks.length} {todayTasks.length === 1 ? 'tarea' : 'tareas'} hoy
              </span>
            </div>
          </div>

          {/* Card 2: Fondos */}
          <div
            onClick={() => navigate('/motorizado/fondos')}
            className="rounded-2xl p-3 flex flex-col justify-between min-h-[82px] sm:min-h-[88px] border bg-[#F3F9F6] border-emerald-200/80 hover:border-emerald-500 transition cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Banknote size={16} />
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-extrabold text-[#0A2540] block leading-tight">
                Fondos & Caja
              </span>
              <span className="text-[10px] font-semibold text-emerald-700/90 block mt-0.5 leading-tight">
                Viáticos y gastos
              </span>
            </div>
          </div>

          {/* Card 3: Liquidación */}
          <div
            onClick={() => navigate('/motorizado/liquidacion')}
            className="rounded-2xl p-3 flex flex-col justify-between min-h-[82px] sm:min-h-[88px] border bg-[#FAF8FE] border-purple-200/80 hover:border-purple-500 transition cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calculator size={16} />
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-extrabold text-[#0A2540] block leading-tight">
                Liquidación
              </span>
              <span className="text-[10px] font-semibold text-purple-700/90 block mt-0.5 leading-tight">
                Arqueo y balance
              </span>
            </div>
          </div>

          {/* Card 4: Directorio Buses */}
          <div
            onClick={() => navigate('/motorizado/buses')}
            className="rounded-2xl p-3 flex flex-col justify-between min-h-[82px] sm:min-h-[88px] border bg-[#FCFAF4] border-amber-200/80 hover:border-amber-500 transition cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Bus size={16} />
              </div>
              <ChevronRight size={14} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-extrabold text-[#0A2540] block leading-tight">
                Directorio Buses
              </span>
              <span className="text-[10px] font-semibold text-amber-700/90 block mt-0.5 leading-tight">
                Terminales y rutas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Lista de Entregas del Día */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A2540]">
            {sectionTitle} ({filteredTasks.length})
          </h2>
          {statusFilter !== 'all' && (
            <span className="text-2xs font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
              Filtrado: {statusFilter === 'pending' ? 'Pendientes' : statusFilter === 'en_route' ? 'En ruta' : 'Completadas'}
            </span>
          )}
        </div>

        {isLoadingTasks ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            title="¡Todo al día!"
            description={`No hay tareas registradas para la sección "${sectionTitle}".`}
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-600" />}
          />
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task, idx) => {
              const cardStyles = [
                'bg-[#FAF8FE] border-purple-100/70',
                'bg-[#F5F8FE] border-blue-100/70',
                'bg-[#F3F9F6] border-emerald-100/70',
                'bg-[#FCFAF4] border-amber-100/70',
              ]
              const cardStyle = cardStyles[idx % cardStyles.length]

              const isOverdue = task.scheduled_date < todayStr && task.status !== 'completed'

              return (
                <div
                  key={task.id}
                  onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
                  className={`${cardStyle} rounded-3xl p-4 space-y-3 shadow-2xs hover:shadow-xs transition cursor-pointer border`}
                >
                  {/* Fila 1: Checkbox + Título + Contacto / Ubicación */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox circular */}
                      <div
                        className={`w-6 h-6 rounded-full border-2 border-slate-400/60 bg-white flex items-center justify-center shrink-0 mt-0.5 ${
                          task.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : ''
                        }`}
                      >
                        {task.status === 'completed' && <Check size={14} strokeWidth={3} />}
                      </div>

                      {/* Detalles de la Tarea */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-extrabold text-[#0A2540] leading-snug tracking-tight">
                          {task.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 font-medium mt-1">
                          {(task.contact_name || task.institution_name || task.provider_name) && (
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              👤 {task.contact_name || task.institution_name || task.provider_name}
                            </span>
                          )}
                          {task.address && (
                            <span className="text-slate-500 flex items-center gap-1">
                              📍 <span className="truncate max-w-[200px]">{task.address}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prioridad / Alerta de Atraso */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      {isOverdue && (
                        <span className="text-2xs font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 border border-rose-200">
                          <AlertTriangle size={12} /> Atrasada
                        </span>
                      )}
                      <Flag
                        size={16}
                        className={
                          task.priority === 'high' || task.priority === 'urgent'
                            ? 'text-rose-500 fill-current'
                            : 'text-slate-400'
                        }
                      />
                      <MoreVertical size={16} className="text-slate-400 hover:text-slate-700" />
                    </div>
                  </div>

                  {/* Fila 2: Fecha / Hora y Montos (Ingreso/Egreso) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Fecha si no es hoy */}
                      {task.scheduled_date !== todayStr && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold px-2 py-0.5 rounded-lg font-mono">
                          📅 {task.scheduled_date}
                        </span>
                      )}

                      {/* Hora Programada si existe */}
                      {task.scheduled_start_time && (
                        <span className="inline-flex items-center gap-1 bg-white/90 border border-slate-200/80 text-[11px] font-extrabold text-slate-700 px-2.5 py-1 rounded-xl font-mono shadow-2xs">
                          ⏰ {task.scheduled_start_time}
                        </span>
                      )}

                      {/* Contenedor de INGRESO (Cobro / Retiro ATM -> Verde) */}
                      {task.requires_collection && (
                        <span className="inline-flex items-center gap-1 bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-2xs">
                          💰 Ingreso: C${task.expected_collection_amount || 0}
                        </span>
                      )}

                      {/* Contenedor de EGRESO (Pago / Compra -> Rosa) */}
                      {task.requires_payment && (
                        <span className="inline-flex items-center gap-1 bg-rose-100/90 text-rose-900 border border-rose-300/80 text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-2xs">
                          💸 Pagar: C${task.expected_payment_amount || 0}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] font-bold text-slate-500 font-mono">
                      {task.code}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modales */}
      <Modal isOpen={isEndOpen} onClose={() => setIsEndOpen(false)}>
        <ModalContent size="sm">
          <ModalHeader onClose={() => setIsEndOpen(false)}>
            <ModalTitle>Solicitar Cierre de Jornada</ModalTitle>
            <ModalDescription>Ingresa el kilometraje final registrado en tu velocímetro.</ModalDescription>
          </ModalHeader>

          <form onSubmit={handleEndSubmit}>
            <ModalBody className="space-y-3">
              <Input
                label={`Kilometraje Final (Inicial: ${activeWorkday?.initial_km ?? 0} km)`}
                type="number"
                required
                min={activeWorkday?.initial_km ?? 0}
                placeholder="Ej: 45310"
                value={endKm}
                onChange={(e) => setEndKm(e.target.value ? Number(e.target.value) : '')}
              />
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsEndOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" size="sm" isLoading={isEnding}>
                Confirmar Cierre
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <StartWorkdayModal branchId={branchId} isOpen={isStartModalOpen} onClose={() => setIsStartModalOpen(false)} />
    </div>
  )
}
