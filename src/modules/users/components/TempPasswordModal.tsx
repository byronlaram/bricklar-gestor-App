import { useState } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Button,
  useToast,
} from '@/shared/components/ui'
import { KeyRound, Sparkles, Copy, Check, ShieldAlert, Eye, EyeOff } from 'lucide-react'
import { useUserMutations } from '../hooks/useUsers'

interface TempPasswordModalProps {
  userId: string
  userName: string
  isOpen: boolean
  onClose: () => void
}

function generateSecureRandomPassword(length = 10): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowers = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%^&*'
  const all = uppers + lowers + numbers + symbols

  let password = ''
  // Garantizar al menos un carácter de cada tipo
  password += uppers[Math.floor(Math.random() * uppers.length)]
  password += lowers[Math.floor(Math.random() * lowers.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = 4; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Mezclar caracteres
  return password
    .split('')
    .sort(() => 0.5 - Math.random())
    .join('')
}

export function TempPasswordModal({
  userId,
  userName,
  isOpen,
  onClose,
}: TempPasswordModalProps) {
  const toast = useToast()
  const { generateTempPassword, isGeneratingTempPassword } = useUserMutations()

  const [mode, setMode] = useState<'auto' | 'manual'>('auto')
  const [passwordInput, setPasswordInput] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleOpenAuto = () => {
    setMode('auto')
    setPasswordInput(generateSecureRandomPassword(10))
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    const passwordToSet = mode === 'auto' ? passwordInput || generateSecureRandomPassword(10) : passwordInput.trim()

    if (!passwordToSet || passwordToSet.length < 6) {
      toast.error('Error de validación', 'La contraseña temporal debe tener al menos 6 caracteres.')
      return
    }

    try {
      await generateTempPassword({ userId, password: passwordToSet })
      setCreatedPassword(passwordToSet)
      toast.success(
        'Contraseña temporal creada',
        'El usuario deberá cambiar su contraseña en el próximo inicio de sesión.'
      )
    } catch (err: unknown) {
      const msg = (err as Error)?.message || 'Error al generar la contraseña temporal.'
      toast.error('Error al cambiar contraseña', msg)
    }
  }

  const handleCopy = () => {
    if (!createdPassword) return
    navigator.clipboard.writeText(createdPassword)
    setCopied(true)
    toast.info('Copiada al portapapeles', 'La contraseña ha sido copiada.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setCreatedPassword(null)
    setPasswordInput('')
    setCopied(false)
    setShowPassword(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <ModalContent size="md">
        <ModalHeader onClose={handleClose}>
          <ModalTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent" />
            Generar Contraseña Temporal
          </ModalTitle>
          <ModalDescription>
            Usuario: <strong className="text-slate-900">{userName}</strong>
          </ModalDescription>
        </ModalHeader>

        {createdPassword ? (
          /* RESULTADO MOSTRADO UNA SOLA VEZ */
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
                <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                Atención — Visualización Única
              </div>
              <p className="text-xs text-amber-700 leading-relaxed">
                Comunica esta contraseña al usuario. Por motivos de seguridad, <strong>no volverá a mostrarse</strong> después de cerrar esta ventana.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-2xs font-semibold uppercase text-slate-500">
                Contraseña Temporal Creada
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-3 bg-slate-900 text-emerald-400 font-mono text-lg rounded-xl tracking-wider select-all border border-slate-800 shadow-inner flex items-center justify-between">
                  <span>{createdPassword}</span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleCopy}
                  leftIcon={copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                >
                  {copied ? 'Copiada' : 'Copiar'}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-100 text-2xs text-slate-600 leading-relaxed border border-slate-200">
              ✓ Se ha activado la bandera <strong>Cambio Obligatorio de Contraseña</strong>. El usuario será redirigido a la pantalla de cambio de clave inmediatamente en su próximo inicio de sesión.
            </div>

            <ModalFooter>
              <Button variant="primary" size="sm" className="w-full justify-center" onClick={handleClose}>
                Entendido y Cerrar
              </Button>
            </ModalFooter>
          </div>
        ) : (
          /* FORMULARIO DE GENERACIÓN */
          <form onSubmit={handleGenerate}>
            <ModalBody className="space-y-5">
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1">
                <button
                  type="button"
                  onClick={handleOpenAuto}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'auto'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  Generar Automática
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('manual')
                    setPasswordInput('')
                  }}
                  className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'manual'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5 text-slate-600" />
                  Escribir Manualmente
                </button>
              </div>

              {mode === 'auto' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Contraseña segura propuesta
                    </label>
                    <button
                      type="button"
                      onClick={() => setPasswordInput(generateSecureRandomPassword(10))}
                      className="text-2xs text-accent hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" /> Regenerar otra
                    </button>
                  </div>
                  <div className="px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-base text-slate-900 tracking-wider text-center font-bold">
                    {passwordInput || generateSecureRandomPassword(10)}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Contraseña temporal personalizada
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Mínimo 6 caracteres..."
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 text-slate-900 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-2xs text-slate-500 leading-relaxed">
                Al confirmar, esta clave reemplazará la contraseña actual del usuario y se le exigirá cambiarla al iniciar sesión.
              </p>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" size="sm" type="button" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isGeneratingTempPassword}
                leftIcon={<KeyRound className="h-3.5 w-3.5" />}
              >
                Establecer Contraseña Temporal
              </Button>
            </ModalFooter>
          </form>
        )}
      </ModalContent>
    </Modal>
  )
}
