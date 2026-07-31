import { useState, useEffect } from 'react'
import { X, Bus, Edit3, Loader2 } from 'lucide-react'
import type { BusRoute } from '../types/buses.types'
import { useBusMutations } from '../hooks/useBuses'

interface BusFormModalProps {
  routeToEdit?: BusRoute | null
  isOpen: boolean
  onClose: () => void
}

export function BusFormModal({ routeToEdit, isOpen, onClose }: BusFormModalProps) {
  const isEditing = !!routeToEdit

  const [cooperativeName, setCooperativeName] = useState('')
  const [originTerminal, setOriginTerminal] = useState('')
  const [destinationCity, setDestinationCity] = useState('')
  const [departureSchedules, setDepartureSchedules] = useState('')
  const [dispatchPhone, setDispatchPhone] = useState('')
  const [notes, setNotes] = useState('')

  const { createBusRoute, updateBusRoute, isCreating, isUpdating, createError, updateError } =
    useBusMutations()

  useEffect(() => {
    if (routeToEdit) {
      setCooperativeName(routeToEdit.cooperative_name)
      setOriginTerminal(routeToEdit.origin_terminal)
      setDestinationCity(routeToEdit.destination_city)
      setDepartureSchedules(routeToEdit.departure_schedules)
      setDispatchPhone(routeToEdit.dispatch_phone || '')
      setNotes(routeToEdit.notes || '')
    } else {
      setCooperativeName('')
      setOriginTerminal('')
      setDestinationCity('')
      setDepartureSchedules('')
      setDispatchPhone('')
      setNotes('')
    }
  }, [routeToEdit])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload = {
        cooperative_name: cooperativeName,
        origin_terminal: originTerminal,
        destination_city: destinationCity,
        departure_schedules: departureSchedules,
        dispatch_phone: dispatchPhone || undefined,
        notes: notes || undefined,
      }

      if (isEditing && routeToEdit) {
        await updateBusRoute({ id: routeToEdit.id, payload })
      } else {
        await createBusRoute(payload)
      }
      onClose()
    } catch (err) {
      console.error('Error saving bus route:', err)
    }
  }

  const isLoading = isCreating || isUpdating
  const errorMessage = (createError || updateError) as Error | null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-foreground-muted hover:text-foreground transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20">
            {isEditing ? <Edit3 className="h-5 w-5" /> : <Bus className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {isEditing ? `Editar Ruta — ${routeToEdit.destination_city}` : 'Nueva Ruta de Bus'}
            </h2>
            <p className="text-xs text-foreground-muted">
              Información de contacto y horarios para encomiendas.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Cooperativa / Empresa <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Cotran Caribe"
                value={cooperativeName}
                onChange={(e) => setCooperativeName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Terminal de Origen <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Mayoreo, Managua"
                value={originTerminal}
                onChange={(e) => setOriginTerminal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Ciudad / Destino <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Puerto Cabezas"
                value={destinationCity}
                onChange={(e) => setDestinationCity(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Teléfono de Despacho
              </label>
              <input
                type="text"
                placeholder="Ej: 8888-1234"
                value={dispatchPhone}
                onChange={(e) => setDispatchPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Horarios de Salida <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: 5:00am, 8:00am, 12:00pm, 4:00pm"
              value={departureSchedules}
              onChange={(e) => setDepartureSchedules(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Notas Adicionales
            </label>
            <textarea
              rows={2}
              placeholder="Ej: Cobran C$30 por kilo. Dejar encomienda en ventanilla 3."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>

          {errorMessage && (
            <p className="text-xs text-destructive font-medium">{errorMessage.message}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-foreground-muted hover:text-foreground border border-border rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-accent hover:bg-accent/90 disabled:opacity-50 rounded-lg shadow-sm transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Agregar Ruta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
