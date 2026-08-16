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
  Sun,
  CalendarCheck,
  MoreVertical,
  Check,
  Clock,
  StopCircle,
  AlertTriangle,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday, useWorkdayMutations } from '@/modules/workdays/hooks/useWorkday'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { StartWorkdayModal } from '@/modules/courier/components/StartWorkdayModal'
import { NewCourierGestionModal } from '@/modules/courier/components/NewCourierGestionModal'
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
import {
  getLocalDateString,
  getLocalTomorrowString,
  getStartOfWeekString,
  getEndOfWeekString,
} from '@/shared/utils/date'
import { cn } from '@/shared/utils/cn'

export default function CourierHomePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''

  const todayStr = getLocalDateString()
  const tomorrowStr = getLocalTomorrowString()
  const startOfWeekStr = getStartOfWeekString()
  const endOfWeekStr = getEndOfWeekString()

  const [searchQuery, setSearchQuery] = useState('')
  const [timeFilter, setTimeFilter] = useState<'today' | 'tomorrow' | 'week' | 'delayed'>('today')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'en_route' | 'completed'>('all')
  const [isStartModalOpen, setIsStartModalOpen] = useState(false)
  const [isNewGestionOpen, setIsNewGestionOpen] = useState(false)
  const [endKm, setEndKm] = useState<number | ''>('')
  const [isEndOpen, setIsEndOpen] = useState(false)

  const { data: activeWorkday } = useActiveWorkday(profile?.id)
  
  // Consultar todas las tareas asignadas al motorizado
  const { data: tasksData, isLoading: isLoadingTasks } = useTasks({
    courier_id: profile?.id,
    page_size: 100,
  })

  const { endWorkday, isEnding } = useWorkdayMutations()

  const allTasks = tasksData?.data || []

  // Clasificación dinámica por fecha real sin desfase de zona horaria
  const todayTasks = useMemo(
    () => allTasks.filter((t) => t.scheduled_date === todayStr),
    [allTasks, todayStr]
  )

  const tomorrowTasks = useMemo(
    () => allTasks.filter((t) => t.scheduled_date === tomorrowStr),
    [allTasks, tomorrowStr]
  )

  const weekTasks = useMemo(
    () =>
      allTasks.filter(
        (t) => t.scheduled_date >= startOfWeekStr && t.scheduled_date <= endOfWeekStr
      ),
    [allTasks, startOfWeekStr, endOfWeekStr]
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

  // Conjunto base según el filtro temporal seleccionado (Hoy / Mañana / Semana / Retrasadas)
  const currentBaseTasks = useMemo(() => {
    switch (timeFilter) {
      case 'today':
        return todayTasks
      case 'tomorrow':
        return tomorrowTasks
      case 'week':
        return weekTasks
      case 'delayed':
        return delayedTasks
      default:
        return todayTasks
    }
  }, [timeFilter, todayTasks, tomorrowTasks, weekTasks, delayedTasks])

  // Contadores de estado en el grupo seleccionado
  const pendingCount = currentBaseTasks.filter(
    (t) => t.status === 'pending' || t.status === 'assigned'
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

      if (statusFilter === 'pending') return t.status === 'pending' || t.status === 'assigned'
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
    switch (timeFilter) {
      case 'today':
        return 'Entregas de hoy'
      case 'tomorrow':
        return 'Entregas de mañana'
      case 'week':
        return 'Entregas de esta semana'
      case 'delayed':
        return 'Tareas retrasadas pendientes'
      default:
        return 'Entregas'
    }
  }, [timeFilter])

  return (
    <div className="space-y-5 animate-fade-in pb-24 max-w-2xl mx-auto">
      {/* 1. Buscador Superior */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar tareas, clientes o direcciones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 bg-slate-100/90 text-slate-800 text-xs font-medium rounded-2xl border-0 focus:outline-none focus:ring-2 focus:ring-[#004594]/30 placeholder:text-slate-400 transition-all"
          />
        </div>
        <button
          onClick={() => navigate('/motorizado/tareas')}
          className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 hover:bg-slate-50 transition cursor-pointer shrink-0"
          aria-label="Ir a Mis Tareas"
          title="Ver en Vista Completa"
        >
          <SlidersHorizontal size={18} className="text-slate-600" />
        </button>
      </div>

      {/* 2. Resumen de Estados (Filtros Circulares Interactivos) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-[#0A2540]">
            Resumen ({sectionTitle})
          </h2>
          {statusFilter !== 'all' ? (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-2xs font-bold text-rose-600 hover:underline cursor-pointer bg-rose-50 px-2 py-0.5 rounded-full"
            >
              Quitar filtro (Mostrar todas)
            </button>
          ) : (
            <button
              onClick={() => navigate('/motorizado/tareas')}
              className="text-2xs font-bold text-[#004594] hover:underline cursor-pointer"
            >
              Ver calendario
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {/* Pendientes — Círculo Azul */}
          <div
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
            onClick={() => setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'))}
          >
            <div
              className={`w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-xs transition-all ${
                statusFilter === 'pending'
                  ? 'ring-4 ring-blue-500/40 scale-110'
                  : 'group-hover:scale-105'
              }`}
            >
              <Calendar size={20} />
            </div>
            <span className="text-base font-extrabold text-[#0A2540] font-mono leading-none mt-1">
              {pendingCount}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                statusFilter === 'pending' ? 'text-blue-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              Pendientes
            </span>
          </div>

          {/* En progreso — Círculo Naranja */}
          <div
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
            onClick={() => setStatusFilter((prev) => (prev === 'en_route' ? 'all' : 'en_route'))}
          >
            <div
              className={`w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs transition-all ${
                statusFilter === 'en_route'
                  ? 'ring-4 ring-amber-500/40 scale-110'
                  : 'group-hover:scale-105'
              }`}
            >
              <Play size={20} className="fill-current ml-0.5" />
            </div>
            <span className="text-base font-extrabold text-[#0A2540] font-mono leading-none mt-1">
              {enRouteCount}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                statusFilter === 'en_route' ? 'text-amber-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              En ruta
            </span>
          </div>

          {/* Completadas — Círculo Verde */}
          <div
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
            onClick={() => setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'))}
          >
            <div
              className={`w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs transition-all ${
                statusFilter === 'completed'
                  ? 'ring-4 ring-emerald-500/40 scale-110'
                  : 'group-hover:scale-105'
              }`}
            >
              <Check size={20} strokeWidth={2.8} />
            </div>
            <span className="text-base font-extrabold text-[#0A2540] font-mono leading-none mt-1">
              {completedCount}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                statusFilter === 'completed' ? 'text-emerald-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              Listas
            </span>
          </div>

          {/* Retrasadas — Círculo Rojo */}
          <div
            className="flex flex-col items-center gap-1.5 cursor-pointer group"
            onClick={() => {
              setTimeFilter('delayed')
              setStatusFilter('all')
            }}
          >
            <div
              className={`w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs transition-all ${
                timeFilter === 'delayed'
                  ? 'ring-4 ring-rose-500/40 scale-110'
                  : 'group-hover:scale-105'
              }`}
            >
              <Flag size={20} />
            </div>
            <span className="text-base font-extrabold text-[#0A2540] font-mono leading-none mt-1">
              {delayedTasks.length}
            </span>
            <span
              className={`text-[10px] font-semibold ${
                timeFilter === 'delayed' ? 'text-rose-700 font-extrabold' : 'text-slate-500'
              }`}
            >
              Atrasadas
            </span>
          </div>
        </div>
      </div>

      {/* 2.5 Botón de Acción "+ Registrar nueva gestión" */}
      <div className="space-y-1">
        <button
          disabled={!activeWorkday || activeWorkday.status !== 'open'}
          onClick={() => setIsNewGestionOpen(true)}
          className={`w-full min-h-[52px] rounded-full text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition ${
            activeWorkday && activeWorkday.status === 'open'
              ? 'bg-[#004594] hover:bg-[#083570] active:scale-[0.99] cursor-pointer'
              : 'bg-[#004594]/40 border border-slate-200/80 cursor-not-allowed opacity-75'
          }`}
        >
          <Plus size={20} strokeWidth={2.8} />
          <span>+ Registrar nueva gestión</span>
        </button>
        {(!activeWorkday || activeWorkday.status !== 'open') && (
          <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-2xl text-center border border-amber-200/80">
            💡 Inicia tu jornada para registrar una gestión o retiro.
          </p>
        )}
      </div>

      {/* 3. Sección "Mis tareas" — Bento Grid 2x2 Interactivo de Fecha */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0A2540]">Filtrar por Fecha</h2>
          <span className="text-2xs text-slate-500 font-medium">Toca para cambiar la lista</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Card 1: Hoy */}
          <div
            onClick={() => {
              setTimeFilter('today')
              setStatusFilter('all')
            }}
            className={cn(
              'rounded-3xl p-4 flex flex-col justify-between space-y-3 transition cursor-pointer border',
              timeFilter === 'today'
                ? 'bg-[#F5F8FE] border-[#004594] ring-2 ring-[#004594]/30 shadow-xs'
                : 'bg-[#F5F8FE]/60 border-blue-100/70 hover:bg-[#F5F8FE]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-[#004594]/10 text-[#004594] flex items-center justify-center">
                <CalendarCheck size={18} />
              </div>
              <div className="text-right">
                <span className="text-2xs font-bold text-[#0A2540] block leading-tight">Hoy</span>
                <span className="text-[10px] font-medium text-slate-500">
                  {new Date().getDate()} de {new Date().toLocaleDateString('es-NI', { month: 'short' })}
                </span>
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-[#0A2540] font-mono block leading-none">
                {todayTasks.length}
              </span>
              <span className="text-2xs font-semibold text-slate-500 mt-1 block">tareas</span>
            </div>
          </div>

          {/* Card 2: Mañana */}
          <div
            onClick={() => {
              setTimeFilter('tomorrow')
              setStatusFilter('all')
            }}
            className={cn(
              'rounded-3xl p-4 flex flex-col justify-between space-y-3 transition cursor-pointer border',
              timeFilter === 'tomorrow'
                ? 'bg-[#FCFAF4] border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                : 'bg-[#FCFAF4]/60 border-amber-100/70 hover:bg-[#FCFAF4]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Sun size={18} />
              </div>
              <div className="text-right">
                <span className="text-2xs font-bold text-[#0A2540] block leading-tight">Mañana</span>
                <span className="text-[10px] font-medium text-slate-500">
                  {new Date(Date.now() + 86400000).getDate()} de{' '}
                  {new Date(Date.now() + 86400000).toLocaleDateString('es-NI', { month: 'short' })}
                </span>
              </div>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-[#0A2540] font-mono block leading-none">
                {tomorrowTasks.length}
              </span>
              <span className="text-2xs font-semibold text-slate-500 mt-1 block">tareas</span>
            </div>
          </div>

          {/* Card 3: Esta semana */}
          <div
            onClick={() => {
              setTimeFilter('week')
              setStatusFilter('all')
            }}
            className={cn(
              'rounded-3xl p-4 flex flex-col justify-between space-y-3 transition cursor-pointer border',
              timeFilter === 'week'
                ? 'bg-[#F3F9F6] border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                : 'bg-[#F3F9F6]/60 border-emerald-100/70 hover:bg-[#F3F9F6]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Calendar size={18} />
              </div>
              <span className="text-2xs font-bold text-[#0A2540]">Esta semana</span>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-[#0A2540] font-mono block leading-none">
                {weekTasks.length}
              </span>
              <span className="text-2xs font-semibold text-slate-500 mt-1 block">tareas</span>
            </div>
          </div>

          {/* Card 4: Retrasadas */}
          <div
            onClick={() => {
              setTimeFilter('delayed')
              setStatusFilter('all')
            }}
            className={cn(
              'rounded-3xl p-4 flex flex-col justify-between space-y-3 transition cursor-pointer border',
              timeFilter === 'delayed'
                ? 'bg-[#FCF5F7] border-rose-500 ring-2 ring-rose-500/30 shadow-xs'
                : 'bg-[#FCF5F7]/60 border-rose-100/70 hover:bg-[#FCF5F7]'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <span className="text-2xs font-bold text-[#0A2540]">Retrasadas</span>
            </div>
            <div>
              <span className="text-2xl font-extrabold text-[#0A2540] font-mono block leading-none">
                {delayedTasks.length}
              </span>
              <span className="text-2xs font-semibold text-slate-500 mt-1 block">tareas</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Botón de Jornada */}
      {!activeWorkday ? (
        <button
          onClick={() => setIsStartModalOpen(true)}
          className="w-full min-h-[52px] rounded-full bg-[#004594] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md hover:bg-[#083570] transition cursor-pointer"
        >
          <Plus size={20} strokeWidth={2.5} />
          <span>Iniciar Jornada de Hoy</span>
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/motorizado/ruta')}
            className="flex-1 min-h-[52px] rounded-full bg-[#004594] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md hover:bg-[#083570] transition cursor-pointer"
          >
            <Navigation size={18} />
            <span>Ver Mi Ruta del Día</span>
          </button>

          <button
            onClick={() => setIsEndOpen(true)}
            className="h-[52px] px-4 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-100 transition cursor-pointer shrink-0"
          >
            <StopCircle size={16} />
            <span>Cierre</span>
          </button>
        </div>
      )}

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
      <NewCourierGestionModal
        isOpen={isNewGestionOpen}
        onClose={() => setIsNewGestionOpen(false)}
        branchId={branchId}
        workdayId={activeWorkday?.id}
      />
    </div>
  )
}
