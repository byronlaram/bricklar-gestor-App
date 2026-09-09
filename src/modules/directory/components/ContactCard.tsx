import { useState } from 'react'
import {
  Users,
  Store,
  Landmark,
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  Navigation,
  Edit2,
  Trash2,
  User,
  DollarSign,
  FileText,
} from 'lucide-react'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { ConfirmDialog } from '@/shared/components/ui/ConfirmDialog'
import type { DirectoryContact } from '../types/directory.types'
import { CATEGORY_COLORS, CATEGORY_SINGULAR_LABELS } from '../types/directory.types'

interface ContactCardProps {
  contact: DirectoryContact
  onEdit: (contact: DirectoryContact) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function ContactCard({ contact, onEdit, onDelete, isDeleting = false }: ContactCardProps) {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const colorConfig = CATEGORY_COLORS[contact.category]

  const getCategoryIcon = () => {
    switch (contact.category) {
      case 'customer':
        return <Users className="h-4 w-4 text-emerald-600" />
      case 'provider':
        return <Store className="h-4 w-4 text-rose-600" />
      case 'institution_other':
        return <Landmark className="h-4 w-4 text-blue-600" />
      default:
        return <Building2 className="h-4 w-4 text-slate-600" />
    }
  }

  const rawPhone = contact.whatsapp || contact.phone || ''
  const cleanPhone = rawPhone.replace(/\D/g, '')
  const whatsappUrl = cleanPhone ? `https://wa.me/505${cleanPhone}` : null

  return (
    <>
      <Card className="p-4 bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl shadow-2xs transition-all space-y-3 flex flex-col justify-between">
        <div className="space-y-2.5">
          {/* Encabezado: Icono, Nombre y Categoría */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className={`p-2 rounded-xl border ${colorConfig.bg} ${colorConfig.border} shrink-0 mt-0.5`}>
                {getCategoryIcon()}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-slate-900 leading-snug truncate" title={contact.name}>
                  {contact.name}
                </h3>
                <span
                  className={`inline-block mt-0.5 text-3xs font-extrabold px-2 py-0.5 rounded-full border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}
                >
                  {CATEGORY_SINGULAR_LABELS[contact.category]}
                </span>
              </div>
            </div>

            {/* Acciones de Edición/Eliminación */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(contact)}
                className="h-7 w-7 text-slate-400 hover:text-[#004594] hover:bg-slate-100 rounded-lg"
                title="Editar contacto"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsConfirmDeleteOpen(true)}
                className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                title="Eliminar contacto"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Persona de contacto */}
          {contact.contact_person && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold truncate">{contact.contact_person}</span>
            </div>
          )}

          {/* Dirección y Referencia */}
          {contact.address && (
            <div className="text-xs text-slate-700 space-y-0.5">
              <div className="flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                <span className="font-medium leading-tight">{contact.address}</span>
              </div>
              {contact.address_reference && (
                <p className="text-3xs text-slate-500 italic pl-5 font-normal">
                  Ref: {contact.address_reference}
                </p>
              )}
            </div>
          )}

          {/* Comportamiento financiero por defecto si aplica */}
          {contact.default_financial_type !== 'none' && (
            <div className="flex items-center gap-1 text-3xs font-extrabold text-slate-600 pt-1">
              <DollarSign className="h-3 w-3 text-slate-400" />
              <span>Operación habitual: </span>
              {contact.default_financial_type === 'payment' ? (
                <span className="text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                  🔴 Pago ({contact.default_currency})
                </span>
              ) : (
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  🟢 Cobro ({contact.default_currency})
                </span>
              )}
            </div>
          )}

          {/* Notas */}
          {contact.notes && (
            <div className="text-3xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 flex items-start gap-1">
              <FileText className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
              <p className="line-clamp-2 italic">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Barra de Acciones Rápidas (Llamar, WhatsApp, Mapa) */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            {contact.phone ? (
              <a
                href={`tel:${contact.phone}`}
                className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-bold rounded-lg flex items-center gap-1 transition shadow-2xs"
                title="Llamar"
              >
                <Phone className="h-3 w-3 text-slate-500" />
                <span>{contact.phone}</span>
              </a>
            ) : null}

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-7 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-3xs font-bold rounded-lg flex items-center gap-1 transition shadow-2xs"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="h-3 w-3 text-emerald-600" />
                <span>Chat</span>
              </a>
            )}
          </div>

          {contact.maps_url ? (
            <a
              href={contact.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="h-7 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-3xs font-bold rounded-lg flex items-center gap-1 transition shadow-2xs"
              title="Abrir en Mapa"
            >
              <Navigation className="h-3 w-3 text-indigo-500" />
              <span>Mapa</span>
            </a>
          ) : null}
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => {
          onDelete(contact.id)
          setIsConfirmDeleteOpen(false)
        }}
        title="Eliminar Contacto del Directorio"
        description={`¿Estás seguro de que deseas eliminar a "${contact.name}" del directorio? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        variant="destructive"
        isLoading={isDeleting}
      />
    </>
  )
}
