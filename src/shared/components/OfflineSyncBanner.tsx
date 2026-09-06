import { useState, useEffect, useCallback } from 'react'
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react'
import { subscribeToOfflineQueue, processOfflineQueue, getPendingOfflineActions, type OfflineAction } from '@/shared/lib/offlineQueue'
import { useToast } from '@/shared/components/ui'

export function OfflineSyncBanner() {
  const toast = useToast()
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pendingCount, setPendingCount] = useState<number>(0)
  const [failedActions, setFailedActions] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState<boolean>(false)

  const checkQueueDetails = useCallback(async () => {
    const actions = await getPendingOfflineActions()
    setPendingCount(actions.length)
    const failed = actions.filter((a) => a.status === 'failed' || a.status === 'permanently_failed')
    setFailedActions(failed)
  }, [])

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true)
      setIsSyncing(true)
      const res = await processOfflineQueue()
      setIsSyncing(false)
      await checkQueueDetails()
      if (res.synced > 0) {
        toast.success(
          'Sincronización Completada',
          `Se enviaron exitosamente ${res.synced} gestión(es) guardadas sin conexión.`
        )
      }
      if (res.failed > 0) {
        toast.error(
          'Alerta de Sincronización',
          `${res.failed} registro(s) no pudieron procesarse (posible conflicto con jornada cerrada).`
        )
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    checkQueueDetails()
    const unsubscribe = subscribeToOfflineQueue(() => {
      checkQueueDetails()
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [toast, checkQueueDetails])

  const handleManualSync = async () => {
    if (!isOnline) {
      toast.warning('Sin conexión', 'Aún no tienes conexión a internet.')
      return
    }
    setIsSyncing(true)
    const res = await processOfflineQueue()
    setIsSyncing(false)
    await checkQueueDetails()
    if (res.synced > 0) {
      toast.success(
        'Sincronización Exitosa',
        `Se procesaron ${res.synced} de ${res.total} registros pendientes.`
      )
    } else if (res.failed > 0) {
      toast.error(
        'Error de Sincronización',
        `${res.failed} operación(es) fallaron. Consulta con administración para revisión manual.`
      )
    } else if (res.total === 0) {
      toast.info('Todo al día', 'No hay operaciones pendientes de sincronización.')
    }
  }

  // Si está online y no hay nada en la cola, no renderizar nada
  if (isOnline && pendingCount === 0) {
    return null
  }

  const hasFailed = failedActions.length > 0
  const hasPermanent = failedActions.some((a) => a.status === 'permanently_failed')

  return (
    <div
      className={`fixed bottom-16 sm:bottom-4 left-4 right-4 sm:left-auto sm:right-4 z-50 max-w-md p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 animate-fade-in transition-all ${
        !isOnline
          ? 'bg-slate-900 text-white border-slate-800'
          : hasPermanent || hasFailed
          ? 'bg-rose-900/95 text-white border-rose-700 shadow-rose-950/50'
          : 'bg-amber-600 text-white border-amber-700'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {!isOnline ? (
          <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
            <WifiOff className="h-4 w-4" />
          </div>
        ) : hasPermanent || hasFailed ? (
          <div className="p-1.5 bg-rose-500 text-white rounded-xl shrink-0 animate-pulse">
            <AlertTriangle className="h-4 w-4" />
          </div>
        ) : (
          <div className="p-1.5 bg-white/20 text-white rounded-xl shrink-0">
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </div>
        )}

        <div className="min-w-0">
          <p className="text-xs font-bold leading-tight truncate">
            {!isOnline
              ? 'Modo Sin Conexión'
              : hasPermanent
              ? '⚠️ Conflicto de Sincronización'
              : hasFailed
              ? 'Error al Sincronizar'
              : 'Sincronizando Cambios'}
          </p>
          <p className="text-[11px] opacity-90 leading-tight">
            {!isOnline
              ? pendingCount > 0
                ? `${pendingCount} operación(es) guardadas localmente.`
                : 'Tus fotos y gestiones se guardarán en tu teléfono.'
              : hasPermanent
              ? 'Jornada cerrada por admin. Contacta a supervisión.'
              : hasFailed
              ? `${failedActions.length} acción(es) requieren revisión manual.`
              : `${pendingCount} acción(es) pendientes en cola.`}
          </p>
        </div>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className={`shrink-0 px-3 py-1.5 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
            hasFailed
              ? 'bg-white text-rose-900 hover:bg-rose-50'
              : 'bg-white text-amber-900 hover:bg-amber-50'
          }`}
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Enviando...' : 'Reintentar'}</span>
        </button>
      )}
    </div>
  )
}
