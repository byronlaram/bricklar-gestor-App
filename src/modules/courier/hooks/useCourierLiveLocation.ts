import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import type { CourierLivePosition } from '@/modules/monitoring/types/monitoring.types'

const PING_INTERVAL_MS = 30_000 // 30 segundos
const CHANNEL_NAME = 'courier-tracking'

export function useCourierLiveLocation() {
  const { profile } = useAuth()
  const { data: workday } = useActiveWorkday(profile?.id)
  const [isTracking, setIsTracking] = useState(false)
  const [lastPosition, setLastPosition] = useState<CourierLivePosition | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestCoordsRef = useRef<GeolocationCoordinates | null>(null)

  const isCourier = profile?.role === 'courier'
  const isWorkdayOpen = workday?.status === 'open'
  const branchId = profile?.primary_branch_id || profile?.branch_ids?.[0] || ''

  // Enviar broadcast de ubicación
  const broadcastLocation = useCallback(
    async (coords: GeolocationCoordinates) => {
      if (!profile?.id || !channelRef.current) return

      let batteryLevel: number | null = null
      try {
        if ('getBattery' in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const battery = await (navigator as any).getBattery()
          batteryLevel = Math.round(battery.level * 100)
        }
      } catch {
        // Battery API no disponible o bloqueada
      }

      const positionData: CourierLivePosition = {
        courier_id: profile.id,
        courier_name: profile.full_name || profile.display_name || 'Motorizado',
        courier_phone: profile.phone || null,
        avatar_url: profile.avatar_url || null,
        branch_id: branchId,
        workday_id: workday?.id || null,
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: coords.heading ?? null,
        speed: coords.speed != null ? Math.round(coords.speed * 3.6) : null, // Convertir m/s a km/h
        accuracy: coords.accuracy != null ? Math.round(coords.accuracy) : null,
        battery_level: batteryLevel,
        timestamp: new Date().toISOString(),
      }

      setLastPosition(positionData)

      // Transmisión por Supabase Realtime Broadcast
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'location_update',
          payload: positionData,
        })
      } catch (err) {
        console.warn('[CourierTracking] Error broadcasting location:', err)
      }
    },
    [profile, branchId, workday]
  )

  useEffect(() => {
    // Solo rastrear si es motorizado con jornada activa
    if (!isCourier || !isWorkdayOpen || !profile?.id) {
      setIsTracking(false)
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    if (!navigator.geolocation) {
      setGpsError('El navegador no soporta geolocalización GPS.')
      return
    }

    // Inicializar canal de difusión de Supabase
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { broadcast: { self: false } },
    })
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setIsTracking(true)
      }
    })
    channelRef.current = channel

    // 1. Obtener primera posición inmediata
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        latestCoordsRef.current = pos.coords
        broadcastLocation(pos.coords)
        setGpsError(null)
      },
      (err) => {
        console.warn('[CourierTracking] Initial GPS warning:', err.message)
        setGpsError('Permiso de ubicación pendiente o GPS apagado.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )

    // 2. Escuchar cambios de movimiento continuo (watchPosition)
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        latestCoordsRef.current = pos.coords
        setGpsError(null)
      },
      (err) => {
        console.warn('[CourierTracking] GPS watch error:', err.message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
    watchIdRef.current = watchId

    // 3. Ping periódico cada 30s
    intervalRef.current = setInterval(() => {
      if (latestCoordsRef.current) {
        broadcastLocation(latestCoordsRef.current)
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            latestCoordsRef.current = pos.coords
            broadcastLocation(pos.coords)
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        )
      }
    }, PING_INTERVAL_MS)

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsTracking(false)
    }
  }, [isCourier, isWorkdayOpen, profile?.id, broadcastLocation])

  return {
    isTracking,
    lastPosition,
    gpsError,
  }
}
