import { useCourierLiveLocationContext } from '../context/CourierLiveLocationContext'

/**
 * Hook de geolocalización en vivo del motorizado.
 * Consume el `CourierLiveLocationContext` centralizado para evitar múltiples procesos
 * concurrentes de GPS, fugas de memoria o reconexiones continuas de Realtime.
 */
export function useCourierLiveLocation() {
  return useCourierLiveLocationContext()
}
