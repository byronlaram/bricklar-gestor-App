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
  RescheduleTaskPayload,
  TaskAssignment,
  TaskStatusHistory,
  PaginatedTasks,
} from '../types/task.types'
import type { TaskStatus } from '@/shared/types'
import { ALLOWED_TRANSITIONS, COURIER_ALLOWED_TRANSITIONS } from '@/shared/types'
import { compressImage } from '@/shared/utils/imageCompressor'
import { createNotification } from '@/modules/notifications/services/notificationsService'

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

  const rawTasks = (data ?? []) as any[]

  // Post-procesamiento de máxima resiliencia: si assigned_courier_id existe pero courier no vino en el join
  const missingCourierIds = rawTasks
    .filter((t) => t.assigned_courier_id && !t.courier)
    .map((t) => t.assigned_courier_id as string)

  if (missingCourierIds.length > 0) {
    const uniqueIds = Array.from(new Set(missingCourierIds))
    const { data: fetchedProfiles } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, phone, avatar_url')
      .in('id', uniqueIds)

    if (fetchedProfiles && fetchedProfiles.length > 0) {
      const profMap = new Map(fetchedProfiles.map((p) => [p.id, p]))
      rawTasks.forEach((t) => {
        if (t.assigned_courier_id && !t.courier) {
          t.courier = profMap.get(t.assigned_courier_id) || null
        }
      })
    }
  }

  // Post-procesamiento: normalizar tareas rechazadas para que su estado siempre sea 'cancelled'
  const legacyRejectedIds: string[] = []
  rawTasks.forEach((t) => {
    if (t.approval_status === 'rejected' && t.status !== 'cancelled') {
      t.status = 'cancelled'
      legacyRejectedIds.push(t.id)
    }
  })

  // Autocorrección asíncrona no bloqueante en base de datos para tareas legadas
  if (legacyRejectedIds.length > 0) {
    Promise.resolve(
      supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .in('id', legacyRejectedIds)
    ).catch((err: unknown) => console.warn('[Tasks] Non-blocking status auto-fix failed:', err))
  }

  const total = count ?? 0
  return {
    data: rawTasks as unknown as TaskWithCourier[],
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

  const task = data as any
  if (task && task.assigned_courier_id && !task.courier) {
    const { data: p } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, phone, avatar_url')
      .eq('id', task.assigned_courier_id)
      .maybeSingle()
    if (p) {
      task.courier = p
    }
  }

  if (task && task.approval_status === 'rejected' && task.status !== 'cancelled') {
    task.status = 'cancelled'
    Promise.resolve(
      supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', task.id)
    ).catch(() => {})
  }

  return task as unknown as TaskWithCourier
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
    .insert(insert as any)
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
      .insert(baseInsert as any)
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

    // Notificar al motorizado si la tarea fue asignada por administración
    if (payload.creation_origin !== 'courier_created') {
      await createNotification({
        userId: courierId,
        title: 'Nueva Tarea Asignada',
        body: `Se ha añadido a tu ruta la tarea [${data.code}]: ${data.title}`,
        type: 'task',
        taskId: data.id,
        branchId: data.branch_id,
        createdBy: userId,
      })
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
    .update({ ...payload, updated_by: userId, updated_at: new Date().toISOString() } as any)
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
      .update({ ...cleanPayload, updated_by: userId, updated_at: new Date().toISOString() } as any)
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

  // 6. Notificar al motorizado asignado
  if (courier_id && data?.id && courier_id !== userId) {
    await createNotification({
      userId: courier_id,
      title: 'Nueva Tarea Asignada',
      body: `Se te ha asignado la tarea [${data.code}]: ${data.title}`,
      type: 'task',
      taskId: data.id,
      branchId: data.branch_id,
      createdBy: userId,
    })
  }

  return data as unknown as Task
}

// ─── changeTaskStatus ─────────────────────────────────────────────────────────

export async function changeTaskStatus(payload: ChangeStatusPayload): Promise<Task> {
  const { task_id, new_status, notes, cancellation_reason, payment_breakdown, metadata, evidence_url } = payload
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa.')

  // Obtener estado actual y metadata existente
  const { data: taskData, error: taskError } = await supabase
    .from('tasks')
    .select('status, metadata, evidence_url')
    .eq('id', task_id)
    .single()

  if (taskError) throw new Error(taskError.message)
  const currentStatus = (taskData as { status: TaskStatus }).status
  const existingMetadata = (taskData as { metadata?: Record<string, unknown> })?.metadata || {}

  // Obtener rol del usuario actual
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const isAdmin = ['general_admin', 'junior_admin'].includes(profileData?.role || '')

  // Validar transición solo para motorizados (no administradores)
  if (!isAdmin) {
    const allowed = COURIER_ALLOWED_TRANSITIONS[currentStatus] ?? ALLOWED_TRANSITIONS[currentStatus] ?? []
    if (!allowed.includes(new_status)) {
      throw new Error(
        `Transición inválida: ${currentStatus} → ${new_status}`
      )
    }
  }

  // Preparar actualización con metadata combinada
  const mergedMetadata: Record<string, unknown> = {
    ...existingMetadata,
    ...(metadata || {}),
    ...(payment_breakdown ? { payment_breakdown } : {}),
  }

  if (evidence_url) {
    mergedMetadata.delivery_proof_url = evidence_url
    mergedMetadata.delivery_proof_captured_at = new Date().toISOString()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Database['public']['Tables']['tasks']['Update'] = {
    status: new_status,
    updated_by: userId,
    updated_at: new Date().toISOString(),
    metadata: mergedMetadata as any,
  }

  if (evidence_url !== undefined) {
    updatePayload.evidence_url = evidence_url
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

export async function getCouriersForBranch(branch_id?: string) {
  try {
    // 1. Obtener sucursales para mapear nombres
    const { data: allBranches } = await supabase.from('branches').select('id, name, code')
    const branchNameMap = new Map<string, string>()
    allBranches?.forEach((b) => branchNameMap.set(b.id, b.name))

    // 2. Obtener todos los perfiles de motorizados activos
    const { data: allCouriers, error: couriersError } = await supabase
      .from('profiles')
      .select('id, full_name, display_name, phone, avatar_url, role, is_active, primary_branch_id')
      .eq('role', 'courier')
      .eq('is_active', true)

    if (couriersError) {
      console.warn('[Tasks] Error fetching couriers profiles:', couriersError)
    }

    // 3. Obtener relaciones de user_branches
    const { data: userBranches } = await supabase
      .from('user_branches')
      .select('user_id, branch_id')

    const userBranchesMap = new Map<string, Set<string>>()
    userBranches?.forEach((ub: { user_id: string; branch_id: string }) => {
      if (!userBranchesMap.has(ub.user_id)) {
        userBranchesMap.set(ub.user_id, new Set())
      }
      userBranchesMap.get(ub.user_id)!.add(ub.branch_id)
    })

    const couriersList = (allCouriers ?? []).map((p: any) => {
      const userBranchesSet = userBranchesMap.get(p.id)
      const primaryBranch = p.primary_branch_id
      const bName = primaryBranch
        ? branchNameMap.get(primaryBranch)
        : userBranchesSet && userBranchesSet.size > 0
        ? branchNameMap.get(Array.from(userBranchesSet)[0])
        : undefined

      const branchIds = userBranchesSet
        ? Array.from(userBranchesSet)
        : primaryBranch
        ? [primaryBranch]
        : []

      return {
        id: p.id,
        full_name: p.full_name,
        display_name: p.display_name ?? null,
        phone: p.phone ?? null,
        avatar_url: p.avatar_url ?? null,
        role: p.role,
        is_active: p.is_active,
        branch_name: bName,
        branch_ids: branchIds,
      }
    })

    // 4. Si se especificó una sucursal, filtrar por ella (con fallback a todos si ninguno coincide)
    if (branch_id && branch_id !== 'all') {
      const filtered = couriersList.filter(
        (c) => c.branch_ids.includes(branch_id) || c.branch_ids.length === 0
      )
      if (filtered.length > 0) return filtered
    }

    return couriersList
  } catch (err) {
    console.error('[Tasks] Error in getCouriersForBranch:', err)
    return []
  }
}

// ─── Reordenar Tareas de Ruta en Lote ───────────────────────────────────────────
export async function updateTaskRouteOrders(items: { id: string; route_order: number }[]): Promise<void> {
  if (!items || items.length === 0) return

  // 1. Intentar ejecución atómica mediante RPC
  try {
    const { error: rpcError } = await supabase.rpc('update_task_route_orders' as any, {
      p_items: items,
    })

    if (!rpcError) {
      return
    }
    console.warn('[Tasks] RPC update_task_route_orders not available, falling back to batch update:', rpcError.message)
  } catch (rpcEx) {
    console.warn('[Tasks] RPC invocation exception, using fallback:', rpcEx)
  }

  // 2. Fallback por si la función SQL aún no está desplegada en el entorno
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

  // Notificar al creador / motorizado asignado
  const targetCourierId = (data as any)?.assigned_courier_id || (data as any)?.created_by
  if (targetCourierId && targetCourierId !== adminId) {
    await createNotification({
      userId: targetCourierId,
      title: 'Gestión Aprobada',
      body: `Tu gestión [${(data as any)?.code}] ha sido aprobada por administración.`,
      type: 'success',
      taskId: (data as any)?.id,
      branchId: (data as any)?.branch_id,
      createdBy: adminId,
    })
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

  // Obtener estado actual antes de cancelar
  const { data: currentTask } = await supabase
    .from('tasks')
    .select('status, assigned_courier_id, created_by, branch_id, code')
    .eq('id', taskId)
    .single()

  const currentStatus = (currentTask?.status as TaskStatus) || 'pending'
  const now = new Date().toISOString()
  const cleanReason = rejectionReason.trim()

  const { data, error } = await supabase
    .from('tasks')
    .update({
      approval_status: 'rejected',
      status: 'cancelled',
      approved_by: adminId,
      approved_at: now,
      cancelled_at: now,
      cancellation_reason: `Rechazada por administración: ${cleanReason}`,
      rejection_reason: cleanReason,
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

  // Registrar en el historial de estados
  try {
    await supabase.from('task_status_history').insert({
      task_id: taskId,
      from_status: currentStatus,
      to_status: 'cancelled',
      changed_by: adminId,
      notes: `Gestión rechazada: ${cleanReason}`,
    })
  } catch (histErr) {
    console.warn('[Tasks] Could not record status history for rejection:', histErr)
  }

  // Notificar al motorizado sobre el motivo de rechazo
  const targetCourierId = currentTask?.assigned_courier_id || currentTask?.created_by
  if (targetCourierId && targetCourierId !== adminId) {
    await createNotification({
      userId: targetCourierId,
      title: 'Gestión Rechazada',
      body: `Tu gestión [${currentTask?.code || (data as any)?.code}] fue rechazada: ${cleanReason}`,
      type: 'warning',
      taskId: (data as any)?.id || taskId,
      branchId: currentTask?.branch_id || (data as any)?.branch_id,
      createdBy: adminId,
    })
  }

  return data as unknown as Task
}

// ─── File Upload Validation Constants & Helpers ──────────────────────────────
const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB
const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
]
const ALLOWED_REFERENCE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]

function validateFile(file: File, allowedTypes: string[], maxSizeBytes = MAX_UPLOAD_SIZE_BYTES) {
  if (!file) {
    throw new Error('No se ha proporcionado ningún archivo para subir.')
  }

  // 1. Validar tamaño máximo
  if (file.size > maxSizeBytes) {
    const maxMB = Math.round(maxSizeBytes / (1024 * 1024))
    throw new Error(`El archivo seleccionado (${(file.size / (1024 * 1024)).toFixed(1)} MB) supera el límite máximo de ${maxMB} MB.`)
  }

  // 2. Validar tipo MIME
  const fileMime = (file.type || '').toLowerCase()
  const rawExt = (file.name.split('.').pop() || '').toLowerCase()
  const isMimeAllowed = allowedTypes.some((type) => fileMime === type || fileMime.startsWith(type))
  const isExtAllowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'heic', 'heif'].includes(rawExt)

  if (!isMimeAllowed && !isExtAllowed) {
    throw new Error(`Tipo de archivo no permitido (${file.type || rawExt}). Solo se admiten fotos (JPG, PNG, WEBP) o documentos PDF.`)
  }
}

// ─── uploadTaskEvidence ───────────────────────────────────────────────────────
export async function uploadTaskEvidence(file: File): Promise<string> {
  validateFile(file, ALLOWED_EVIDENCE_MIME_TYPES)

  const optimizedFile = await compressImage(file, 1280, 1280, 0.82)
  const rawExt = (optimizedFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf']
  const fileExt = validExtensions.includes(rawExt) ? rawExt : 'jpg'
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
  const filePath = `evidences/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('task-evidences')
    .upload(filePath, optimizedFile, { cacheControl: '3600', upsert: true })

  if (uploadError) {
    console.warn('[Tasks] uploadTaskEvidence storage upload warning (using fallback):', uploadError.message || uploadError)
    // Devolver DataURL de respaldo en caso de desconexión o entorno local sin bucket
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(optimizedFile)
    })
  }

  const { data: urlData } = supabase.storage.from('task-evidences').getPublicUrl(filePath)
  return urlData.publicUrl
}

// ─── uploadTaskReferenceImage ────────────────────────────────────────────────
export async function uploadTaskReferenceImage(file: File): Promise<string> {
  validateFile(file, ALLOWED_REFERENCE_MIME_TYPES)

  const optimizedFile = await compressImage(file, 1400, 1400, 0.85)
  const rawExt = (optimizedFile.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp']
  const fileExt = validExtensions.includes(rawExt) ? rawExt : 'jpg'
  const fileName = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
  const filePath = `references/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('task-evidences')
    .upload(filePath, optimizedFile, { cacheControl: '86400', upsert: true })

  if (uploadError) {
    console.warn('[Tasks] uploadTaskReferenceImage storage warning (using fallback):', uploadError.message || uploadError)
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(optimizedFile)
    })
  }

  const { data: urlData } = supabase.storage.from('task-evidences').getPublicUrl(filePath)
  return urlData.publicUrl
}

// ─── rescheduleTask ───────────────────────────────────────────────────────────
// Clona la tarea hacia una nueva fecha con motorizado asignado, preservando
// la tarea original en el histórico con estado 'rescheduled'.

export async function rescheduleTask(
  payload: RescheduleTaskPayload
): Promise<{ original: Task; newTask: Task }> {
  const { original_task_id, new_date, assigned_courier_id, reason } = payload
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  if (!userId) throw new Error('No hay sesión activa para reprogramar la tarea.')

  // 1. Obtener la tarea original completa
  const original = await getTaskById(original_task_id)
  if (!original) throw new Error('No se encontró la tarea original a reprogramar.')

  // 2. Determinar motorizado para la nueva tarea
  const courierToAssign =
    assigned_courier_id !== undefined ? assigned_courier_id : original.assigned_courier_id

  // 3. Crear la nueva tarea para la nueva fecha con los datos completos
  const newTaskPayload: CreateTaskPayload = {
    branch_id: original.branch_id,
    task_type: original.task_type,
    title: original.title,
    description: original.description || '',
    scheduled_date: new_date,
    scheduled_start_time: original.scheduled_start_time,
    scheduled_deadline: original.scheduled_deadline,
    priority: original.priority,
    approval_status: 'approved',
    creation_origin: 'admin',
    evidence_url: original.evidence_url,
    contact_name: original.contact_name,
    company_name: original.company_name,
    phone: original.phone,
    whatsapp: original.whatsapp,
    address: original.address,
    address_reference: original.address_reference,
    maps_url: original.maps_url,
    latitude: original.latitude,
    longitude: original.longitude,
    provider_name: original.provider_name,
    institution_name: original.institution_name,
    destination_contact: original.destination_contact,
    management_description: original.management_description,
    requires_collection: original.requires_collection,
    expected_collection_amount: original.expected_collection_amount,
    expected_collection_currency: original.expected_collection_currency,
    expected_payment_method: original.expected_payment_method,
    requires_payment: original.requires_payment,
    expected_payment_amount: original.expected_payment_amount,
    expected_payment_currency: original.expected_payment_currency,
    notes: reason ? `[Reprogramada desde ${original.code}]: ${reason}` : original.notes,
    assigned_courier_id: courierToAssign,
    metadata: {
      ...(original.metadata || {}),
      rescheduled_from_task_id: original.id,
      rescheduled_from_code: original.code,
      reschedule_reason: reason,
    },
  }

  const newTask = await createTask(newTaskPayload)

  // 4. Actualizar la tarea original a estado 'rescheduled'
  const originalNotes = original.notes ? `${original.notes}\n` : ''
  const updatedOriginalNotes = `${originalNotes}[Reprogramada hacia ${newTask.code} para ${new_date}]: ${reason}`

  const { data: updatedOriginal, error: updateOriginalError } = await supabase
    .from('tasks')
    .update({
      status: 'rescheduled',
      notes: updatedOriginalNotes,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', original.id)
    .select()
    .single()

  if (updateOriginalError) {
    console.error('[Tasks] Error actualizando estado de tarea original:', updateOriginalError)
  }

  // 5. Registrar entrada en historial de la tarea original
  await supabase.from('task_status_history').insert({
    task_id: original.id,
    from_status: original.status,
    to_status: 'rescheduled',
    changed_by: userId,
    notes: `Reprogramada hacia nueva tarea ${newTask.code} para la fecha ${new_date}. Motivo: ${reason}`,
  })

  // 6. Registrar entrada en historial de la nueva tarea
  await supabase.from('task_status_history').insert({
    task_id: newTask.id,
    from_status: 'pending',
    to_status: newTask.status,
    changed_by: userId,
    notes: `Creada por reprogramación desde la tarea ${original.code} (${original.scheduled_date}). Motivo: ${reason}`,
  })

  return {
    original: (updatedOriginal || original) as unknown as Task,
    newTask,
  }
}

