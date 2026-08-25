import { X, Bus, MapPin, Clock, Phone, Building2, FileText, Edit3 } from 'lucide-react'
import type { BusRoute } from '../types/buses.types'
import { Button, Badge } from '@/shared/components/ui'

interface BusDetailModalProps {
  route: BusRoute | null
  isOpen: boolean
  onClose: () => void
  onEdit?: (route: BusRoute) => void
}

export function BusDetailModal({ route, isOpen, onClose, onEdit }: BusDetailModalProps) {
  if (!isOpen || !route) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Bus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">Información del Transporte</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Consulta de ruta y despacho de encomiendas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tarjeta Destino Principal */}
        <div className="p-4 bg-gradient-to-r from-sky-50 to-indigo-50/40 dark:from-sky-950/40 dark:to-indigo-950/20 border border-sky-100 dark:border-sky-900/60 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider">
              Ciudad de Destino
            </span>
            <Badge variant={route.is_active ? 'completed' : 'neutral'} size="sm">
              {route.is_active ? 'Ruta Activa' : 'Ruta Inactiva'}
            </Badge>
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-sky-600 shrink-0" />
            {route.destination_city}
          </p>
        </div>

        {/* Datos en Grilla Limpia */}
        <div className="space-y-3">
          {/* Cooperativa / Empresa */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Bus className="h-3.5 w-3.5 text-slate-400" />
              Cooperativa o Empresa de Bus
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 pl-5">
              {route.cooperative_name || 'No especificada'}
            </p>
          </div>

          {/* Terminal u Origen */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" />
              Terminal u Origen de Salida
            </span>
            <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 pl-5">
              {route.origin_terminal || 'No especificada'}
            </p>
          </div>

          {/* Horarios de Salida */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              Horarios de Salida
            </span>
            <p className="text-xs sm:text-sm font-bold text-sky-900 dark:text-sky-300 pl-5">
              {route.departure_schedules || 'Horario no registrado'}
            </p>
          </div>

          {/* Teléfono de Despacho */}
          {route.dispatch_phone && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  Teléfono de Despacho
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 pl-5">
                  {route.dispatch_phone}
                </p>
              </div>

              <a
                href={`tel:${route.dispatch_phone.replace(/[\s-]/g, '')}`}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5" />
                Llamar
              </a>
            </div>
          )}

          {/* Notas / Observaciones */}
          {route.notes && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                Notas y Observaciones
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-300 pl-5 whitespace-pre-line leading-relaxed">
                {route.notes}
              </p>
            </div>
          )}
        </div>

        {/* Acciones al Pie */}
        <div className="flex items-center justify-between gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-500 font-semibold"
          >
            Cerrar
          </Button>

          {onEdit && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Edit3 className="h-3.5 w-3.5" />}
              onClick={() => {
                onClose()
                onEdit(route)
              }}
              className="bg-accent hover:bg-accent/90 text-white font-bold"
            >
              Editar Información
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
