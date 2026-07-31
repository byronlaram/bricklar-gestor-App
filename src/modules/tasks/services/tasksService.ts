// ─── Tasks Service ────────────────────────────────────────────────────────────
// Todas las operaciones contra Supabase para el módulo de Tareas.
// Ninguna lógica financiera crítica ocurre aquí; solo lectura/escritura.

import { supabase } from '@/shared/lib/supabaseClient'
import type {
  Task,
  TaskWithCourier,
  TaskFilters,
  CreateTaskPayload,
  UpdateTaskPayload,
  AssignCourierPayload,
  ChangeStatusPayload,
  TaskAssignment,
  TaskStatusHistory,
  PaginatedTasks,
} from '../types/task.types'
import type { TaskStatus } from '@/shared/types'
import { ALLOWED_TRANSITIONS } from '@/shared/types'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PAGE_SIZE_DEFAULT = 25

// ─── Selector de columnas para joinear courier ────────────────────────────────

const TASK_WITH_COURIER_SELECT = `
  *,
  courier:profiles!tasks_assigned_courier_id_fkey (
    id,
    full_name,
    display_name,
    phone,
    avatar_url
  ),
  created_by_profile:profiles!tasks_created_by_fkey (
    full_name
  )
`

// ─── getTasks ─────────────────────────────────────────────────────────────────

export async function getTasks(filters: TaskFilters = {}): Promise<PaginatedTasks> {
  const {
    branch_id,
    date,
    date_from,
    date_to,
    status,
    task_type,
    priority,
    courier_id,
    search,
    page = 1,
    page_size = PAGE_SIZE_DEFAULT,
  } = filters

  const from = (page - 1) * page_size
  const to = from + page_size - 1

  let query = supabase
    .from('tasks')
    .select(TASK_WITH_COURIER_SELECT, { count: 'exact' })
    .is('deleted_at', null)
    .order('scheduled_date', { ascending: false })
    .order('route_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (branch_id) query = query.eq('branch_id', branch_id)

  // Filtro de fecha: exacta o rango
  if (date) {
    query = query.eq('scheduled_date', date)
  } else {
    if (date_from) query = query.gte('scheduled_date', date_from)
    if (date_to) query = query.lte('scheduled_date', date_to)
  }

  if (status) query = query.eq('status', status)
  if (task_type) query = query.eq('task_type', task_type)
  if (priority) query = query.eq('priority', priority)
  if (courier_id) query = query.eq('assigned_courier_id', courier_id)

  if (search) {
    query = query.or(
      `title.ilike.%${search}%,code.ilike.%${search}%,contact_name.ilike.%${search}%`
    )
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[Tasks] getTasks error:', error)
    throw new Error(error.message)
  }

  const total = count ?? 0
  return {
    data: (data ?? []) as unknown as TaskWithCourier[],
    count: total,
    page,
    page_size,
    total_pages: Math.ceil(total / page_size),
  }
}

// ─── getTaskById ──────────────────────────────────────────────────────────────

export async function getTaskById(id: string): Promise<TaskWithCourier> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_WITH_COURIER_SELECT)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) {
    console.error('[Tasks] getTaskById error:', error)
    throw new Error(error.message)
  }

  return data as unknown as TaskWithCourier
}

