import { useState, useMemo } from 'react'
import {
  MessageCircle,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  DollarSign,
  User,
  ArrowRight,
} from 'lucide-react'
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
import { formatDepartureWhatsAppMessage } from '@/shared/utils/navigationHelper'
import type { Task } from '../types/task.types'

export interface NotifyCustomerModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task
  courierName?: string | null
  onConfirmStatusOnly?: () => Promise<void> | void
}

export function NotifyCustomerModal({
  isOpen,
  onClose,
  task,
  courierName,
  onConfirmStatusOnly,
}: NotifyCustomerModalProps) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const trackingUrl = useMemo(() => {
    const origin = window.location.origin
    return `${origin}/rastreo/${task.code || task.id}`
  }, [task.code, task.id])

  const messageText = useMemo(() => {
    return formatDepartureWhatsAppMessage({
      contactName: task.contact_name,
      taskCode: task.code,
      address: task.address,
      requiresCollection: task.requires_collection,
      collectionAmount: task.expected_collection_amount,
      collectionCurrency: task.expected_collection_currency,
      courierName: courierName || 'tu motorizado',
      trackingUrl,
    })
  }, [
    task.contact_name,
    task.code,
    task.address,
    task.requires_collection,
    task.expected_collection_amount,
    task.expected_collection_currency,
    courierName,
    trackingUrl,
  ])

  const destinationNumber = useMemo(() => {
    const raw = task.whatsapp || task.phone || ''
    return raw.replace(/\D/g, '')
  }, [task.whatsapp, task.phone])

  const whatsappLink = useMemo(() => {
    if (!destinationNumber) return ''
    return `https://wa.me/${destinationNumber}?text=${encodeURIComponent(messageText)}`
  }, [destinationNumber, messageText])

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
      toast.success('Mensaje copiado', 'El texto se copió al portapapeles.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Error', 'No se pudo copiar el texto.')
    }
  }

  const handleOpenWhatsApp = async () => {
    if (!whatsappLink) {
      toast.error('Sin número', 'La tarea no tiene un número de teléfono o WhatsApp configurado.')
      return
    }

    if (onConfirmStatusOnly) {
      try {
        setIsProcessing(true)
        await onConfirmStatusOnly()
      } catch (err) {
        console.error(err)
      } finally {
        setIsProcessing(false)
      }
    }

    window.open(whatsappLink, '_blank', 'noopener,noreferrer')
    onClose()
  }

  const handleOnlyStart = async () => {
    if (onConfirmStatusOnly) {
      try {
        setIsProcessing(true)
        await onConfirmStatusOnly()
      } catch (err) {
        console.error(err)
      } finally {
        setIsProcessing(false)
      }
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="md">
        <ModalHeader onClose={onClose}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle>Notificar al Cliente por WhatsApp</ModalTitle>
              <ModalDescription>
                Avisar al destinatario con enlace de rastreo en vivo y datos de entrega
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Tarjeta de Destinatario */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Destinatario:
              </span>
              <span className="font-bold text-slate-900">{task.contact_name || task.title}</span>
            </div>

            {task.address && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  Dirección:
                </span>
                <span className="font-medium text-slate-700 text-right">{task.address}</span>
              </div>
            )}

            {task.requires_collection && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  Cobro en Efectivo:
                </span>
                <span className="font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {task.expected_collection_currency === 'USD' ? '$' : 'C$'}{' '}
                  {(task.expected_collection_amount || 0).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Vista Previa del Mensaje */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-2xs font-bold text-slate-500 uppercase tracking-wider px-1">
              <span>Vista previa del mensaje:</span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line shadow-2xs">
              {messageText}
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOnlyStart}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Solo Iniciar Ruta (Sin WhatsApp)
          </Button>

          {whatsappLink ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenWhatsApp}
              disabled={isProcessing}
              leftIcon={<MessageCircle className="h-4 w-4" />}
              rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto font-bold"
            >
              {isProcessing ? 'Iniciando...' : 'Enviar WhatsApp y Salir'}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOnlyStart}
              disabled={isProcessing}
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              className="w-full sm:w-auto"
            >
              Iniciar Ruta
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
