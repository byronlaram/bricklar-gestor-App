import { useState } from 'react'
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Flame,
  XCircle,
  KeyRound,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { useToast } from '@/shared/components/ui/useToast'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'

interface ResetDatabaseModalProps {
  isOpen: boolean
  onClose: () => void
}

const REQUIRED_CONFIRMATION_PHRASE = 'REINICIAR SISTEMA'

export function ResetDatabaseModal({ isOpen, onClose }: ResetDatabaseModalProps) {
  const { user, profile } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [phrase, setPhrase] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isPhraseValid = phrase.trim() === REQUIRED_CONFIRMATION_PHRASE
  const canSubmit = isPhraseValid && password.length > 0 && !isLoading

  const handleClose = () => {
    if (isLoading) return
    setPhrase('')
    setPassword('')
    setErrorMessage(null)
    onClose()
  }

  const handleReset = async () => {
    if (!canSubmit || !user?.email) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      // 1. Re-autenticar con la contraseña actual para verificar identidad
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      })

      if (authError) {
        const msg = 'La contraseña ingresada es incorrecta. Verifique sus credenciales de Administrador.'
        setErrorMessage(msg)
        toast.error('Error de autenticación', msg)
        setIsLoading(false)
        return
      }

      // 2. Ejecutar la función RPC en PostgreSQL
      const { data, error: rpcError } = await supabase.rpc('reset_database_for_new_client')

      if (rpcError) {
        console.error('[ResetDatabase] Error en RPC:', rpcError)
        const isNotCreated = rpcError.message?.includes('function') && rpcError.message?.includes('does not exist')
        const msg = isNotCreated
          ? 'La función de restablecimiento no está creada en Supabase. Ejecute el script SQL en el SQL Editor.'
          : `Error al restablecer: ${rpcError.message}`
        setErrorMessage(msg)
        toast.error('Error al restablecer base de datos', msg)
        setIsLoading(false)
        return
      }

      console.log('[ResetDatabase] Éxito:', data)

      // 3. Limpiar la memoria caché de TanStack Query
      queryClient.clear()

      toast.success(
        'Base de datos restablecida',
        'Todos los datos de prueba han sido eliminados. El sistema está limpio para entrega.'
      )

      handleClose()

      // 4. Recargar la interfaz después de 1.5s para reflejar el estado limpio
      setTimeout(() => {
        window.location.href = '/admin'
      }, 1200)
    } catch (err: unknown) {
      console.error('[ResetDatabase] Error inesperado:', err)
      const msg = (err as Error).message || 'Ocurrió un error inesperado al restablecer la base de datos.'
      setErrorMessage(msg)
      toast.error('Error inesperado', msg)
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent size="lg">
        <ModalHeader showCloseButton={!isLoading} onClose={handleClose}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
              <Flame className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <ModalTitle className="text-rose-600 dark:text-rose-400">
                Zona de Peligro — Restablecer Base de Datos
              </ModalTitle>
              <p className="text-xs text-foreground-muted">
                Preparar la aplicación para entrega a un nuevo cliente
              </p>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4 text-xs">
          {/* Advertencia Principal */}
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-xl space-y-2 text-foreground">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>¡ADVERTENCIA: Esta acción es completamente irreversible!</span>
            </div>
            <p className="text-foreground-muted leading-relaxed">
              Esta operación limpiará la base de datos dejando únicamente su cuenta de Administrador General
              y los catálogos base del producto.
            </p>
          </div>

          {/* Desglose de eliminación vs conservación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-rose-700 dark:text-rose-300 text-[11px] uppercase tracking-wider">
                <XCircle className="h-3.5 w-3.5 text-rose-500" />
                Se eliminarán:
              </div>
              <ul className="space-y-1 text-foreground-muted pl-4 list-disc text-[11px]">
                <li>Todas las tareas y su historial</li>
                <li>Jornadas, liquidaciones y caja</li>
                <li>Sucursales y asignaciones de prueba</li>
                <li>Usuarios y motorizados de prueba</li>
                <li>Logs de auditoría y notificaciones</li>
                <li>Secuencias (iniciará en #0001)</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300 text-[11px] uppercase tracking-wider">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Se conservarán:
              </div>
              <ul className="space-y-1 text-foreground-muted pl-4 list-disc text-[11px]">
                <li>
                  <span className="font-semibold text-foreground">Su cuenta Administrador:</span>{' '}
                  <span className="text-accent">{profile?.email || user?.email}</span>
                </li>
                <li>Catálogo de 20 municipios/destinos</li>
                <li>Directorio completo de 121 rutas de buses</li>
                <li>Estructura técnica y roles del sistema</li>
                <li>Configuración de fábrica de odómetro</li>
              </ul>
            </div>
          </div>

          {/* Formulario de Confirmación Doble */}
          <div className="pt-2 space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                1. Para confirmar, escriba exactamente:{' '}
                <span className="font-mono font-bold text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded">
                  {REQUIRED_CONFIRMATION_PHRASE}
                </span>
              </label>
              <Input
                type="text"
                placeholder={REQUIRED_CONFIRMATION_PHRASE}
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                disabled={isLoading}
                autoComplete="off"
                leftIcon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                2. Ingrese su contraseña actual de Administrador para validar su identidad:
              </label>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                leftIcon={<KeyRound className="h-4 w-4 text-accent" />}
              />
            </div>
          </div>

          {/* Mensaje de error si falla */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-700 dark:text-rose-300 flex items-start gap-2 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button
            variant="outline"
            size="md"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="md"
            onClick={handleReset}
            disabled={!canSubmit}
            isLoading={isLoading}
            leftIcon={<Lock className="h-3.5 w-3.5" />}
          >
            Confirmar y Restablecer Base de Datos
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
