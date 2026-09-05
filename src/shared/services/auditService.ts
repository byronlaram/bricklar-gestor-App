/**
 * Audit Service
 * Centralized audit logging service for tracking critical operational changes.
 */

import { supabase } from '@/shared/lib/supabaseClient'
import { broadcastSyncEvent } from '@/shared/lib/realtimeSync'

export interface AuditLogPayload {
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'CLOSE' | 'LOGIN' | 'OVERRIDE'
  entityType: 'tasks' | 'settlements' | 'daily_closures' | 'workdays' | 'exchange_rates' | 'profiles' | 'branches' | 'funds'
  entityId?: string | null
  entityCode?: string | null
  branchId?: string | null
  actorUserId?: string | null
  actorEmail?: string | null
  actorRole?: string | null
  changes?: Record<string, unknown> | { before?: unknown; after?: unknown; reason?: string } | null
}

export interface AuditLogEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_code: string | null
  branch_id: string | null
  actor_user_id: string | null
  actor_email: string | null
  actor_role: string | null
  changes: Record<string, unknown> | null
  created_at: string
  actor_profile?: {
    full_name: string
    display_name: string | null
    email: string | null
  } | null
  branch?: {
    name: string
    code: string
  } | null
}

export interface AuditFilters {
  from?: string
  to?: string
  search?: string
  entityType?: string
  action?: string
  branchId?: string
  actorId?: string
  limit?: number
}

/**
 * Records an immutable audit log entry in the database.
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<void> {
  try {
    // If actor user is not provided, try to obtain from current auth session
    let userId = payload.actorUserId
    let userEmail = payload.actorEmail

    if (!userId || !userEmail) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        userId = userId || session.user.id
        userEmail = userEmail || session.user.email || null
      }
    }

    const { error } = await supabase.from('audit_logs').insert({
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId || null,
      entity_code: payload.entityCode || null,
      branch_id: payload.branchId || null,
      actor_user_id: userId || null,
      actor_email: userEmail || null,
      actor_role: payload.actorRole || null,
      changes: payload.changes ? JSON.parse(JSON.stringify(payload.changes)) : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })

    if (error) {
      console.warn('[AuditService] logAuditEvent non-fatal error:', error.message)
    } else {
      broadcastSyncEvent('audit_logs', 'create', { entityId: payload.entityId || undefined })
    }
  } catch (err) {
    console.warn('[AuditService] Failed to record audit log:', err)
  }
}

/**
 * Fetches audit logs with filtering and profile joins.
 */
export async function getAuditLogs(filters: AuditFilters = {}): Promise<AuditLogEntry[]> {
  const { from, to, search, entityType, action, branchId, limit = 200 } = filters

  let query = supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      entity_type,
      entity_id,
      entity_code,
      branch_id,
      actor_user_id,
      actor_email,
      actor_role,
      changes,
      created_at,
      actor_profile:profiles!audit_logs_actor_user_id_fkey(full_name, display_name, email),
      branch:branches!audit_logs_branch_id_fkey(name, code)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (from) query = query.gte('created_at', `${from}T00:00:00`)
  if (to) query = query.lte('created_at', `${to}T23:59:59`)
  if (entityType && entityType !== 'all') query = query.eq('entity_type', entityType)
  if (action && action !== 'all') query = query.eq('action', action)
  if (branchId && branchId !== 'all') query = query.eq('branch_id', branchId)

  if (search && search.trim()) {
    const q = search.trim()
    query = query.or(`action.ilike.%${q}%,entity_code.ilike.%${q}%,actor_email.ilike.%${q}%,entity_type.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    console.warn('[AuditService] getAuditLogs error:', error.message)
    return []
  }

  return (data || []) as unknown as AuditLogEntry[]
}
