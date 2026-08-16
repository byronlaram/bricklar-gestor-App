// ─── Tasks Service ────────────────────────────────────────────────────────────
// Todas las operaciones contra Supabase para el módulo de Tareas.
// Ninguna lógica financiera crítica ocurre aquí; solo lectura/escritura.

import { supabase } from '@/shared/lib/supabaseClient'
import type { Database } from '@/shared/lib/database.types'
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
    approval_status,
    creation_origin,
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
  if (approval_status) query = query.eq('approval_status', approval_status)
  if (creation_origin) query = query.eq('creation_origin', creation_origin)
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
  // 1. Llamar a la función RPC atómica de PostgreSQL con la firma de 2 parámetros (p_branch_id, p_task_type)
  const { data: codeData, error: codeError } = await supabase.rpc('generate_task_code', {
    p_branch_id: payload.branch_id,
    p_task_type: payload.task_type,
  })

  if (codeError || !codeData) {
    console.error('[Tasks] generate_task_code error:', codeError)
    const detailedMessage = codeError?.message
      ? `Error al generar código: ${codeError.message}`
      : 'No se pudo generar el código de tarea.'
    throw new Error(detailedMessage)
  }

  // 2. Determinar estado inicial según asignación de motorizado y origen
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa para registrar la tarea.')

  const courierId = payload.assigned_courier_id || null
  const initialStatus: TaskStatus = courierId ? 'assigned' : 'pending'

  const insert = {
    ...payload,
    assigned_courier_id: courierId,
    code: codeData as string,
    created_by: userId,
    status: initialStatus,
    approval_status: payload.approval_status || (payload.creation_origin === 'courier_created' ? 'pending' : 'approved'),
    creation_origin: payload.creation_origin || 'admin',
    evidence_url: payload.evidence_url || null,
    workday_id: payload.workday_id || null,
    financial_status: 'no_movement',
  }

  let { data, error } = await supabase
    .from('tasks')
    .insert(insert)
    .select()
    .single()

  // Fallback de compatibilidad: si la BD remota aún no tiene las columnas de la migración de aprobación
  if (error && error.message && (
    error.message.includes('approval_status') ||
    error.message.includes('creation_origin') ||
    error.message.includes('evidence_url') ||
    error.message.includes('workday_id')
  )) {
    console.warn('[Tasks] BD remota sin columnas de aprobación. Ejecutando inserción compatible:', error.message)
    const baseInsert = { ...insert }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (baseInsert as any).approval_status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (baseInsert as any).creation_origin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (baseInsert as any).evidence_url
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (baseInsert as any).workday_id

    const retry = await supabase
      .from('tasks')
      .insert(baseInsert)
      .select()
      .single()

    data = retry.data
    error = retry.error
  }

  if (error) {
    console.error('[Tasks] createTask insert error:', error)
    throw new Error(error.message || 'Error al insertar la tarea en la base de datos.')
  }

  // 3. Registrar en task_assignments si la tarea se creó asignada
  if (courierId && data?.id) {
    const { error: assignErr } = await supabase.from('task_assignments').insert({
      task_id: data.id,
      courier_id: courierId,
      assigned_by: userId,
      reason: payload.creation_origin === 'courier_created' ? 'Gestión creada por motorizado' : 'Asignación inicial al crear tarea',
    })
    if (assignErr) {
      console.warn('[Tasks] createTask task_assignments insert warning:', assignErr)
    }
  }

  return data as unknown as Task
}

// ─── updateTask ───────────────────────────────────────────────────────────────

