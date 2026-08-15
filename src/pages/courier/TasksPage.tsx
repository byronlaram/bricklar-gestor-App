import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  ArrowLeft,
  SlidersHorizontal,
  Flag,
  MoreVertical,
  Check,
  CheckSquare,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import { useTasks } from '@/modules/tasks/hooks/useTasks'
import { useTaskMutations } from '@/modules/tasks/hooks/useTaskMutations'
import type { TaskWithCourier } from '@/modules/tasks/types/task.types'
import { CompleteTaskModal } from '@/modules/courier/components/CompleteTaskModal'
import { NewCourierGestionModal } from '@/modules/courier/components/NewCourierGestionModal'
import {
  Button,
  Input,
  Skeleton,
  EmptyState,
  useToast,
} from '@/shared/components/ui'

export default function CourierTasksPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const branchId = profile?.primary_branch_id || profile?.branch_ids[0] || ''
  const toast = useToast()

  const { data: activeWorkday } = useActiveWorkday(profile?.id)
  const [isNewGestionOpen, setIsNewGestionOpen] = useState(false)

  // Generar dinámicamente los próximos 7 días a partir de la fecha actual real
  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const isoDate = d.toISOString().split('T')[0]
    const dayName = i === 0 ? 'Hoy' : d.toLocaleDateString('es-NI', { weekday: 'short' })
    const dayNum = d.getDate()
    const monthName = d.toLocaleDateString('es-NI', { month: 'short' })
    const fullDateStr = d.toLocaleDateString('es-NI', { weekday: 'long', day: 'numeric', month: 'long' })
    return {
      isoDate,
      dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1).replace('.', ''),
      dateLabel: `${dayNum} ${monthName.replace('.', '')}`,
      fullDateStr,
      isToday: i === 0,
    }
  })

  const [selectedDateIso, setSelectedDateIso] = useState<string>(weekDays[0].isoDate)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [completeTargetTask, setCompleteTargetTask] = useState<TaskWithCourier | null>(null)

  const { data: tasksData, isLoading } = useTasks({
    branch_id: branchId,
    courier_id: profile?.id,
    date: selectedDateIso,
    search: searchTerm || undefined,
    page_size: 100,
  })

  const { changeStatus, isChangingStatus } = useTaskMutations()
  const tasks = tasksData?.data || []
  const selectedDayObj = weekDays.find((d) => d.isoDate === selectedDateIso) || weekDays[0]

  const handleStartRoute = async (task: TaskWithCourier, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await changeStatus({ task_id: task.id, new_status: 'en_route', notes: 'Inició ruta' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartManagement = async (task: TaskWithCourier, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await changeStatus({ task_id: task.id, new_status: 'in_progress', notes: 'Llegó al lugar de gestión' })
    } catch (err) {
      console.error(err)
    }
  }

  const handleOpenCompleteModal = (task: TaskWithCourier, e: React.MouseEvent) => {
    e.stopPropagation()
    setCompleteTargetTask(task)
  }

  return (
    <div className="space-y-5 animate-fade-in pb-24 max-w-2xl mx-auto">
      {/* 1. Top Header con Flecha, Título e Iconos de Búsqueda/Filtro */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/motorizado')}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-700 transition cursor-pointer"
            aria-label="Volver"
          >
            <ArrowLeft size={18} className="text-[#004594]" />
          </button>
          <h1 className="text-lg font-bold text-[#0A2540] tracking-tight">Mis Tareas</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeWorkday && activeWorkday.status === 'open') {
                setIsNewGestionOpen(true)
              } else {
                toast.error('Jornada requerida', 'Inicia tu jornada para registrar una gestión.')
              }
            }}
            className="h-10 px-3.5 rounded-2xl bg-[#004594] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#083570] transition cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.8} />
            <span>+ Nueva Gestión</span>
          </button>
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-600 transition cursor-pointer"
          >
            <Search size={18} className="text-slate-600" />
          </button>
          <button
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-600 transition cursor-pointer"
          >
            <SlidersHorizontal size={18} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Campo de búsqueda desplegable */}
      {isSearchOpen && (
        <div className="animate-slide-up">
          <Input
            placeholder="Buscar por cliente, título o dirección..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-slate-400" />}
          />
        </div>
      )}

      {/* 2. Selector de Días Horizontal (Carrusel de Píldora Activa Azul Marino) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
        {weekDays.map((day) => {
          const isSelected = selectedDateIso === day.isoDate
          return (
            <button
              key={day.isoDate}
              onClick={() => setSelectedDateIso(day.isoDate)}
              className={`flex flex-col items-center justify-center min-w-[70px] py-2 px-3 rounded-2xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#004594] text-white font-extrabold shadow-sm scale-105'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/80 font-semibold'
              }`}
            >
              <span className="text-2xs uppercase tracking-tight opacity-90">{day.dayName}</span>
              <span className="text-xs font-mono font-bold leading-tight mt-0.5">{day.dateLabel}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Encabezado de Agrupación de Día */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h2 className="text-xs font-bold text-[#0A2540] capitalize">
          {selectedDayObj.dayName} • {selectedDayObj.fullDateStr}
        </h2>
        <span className="text-xs font-semibold text-slate-500">
          {tasks.length} tareas
        </span>
      </div>

      {/* 4. Lista de Tarjetas de Tarea Pastel */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="Sin entregas para este día"
          description="No hay tareas programadas para la fecha seleccionada."
          icon={<CheckSquare className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task, idx) => {
            const cardStyles = [
              'bg-[#FAF8FE] border-purple-100/70',
              'bg-[#F5F8FE] border-blue-100/70',
              'bg-[#F3F9F6] border-emerald-100/70',
              'bg-[#FCFAF4] border-amber-100/70',
              'bg-[#FCF5F7] border-rose-100/70',
            ]
            const cardStyle = cardStyles[idx % cardStyles.length]

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/motorizado/tareas/${task.id}`)}
                className={`${cardStyle} rounded-3xl p-4 space-y-3 shadow-2xs hover:shadow-xs transition cursor-pointer border`}
              >
                {/* Fila 1: Checkbox + Título + Cliente / Ubicación + Menú */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Selector / Checkbox circular */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        if (task.status === 'in_progress') {
                          handleOpenCompleteModal(task, e)
                        }
                      }}
                      className={`w-6 h-6 rounded-full border-2 border-slate-400/60 bg-white flex items-center justify-center shrink-0 mt-0.5 cursor-pointer ${
                        task.status === 'completed' ? 'bg-emerald-500 border-emerald-500 text-white' : ''
                      }`}
                    >
                      {task.status === 'completed' && <Check size={14} strokeWidth={3} />}
                    </div>

                    {/* Detalles Principales de la Gestión */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-[#0A2540] leading-snug tracking-tight">
                        {task.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 font-medium mt-1">
                        {task.contact_name && (
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            👤 {task.contact_name}
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

                  {/* Prioridad y Opciones */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <Flag size={16} className={task.priority === 'high' ? 'text-rose-500 fill-current' : 'text-slate-400'} />
                    <MoreVertical size={16} className="text-slate-400 hover:text-slate-700" />
                  </div>
                </div>

                {/* Fila 2: Hora, Contenedores de Monto (Ingreso/Egreso) y Botón de Estado */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Hora Programada */}
                    <span className="inline-flex items-center gap-1 bg-white/90 border border-slate-200/80 text-[11px] font-extrabold text-slate-700 px-2.5 py-1 rounded-xl font-mono shadow-2xs">
                      ⏰ {task.scheduled_start_time || '09:30 AM'}
                    </span>

                    {/* Contenedor de INGRESO (Cobro a recibir -> Verde) */}
                    {task.requires_collection && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100/90 text-emerald-900 border border-emerald-300/80 text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-2xs">
                        💰 Cobrar: C${task.expected_collection_amount || 0}
                      </span>
                    )}

                    {/* Contenedor de EGRESO (Pago a realizar -> Rojo/Rosa) */}
                    {task.requires_payment && (
                      <span className="inline-flex items-center gap-1 bg-rose-100/90 text-rose-900 border border-rose-300/80 text-xs font-extrabold px-2.5 py-1 rounded-xl shadow-2xs">
                        💸 Pagar: C${task.expected_payment_amount || 0}
                      </span>
                    )}
                  </div>

                  {/* Acciones de Estado Rápidas */}
                  <div className="flex items-center gap-2">
                    {task.status === 'assigned' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => handleStartRoute(task, e)}
                        isLoading={isChangingStatus}
                        className="text-2xs font-extrabold py-1 px-3 h-8 bg-[#004594] rounded-xl"
                      >
                        Iniciar Ruta
                      </Button>
                    )}

                    {task.status === 'en_route' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => handleStartManagement(task, e)}
                        isLoading={isChangingStatus}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-2xs font-extrabold py-1 px-3 h-8 rounded-xl"
                      >
                        Llegué al Lugar
                      </Button>
                    )}

                    {task.status === 'in_progress' && (
                      <Button
                        size="sm"
                        variant="confirm"
                        onClick={(e) => handleOpenCompleteModal(task, e)}
                        className="text-2xs font-extrabold py-1 px-3 h-8 rounded-xl"
                      >
                        Finalizar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Finalizar Tarea */}
      <CompleteTaskModal
        task={completeTargetTask}
        isOpen={!!completeTargetTask}
        onClose={() => setCompleteTargetTask(null)}
      />

      {/* Modal de Nueva Gestión */}
      <NewCourierGestionModal
        isOpen={isNewGestionOpen}
        onClose={() => setIsNewGestionOpen(false)}
        branchId={branchId}
        workdayId={activeWorkday?.id}
      />
    </div>
  )
}