// ─── createTask ───────────────────────────────────────────────────────────────
// El código consecutivo se genera llamando a la Edge Function generate-task-code,
// que ejecuta generate_task_code() en PostgreSQL de forma atómica.

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  // 1. Obtener el branch_code para la sucursal
  const { data: branchData, error: branchError } = await supabase
    .from('branches')
    .select('code')
    .eq('id', payload.branch_id)
    .single()

  if (branchError || !branchData) {
    throw new Error('No se pudo obtener la sucursal.')
  }

  const branchCode: string = (branchData as { code: string }).code

  // 2. Llamar a la función de BD para generar el código consecutivo atómico
  const { data: codeData, error: codeError } = await supabase.rpc('generate_task_code', {
    p_branch_code: branchCode,
    p_task_type: payload.task_type,
    p_branch_id: payload.branch_id,
  })

  if (codeError || !codeData) {
    console.error('[Tasks] generate_task_code error:', codeError)
    throw new Error('No se pudo generar el código de tarea.')
  }

  // 3. Insertar la tarea con el código generado
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  const insert = {
    ...payload,
    code: codeData as string,
    created_by: userId,
    status: 'pending' as TaskStatus,
    financial_status: 'no_movement',
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(insert)
    .select()
    .single()

  if (error) {
    console.error('[Tasks] createTask error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Task
}

// ─── updateTask ───────────────────────────────────────────────────────────────

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id

  const { data, error } = await supabase
    .from('tasks')
    .update({ ...payload, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) {
    console.error('[Tasks] updateTask error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Task
}

// ─── deleteTask (soft delete) ─────────────────────────────────────────────────

export async function deleteTask(id: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id

  const { error } = await supabase
    .from('tasks')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq('id', id)
    .is('deleted_at', null)

  if (error) {
    console.error('[Tasks] deleteTask error:', error)
    throw new Error(error.message)
  }
}

// ─── assignTask ───────────────────────────────────────────────────────────────
// Asigna o reasigna un motorizado a una tarea.
// Registra historial en task_assignments.

export async function assignTask(payload: AssignCourierPayload): Promise<Task> {
  const { task_id, courier_id, reason } = payload
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  // 1. Obtener tarea actual para cerrar asignación previa
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('assigned_courier_id, status')
    .eq('id', task_id)
    .single()

  if (taskError) throw new Error(taskError.message)
  const task = taskData as { assigned_courier_id: string | null; status: string }

  // 2. Cerrar asignación previa (si existía)
  if (task.assigned_courier_id) {
    await supabase
      .from('task_assignments')
      .update({
        unassigned_at: new Date().toISOString(),
        unassigned_by: userId,
        reason: reason ?? null,
      })
      .eq('task_id', task_id)
      .is('unassigned_at', null)
  }

  // 3. Crear nueva asignación (si hay courier)
  if (courier_id) {
    const { error: assignError } = await supabase
      .from('task_assignments')
      .insert({
        task_id,
        courier_id,
        assigned_by: userId,
        reason: reason ?? null,
      })

    if (assignError) throw new Error(assignError.message)
  }

  // 4. Actualizar tarea: courier + estado
  const newStatus = courier_id
    ? task.status === 'pending' ? 'assigned' : task.status
    : 'pending'

  const { data, error } = await supabase
    .from('tasks')
    .update({
      assigned_courier_id: courier_id ?? null,
      status: newStatus,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task_id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // 5. Registrar historial de estado si cambió
  if (newStatus !== task.status) {
    await supabase.from('task_status_history').insert({
      task_id,
      from_status: task.status,
      to_status: newStatus,
      changed_by: userId,
      notes: courier_id ? 'Asignación de motorizado' : 'Motorizado desasignado',
    })
  }

  return data as unknown as Task
}

// ─── changeTaskStatus ─────────────────────────────────────────────────────────

export async function changeTaskStatus(payload: ChangeStatusPayload): Promise<Task> {
  const { task_id, new_status, notes, cancellation_reason } = payload
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  // Obtener estado actual
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('status')
    .eq('id', task_id)
    .single()

  if (taskError) throw new Error(taskError.message)
  const currentStatus = (taskData as { status: TaskStatus }).status

  // Validar transición
  const allowed = ALLOWED_TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes(new_status)) {
    throw new Error(
      `Transición inválida: ${currentStatus} → ${new_status}`
    )
  }

  // Preparar actualización
  const updatePayload: Record<string, unknown> = {
    status: new_status,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  }

  if (new_status === 'completed') {
    updatePayload.completed_at = new Date().toISOString()
  }

  if (new_status === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString()
    updatePayload.cancellation_reason = cancellation_reason ?? null
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updatePayload)
    .eq('id', task_id)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Registrar historial de estado
  await supabase.from('task_status_history').insert({
    task_id,
    from_status: currentStatus,
    to_status: new_status,
    changed_by: userId,
    notes: notes ?? null,
  })

  return data as unknown as Task
}

// ─── getTaskAssignments ───────────────────────────────────────────────────────

export async function getTaskAssignments(task_id: string): Promise<TaskAssignment[]> {
  const { data, error } = await supabase
    .from('task_assignments')
    .select(`
      *,
      courier:profiles!task_assignments_courier_id_fkey (
        id, full_name, display_name, phone, avatar_url
      ),
      assigned_by_profile:profiles!task_assignments_assigned_by_fkey (
        full_name
      )
    `)
    .eq('task_id', task_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as TaskAssignment[]
}

// ─── getTaskStatusHistory ─────────────────────────────────────────────────────

export async function getTaskStatusHistory(task_id: string): Promise<TaskStatusHistory[]> {
  const { data, error } = await supabase
    .from('task_status_history')
    .select(`
      *,
      changed_by_profile:profiles!task_status_history_changed_by_fkey (
        full_name
      )
    `)
    .eq('task_id', task_id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as TaskStatusHistory[]
}

// ─── getCouriersForBranch ─────────────────────────────────────────────────────
// Lista los motorizados activos de una sucursal para el selector de asignación.

export async function getCouriersForBranch(branch_id: string) {
  const { data, error } = await supabase
    .from('user_branches')
    .select(`
      user_id,
      profile:profiles!user_branches_user_id_fkey (
        id, full_name, display_name, phone, avatar_url, is_active
      )
    `)
    .eq('branch_id', branch_id)

  if (error) throw new Error(error.message)

  // Filtrar los que tienen rol courier y están activos
  // (el join directo con user_roles sería más limpio con una vista, aquí filtramos en cliente)
  const couriers = (data ?? [])
    .map((row: unknown) => {
      const r = row as { user_id: string; profile: { id: string; full_name: string; display_name: string | null; phone: string | null; avatar_url: string | null; is_active: boolean } | null }
      return r.profile
    })
    .filter((p): p is NonNullable<typeof p> => p !== null && p.is_active)

  return couriers
}
