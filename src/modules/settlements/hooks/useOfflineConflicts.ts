import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { logAuditEvent } from '@/shared/services/auditService'

export interface OfflineConflictItem {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  entity_code: string | null
  branch_id: string | null
  actor_user_id: string | null
  changes: {
    error?: string
    action_type?: string
    payload?: any
    reason?: string
    failed_at?: string
    resolved_at?: string
    resolved_by?: string
    resolution_notes?: string
  } | null
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

export function useOfflineConflicts() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['offline_sync_conflicts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          entity_code,
          branch_id,
          actor_user_id,
          changes,
          created_at,
          actor_profile:profiles!audit_logs_actor_user_id_fkey(full_name, display_name, email),
          branch:branches!audit_logs_branch_id_fkey(name, code)
        `)
        .eq('action', 'offline_sync_conflict')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[OfflineConflicts] Error fetching conflicts:', error.message)
        return []
      }

      // Filtrar aquellos que aún no hayan sido resueltos en su metadata
      const items = (data || []) as unknown as OfflineConflictItem[]
      return items.filter((item) => !item.changes?.resolved_at)
    },
    refetchInterval: 30000,
  })

  const resolveMutation = useMutation({
    mutationFn: async ({
      conflictId,
      settlementId,
      adjustmentAmount,
      reason,
    }: {
      conflictId: string
      settlementId?: string
      adjustmentAmount?: number
      reason: string
    }) => {
      const { data: session } = await supabase.auth.getSession()
      const adminId = session?.session?.user?.id
      if (!adminId) throw new Error('No hay sesión activa.')

      // 1. Si se especificó settlementId y adjustmentAmount, registrar el ajuste formal
      if (settlementId && typeof adjustmentAmount === 'number' && adjustmentAmount !== 0) {
        const { error: adjErr } = await supabase.from('settlement_adjustments').insert({
          settlement_id: settlementId,
          adjusted_by: adminId,
          adjustment_amount: adjustmentAmount,
          reason: `[Reconciliación Offline] ${reason}`,
        })
        if (adjErr) throw new Error(`Error registrando ajuste: ${adjErr.message}`)
      }

      // 2. Marcar el log de auditoría como resuelto
      const { data: currentLog } = await supabase
        .from('audit_logs')
        .select('changes')
        .eq('id', conflictId)
        .single()

      const currentChanges = (currentLog?.changes as Record<string, unknown>) || {}

      const { error: updateErr } = await supabase
        .from('audit_logs')
        .update({
          changes: {
            ...currentChanges,
            resolved_at: new Date().toISOString(),
            resolved_by: adminId,
            resolution_notes: reason,
          },
        })
        .eq('id', conflictId)

      if (updateErr) throw new Error(`Error actualizando log: ${updateErr.message}`)

      // 3. Registrar auditoría de la resolución
      logAuditEvent({
        action: 'APPROVE',
        entityType: 'settlements',
        entityId: settlementId || conflictId,
        actorUserId: adminId,
        changes: {
          action: 'resolve_offline_conflict',
          conflict_id: conflictId,
          adjustment_amount: adjustmentAmount,
          reason,
        },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offline_sync_conflicts'] })
      queryClient.invalidateQueries({ queryKey: ['settlements'] })
      queryClient.invalidateQueries({ queryKey: ['workdays'] })
    },
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    unresolvedConflicts: query.data || [],
    conflictCount: query.data?.length || 0,
    resolveConflict: resolveMutation.mutateAsync,
    isResolving: resolveMutation.isPending,
  }
}
