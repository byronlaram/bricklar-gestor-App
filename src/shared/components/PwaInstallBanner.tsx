import { useState, useEffect } from 'react'
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // 1. Detectar si la app ya está instalada o abierta en modo PWA / Standalone
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error iOS Safari standalone check
        Boolean(window.navigator.standalone) ||
        document.referrer.includes('android-app://')

      setIsStandalone(isStandaloneMode)
    }

    checkStandalone()

    // 2. Detectar si es iOS (iPhone / iPad)
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as unknown as { MSStream: unknown }).MSStream
    setIsIOS(isIosDevice)

    // 3. Verificar si el usuario ya descartó el banner en esta sesión
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true'
    if (dismissed) {
      setIsDismissed(true)
    }

    // 4. Capturar el evento nativo de instalación en Android / Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 5. Escuchar cuando la app sea instalada con éxito
    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsStandalone(true)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    sessionStorage.setItem('pwa_banner_dismissed', 'true')
  }

  // No mostrar si ya está instalada / standalone o si fue descartada
  if (isStandalone || isDismissed) {
    return null
  }

  // Mostrar si hay un prompt nativo disponible (Android / Chrome / Edge)
  if (deferredPrompt) {
    return (
      <div
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in"
        role="alert"
        aria-live="polite"
      >
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex items-start gap-3.5 backdrop-blur-md">
          <div className="h-10 w-10 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center shadow-sm">
            <img
              src="/branding/bricklar-icon.svg"
              alt="Bricklar"
              className="h-8 w-8 object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-accent" />
                Instalar Bricklar App
              </h3>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 rounded-lg cursor-pointer"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Instala la aplicación en tu celular para acceder en 1 toque y trabajar con mayor rapidez.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleInstallClick}
                className="w-full justify-center text-xs font-bold shadow-md h-8.5"
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Instalar en mi Celular
              </Button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium cursor-pointer"
              >
                Ahora no
              </button>
            </div>

            <p className="text-[10px] text-slate-400 mt-2 bg-slate-800/80 p-2 rounded-lg border border-slate-700/60 leading-tight">
              🛡️ <strong className="text-slate-300 font-semibold">Nota Android:</strong> Si salta el aviso de Play Protect, toca <strong className="text-white">"Más detalles ∨"</strong> y luego <strong className="text-white">"Instalar de todas formas"</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar para dispositivos iOS en Safari (cuando no está instalada)
  if (isIOS) {
    return (
      <div
        className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-fade-in"
        role="alert"
        aria-live="polite"
      >
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex items-start gap-3.5 backdrop-blur-md">
          <div className="h-10 w-10 rounded-xl bg-white p-1 shrink-0 flex items-center justify-center shadow-sm">
            <img
              src="/branding/bricklar-icon.svg"
              alt="Bricklar"
              className="h-8 w-8 object-contain"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-accent" />
                Instalar en tu iPhone
              </h3>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white transition-colors p-1 -mr-1 rounded-lg cursor-pointer"
                aria-label="Cerrar aviso"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Toca el botón <strong className="text-white inline-flex items-center gap-0.5 mx-1 font-semibold"><Share className="h-3.5 w-3.5 text-accent inline" /> Compartir</strong> abajo en Safari y luego selecciona <strong className="text-white inline-flex items-center gap-0.5 mx-1 font-semibold"><PlusSquare className="h-3.5 w-3.5 text-accent inline" /> "Agregar a inicio"</strong>.
            </p>

            <div className="mt-2.5">
              <button
                onClick={handleDismiss}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
