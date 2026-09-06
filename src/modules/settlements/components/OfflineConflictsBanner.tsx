import React, { useState } from 'react'
import { WifiOff, ArrowRight } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Badge } from '@/shared/components/ui/Badge'
import { useOfflineConflicts } from '../hooks/useOfflineConflicts'
import { OfflineConflictsModal } from './OfflineConflictsModal'

export const OfflineConflictsBanner: React.FC = () => {
  const { conflictCount } = useOfflineConflicts()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (conflictCount === 0) return null

  return (
    <>
      <div className="bg-rose-50/95 border border-rose-200 rounded-3xl p-4 shadow-2xs space-y-2 animate-fade-in mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 rounded-2xl text-rose-700 shrink-0">
              <WifiOff className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-rose-950 text-sm">
                  {conflictCount} Conflicto(s) de Sincronización Offline Pendiente(s)
                </span>
                <Badge variant="urgent" size="sm">
                  Atención Requerida
                </Badge>
              </div>
              <p className="text-xs text-rose-800">
                Un motorizado intentó enviar datos con posterioridad al cierre de su jornada o liquidación. Revisa los datos rescatados.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            className="bg-rose-600 hover:bg-rose-700 text-white shrink-0"
            onClick={() => setIsModalOpen(true)}
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            Revisar Conflictos ({conflictCount})
          </Button>
        </div>
      </div>

      <OfflineConflictsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
