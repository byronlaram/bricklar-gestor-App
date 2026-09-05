import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { useActiveWorkday } from '@/modules/workdays/hooks/useWorkday'
import type { CourierLivePosition } from '@/modules/monitoring/types/monitoring.types'

interface CourierLiveLocationContextValue {
  isTracking: boolean
  lastPosition: CourierLivePosition | null
  gpsError: string | null
  refreshLocation: () => Promise<void>
}

const CourierLiveLocationContext = createContext<CourierLiveLocationContextValue | null>(null)

const PING_INTERVAL_MS = 30_000 // 30 segundos
const CHANNEL_NAME = 'courier-tracking'

export function CourierLiveLocationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const { data: workday } = useActiveWorkday(profile?.id)

  const [isTracking, setIsTracking] = useState(false)
  const [lastPosition, setLastPosition] = useState<CourierLivePosition | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const latestCoordsRef = useRef<GeolocationCoordinates | null>(null)

  // Referencias mutables estables para evitar re-suscripciones innecesarias
  const profileRef = useRef(profile)
  const workdayRef = useRef(workday)

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    workdayRef.current = workday
  }, [workday])

  const isCourier = profile?.role === 'courier'
  const isWorkdayOpen = workday?.status === 'open'
  const userId = profile?.id

  // Transmitir posición actual por Supabase Realtime
  const broadcastLocation = useCallback(async (coords: GeolocationCoordinates) => {
    const curProfile = profileRef.current
    const curWorkday = workdayRef.current
    const branchId = curProfile?.primary_branch_id || curProfile?.branch_ids?.[0] || ''

    if (!curProfile?.id || !channelRef.current) return

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
      courier_id: curProfile.id,
      courier_name: curProfile.full_name || curProfile.display_name || 'Motorizado',
      courier_phone: curProfile.phone || null,
      avatar_url: curProfile.avatar_url || null,
      branch_id: branchId,
      workday_id: curWorkday?.id || null,
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: coords.heading ?? null,
      speed: coords.speed != null ? Math.round(coords.speed * 3.6) : null, // Convertir m/s a km/h
      accuracy: coords.accuracy != null ? Math.round(coords.accuracy) : null,
      battery_level: batteryLevel,
      timestamp: new Date().toISOString(),
    }

    setLastPosition(positionData)

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'location_update',
        payload: positionData,
      })
    } catch (err) {
      console.warn('[CourierTracking] Error broadcasting location:', err)
    }
  }, [])

  // Forzar actualización inmediata
  const refreshLocation = useCallback(async () => {
    if (!navigator.geolocation) return

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          latestCoordsRef.current = pos.coords
          broadcastLocation(pos.coords)
          setGpsError(null)
          resolve()
        },
        (err) => {
          console.warn('[CourierTracking] Refresh GPS error:', err.message)
          resolve()
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    })
  }, [broadcastLocation])

  useEffect(() => {
    // Solo activar rastreo continuo si es motorizado con jornada activa
    if (!isCourier || !isWorkdayOpen || !userId) {
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

    // Inicializar canal único de difusión de Supabase
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
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }
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
  }, [isCourier, isWorkdayOpen, userId, broadcastLocation])

  const contextValue = React.useMemo(
    () => ({
      isTracking,
      lastPosition,
      gpsError,
      refreshLocation,
    }),
    [isTracking, lastPosition, gpsError, refreshLocation]
  )

  return (
    <CourierLiveLocationContext.Provider value={contextValue}>
      {children}
    </CourierLiveLocationContext.Provider>
  )
}

export function useCourierLiveLocationContext() {
  const context = useContext(CourierLiveLocationContext)
  if (!context) {
    // Retorno seguro con valores por defecto si se usa fuera del Provider
    return {
      isTracking: false,
      lastPosition: null,
      gpsError: null,
      refreshLocation: async () => {},
    }
  }
  return context
}
