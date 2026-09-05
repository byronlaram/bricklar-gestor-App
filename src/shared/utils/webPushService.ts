/**
 * ─── Web Push & Native Device Notification Service ────────────────────────────
 * Provides native push alerts with sound chime, tactile vibration, and deep linking
 * for couriers and administrators on mobile PWA and desktop browsers.
 */

export interface NativeNotificationOptions {
  title: string
  body: string
  tag?: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
  url?: string
  playSound?: boolean
  vibrate?: boolean
}

const NOTIFICATION_ICON = '/branding/pwa-192x192.png'
const NOTIFICATION_BADGE = '/branding/pwa-192x192.png'

/**
 * Synthesizes a crisp, pleasant notification sound chime using Web Audio API.
 * Works completely offline with zero external audio assets.
 */
export function playNotificationChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    // Tone 1: High crisp bell (880Hz -> A5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.12)
    gain1.gain.setValueAtTime(0.18, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.35)

    // Tone 2: Harmonious resonance (1760Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(1760, now + 0.08)
    gain2.gain.setValueAtTime(0.12, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.45)
  } catch (err) {
    console.warn('[PushService] Audio chime suppressed or blocked by user gesture:', err)
  }
}

/**
 * Checks current permission status for native notifications
 */
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Prompts user to enable native push notifications
 */
export async function requestPushNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      localStorage.setItem('bricklar_notifications_enabled', 'true')
      // Play confirmation chime
      playNotificationChime()
      return true
    }
    return false
  } catch (err) {
    console.warn('[PushService] Error requesting notification permission:', err)
    return false
  }
}

/**
 * Dispatches a native push notification to the device (mobile OS / desktop)
 */
export async function sendNativeNotification(options: NativeNotificationOptions): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false
  }

  if (Notification.permission !== 'granted') {
    return false
  }

  const {
    title,
    body,
    tag = `bricklar_${Date.now()}`,
    icon = NOTIFICATION_ICON,
    badge = NOTIFICATION_BADGE,
    data = {},
    url,
    playSound = true,
    vibrate = true,
  } = options

  if (playSound) {
    playNotificationChime()
  }

  if (vibrate && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([180, 80, 180])
    } catch {
      // Ignore vibration error on unsupported hardware
    }
  }

  const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
    body,
    tag,
    icon,
    badge,
    data: { ...data, url: url || '/' },
    vibrate: vibrate ? [180, 80, 180] : undefined,
    requireInteraction: false,
  }

  try {
    // Prefer ServiceWorkerRegistration.showNotification for robust mobile handling
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration && registration.active) {
        await registration.showNotification(title, notificationOptions as NotificationOptions)
        return true
      }
    }

    // Fallback to standard Window Notification API
    const notification = new Notification(title, notificationOptions)
    if (url) {
      notification.onclick = () => {
        window.focus()
        window.location.href = url
        notification.close()
      }
    }
    return true
  } catch (err) {
    console.warn('[PushService] Failed to dispatch native notification:', err)
    return false
  }
}