export async function updateTask(id: string, payload: UpdateTaskPayload): Promise<Task> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id

  let { data, error } = await supabase
    .from('tasks')
    .update({ ...payload, updated_by: userId, updated_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single()

  // Fallback de compatibilidad para actualización
  if (error && error.message && (
    error.message.includes('approval_status') ||
    error.message.includes('creation_origin') ||
    error.message.includes('evidence_url') ||
    error.message.includes('workday_id')
  )) {
    const cleanPayload = { ...payload }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (cleanPayload as any).approval_status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (cleanPayload as any).creation_origin
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (cleanPayload as any).evidence_url
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (cleanPayload as any).workday_id

    const retry = await supabase
      .from('tasks')
      .update({ ...cleanPayload, updated_by: userId, updated_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    data = retry.data
    error = retry.error
  }

  if (error) {
    console.error('[Tasks] updateTask error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Task
}

// ─── deleteTask (soft delete seguro con reglas de integridad) ───────────────────

export async function deleteTask(id: string): Promise<void> {
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa para realizar esta acción.')

  // 1. Consultar la tarea actual para verificar estado e integridad
  const { data: task, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, code, title, status, branch_id, assigned_courier_id')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (fetchErr || !task) {
    throw new Error('La tarea seleccionada no existe o ya fue eliminada.')
  }

  // 2. Regla de protección de integridad operativa/financiera:
  // Si la tarea está completada, en ruta o en gestión, se bloquea la eliminación
  if (['completed', 'en_route', 'in_progress'].includes(task.status)) {
    throw new Error('No se puede eliminar esta tarea porque tiene movimientos o registros asociados.')
  }

  // 3. Ejecutar actualización soft-delete
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('tasks')
    .update({
      deleted_at: now,
      deleted_by: userId,
      updated_at: now,
      updated_by: userId,
    })
    .eq('id', id)

  if (error) {
    console.error('[Tasks] deleteTask error:', error)
    throw new Error('No fue posible eliminar la tarea. Intenta nuevamente.')
  }

  // 4. Registrar evento en audit_logs
  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'task_deleted',
      p_entity_type: 'task',
      p_entity_id: id,
      p_changes: {
        code: task.code,
        title: task.title,
        status: task.status,
        branch_id: task.branch_id,
        deleted_by: userId,
      },
    })
  } catch (auditErr) {
    console.warn('[Tasks] Audit log entry warning:', auditErr)
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
  const updatePayload: Database['public']['Tables']['tasks']['Update'] = {
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
// Consulta user_branches, profiles.primary_branch_id y fallback para máxima resiliencia.

export async function getCouriersForBranch(branch_id?: string) {
  const couriersMap = new Map<
    string,
    {
      id: string
      full_name: string
      display_name: string | null
      phone: string | null
      avatar_url: string | null
      role: string
      is_active: boolean
    }
  >()

  try {
    // 1. Si hay branch_id, buscar en user_branches
    if (branch_id) {
      const { data: ubData, error: ubError } = await supabase
        .from('user_branches')
        .select(`
          user_id,
          profile:profiles!user_branches_user_id_fkey (
            id, full_name, display_name, phone, avatar_url, role, is_active
          )
        `)
        .eq('branch_id', branch_id)

      if (!ubError && ubData) {
        ubData.forEach((row: any) => {
          const p = row.profile
          if (p && p.is_active && p.role === 'courier') {
            couriersMap.set(p.id, p)
          }
        })
      }

      // 2. Buscar también en profiles con primary_branch_id
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, phone, avatar_url, role, is_active')
        .eq('role', 'courier')
        .eq('is_active', true)
        .eq('primary_branch_id', branch_id)

      if (!profError && profData) {
        profData.forEach((p) => {
          couriersMap.set(p.id, p)
        })
      }
    }

    // 3. Fallback: Si no se encontraron por sucursal específica o no se pasó branch_id,
    // obtener todos los motorizados activos para que el administrador siempre pueda asignar.
    if (couriersMap.size === 0) {
      const { data: allCouriers, error: allErr } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, phone, avatar_url, role, is_active')
        .eq('role', 'courier')
        .eq('is_active', true)

      if (!allErr && allCouriers) {
        allCouriers.forEach((p) => {
          couriersMap.set(p.id, p)
        })
      }
    }
  } catch (err) {
    console.error('[Tasks] Error in getCouriersForBranch:', err)
  }

  return Array.from(couriersMap.values())
}

// ─── Reordenar Tareas de Ruta en Lote ───────────────────────────────────────────
export async function updateTaskRouteOrders(items: { id: string; route_order: number }[]): Promise<void> {
  if (!items || items.length === 0) return

  const now = new Date().toISOString()
  const updates = items.map(({ id, route_order }) =>
    supabase
      .from('tasks')
      .update({
        route_order,
        updated_at: now,
      })
      .eq('id', id)
  )

  const results = await Promise.all(updates)
  const firstError = results.find((r) => r.error)?.error

  if (firstError) {
    console.error('[Tasks] updateTaskRouteOrders error:', firstError)
    throw new Error(firstError.message || 'Error al guardar el nuevo orden de la ruta.')
  }
}

// ─── approveTask ──────────────────────────────────────────────────────────────
export async function approveTask(taskId: string, notes?: string): Promise<Task> {
  const { data: session } = await supabase.auth.getSession()
  const adminId = session?.session?.user?.id
  if (!adminId) throw new Error('No hay sesión activa para aprobar la tarea.')

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      approval_status: 'approved',
      approved_by: adminId,
      approved_at: now,
      notes: notes ? notes : undefined,
      updated_at: now,
      updated_by: adminId,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('[Tasks] approveTask error:', error)
    throw new Error(error.message || 'Error al aprobar la gestión.')
  }

  return data as unknown as Task
}

// ─── rejectTask ───────────────────────────────────────────────────────────────
export async function rejectTask(taskId: string, rejectionReason: string): Promise<Task> {
  const { data: session } = await supabase.auth.getSession()
  const adminId = session?.session?.user?.id
  if (!adminId) throw new Error('No hay sesión activa para rechazar la tarea.')

  if (!rejectionReason.trim()) {
    throw new Error('Debes indicar el motivo del rechazo.')
  }

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({
      approval_status: 'rejected',
      approved_by: adminId,
      approved_at: now,
      rejection_reason: rejectionReason.trim(),
      updated_at: now,
      updated_by: adminId,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (error) {
    console.error('[Tasks] rejectTask error:', error)
    throw new Error(error.message || 'Error al rechazar la gestión.')
  }

  return data as unknown as Task
}

// ─── uploadTaskEvidence ───────────────────────────────────────────────────────
export async function uploadTaskEvidence(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
  const filePath = `evidences/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('task-evidences')
    .upload(filePath, file, { cacheControl: '3600', upsert: true })

  if (uploadError) {
    console.warn('[Tasks] uploadTaskEvidence storage error:', uploadError)
    // Devolver DataURL o simulación si el bucket no existe en desarrollo local sin backend real
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }

  const { data: urlData } = supabase.storage.from('task-evidences').getPublicUrl(filePath)
  return urlData.publicUrl
}
