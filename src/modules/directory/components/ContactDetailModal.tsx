import {
  X,
  Users,
  Store,
  Landmark,
  Building2,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Navigation,
  User,
  DollarSign,
  FileText,
  Edit2,
  Calendar,
  Link2,
  Info,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import type { DirectoryContact } from '../types/directory.types'
import { CATEGORY_COLORS, CATEGORY_SINGULAR_LABELS } from '../types/directory.types'

interface ContactDetailModalProps {
  contact: DirectoryContact | null
  isOpen: boolean
  onClose: () => void
  onEdit: (contact: DirectoryContact) => void
}

export function ContactDetailModal({ contact, isOpen, onClose, onEdit }: ContactDetailModalProps) {
  if (!isOpen || !contact) return null

  const colorConfig = CATEGORY_COLORS[contact.category]

  const getCategoryIcon = () => {
    switch (contact.category) {
      case 'customer':
        return <Users className="h-5 w-5 text-emerald-600" />
      case 'provider':
        return <Store className="h-5 w-5 text-rose-600" />
      case 'institution_other':
        return <Landmark className="h-5 w-5 text-blue-600" />
      default:
        return <Building2 className="h-5 w-5 text-slate-600" />
    }
  }

  const rawPhone = contact.whatsapp || contact.phone || ''
  const cleanPhone = rawPhone.replace(/\D/g, '')
  const whatsappUrl = cleanPhone ? `https://wa.me/505${cleanPhone}` : null

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('es-NI', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return iso
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${contact.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header con color de categoría */}
        <div className={`relative p-5 ${colorConfig.bg} border-b ${colorConfig.border}`}>
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-2xl bg-white/80 border ${colorConfig.border} shadow-sm shrink-0`}>
              {getCategoryIcon()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black text-slate-900 leading-tight break-words">
                {contact.name}
              </h2>
              <span
                className={`inline-block mt-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}
              >
                {CATEGORY_SINGULAR_LABELS[contact.category]}
              </span>
            </div>
          </div>

          {/* Botón cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-xl text-slate-500 hover:bg-white/60 hover:text-slate-800 transition cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Persona de Contacto */}
          {contact.contact_person && (
            <Section icon={<User className="h-4 w-4 text-slate-400" />} label="Persona de Contacto">
              <p className="text-sm font-semibold text-slate-800">{contact.contact_person}</p>
            </Section>
          )}

          {/* Teléfono y WhatsApp */}
          {(contact.phone || contact.whatsapp) && (
            <Section icon={<Phone className="h-4 w-4 text-slate-400" />} label="Comunicación">
              <div className="flex flex-wrap gap-2">
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-slate-500" />
                    {contact.phone}
                  </a>
                )}
                {contact.whatsapp && contact.whatsapp !== contact.phone && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 text-xs font-bold rounded-xl">
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-500" />
                    WA: {contact.whatsapp}
                  </span>
                )}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition border border-emerald-200"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                    Abrir Chat
                  </a>
                )}
              </div>
            </Section>
          )}

          {/* Email */}
          {contact.email && (
            <Section icon={<Mail className="h-4 w-4 text-slate-400" />} label="Correo Electrónico">
              <a
                href={`mailto:${contact.email}`}
                className="text-sm font-semibold text-[#004594] hover:underline break-all"
              >
                {contact.email}
              </a>
            </Section>
          )}

          {/* Dirección */}
          {(contact.address || contact.address_reference) && (
            <Section icon={<MapPin className="h-4 w-4 text-indigo-500" />} label="Ubicación">
              {contact.address && (
                <p className="text-sm font-semibold text-slate-800">{contact.address}</p>
              )}
              {contact.address_reference && (
                <p className="text-xs text-slate-500 italic mt-0.5">
                  Ref: {contact.address_reference}
                </p>
              )}
              {contact.maps_url && (
                <a
                  href={contact.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 transition"
                >
                  <Navigation className="h-3.5 w-3.5 text-indigo-500" />
                  Ver en Mapa
                </a>
              )}
            </Section>
          )}

          {/* URL de Mapa (solo si no hay dirección) */}
          {contact.maps_url && !contact.address && (
            <Section icon={<Link2 className="h-4 w-4 text-slate-400" />} label="Enlace de Mapa">
              <a
                href={contact.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 transition"
              >
                <Navigation className="h-3.5 w-3.5 text-indigo-500" />
                Ver en Mapa
              </a>
            </Section>
          )}

          {/* Operación Financiera Habitual */}
          {contact.default_financial_type !== 'none' && (
            <Section icon={<DollarSign className="h-4 w-4 text-slate-400" />} label="Operación Habitual">
              {contact.default_financial_type === 'payment' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-800 text-xs font-extrabold rounded-xl border border-rose-200">
                  🔴 Pago — {contact.default_currency}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-extrabold rounded-xl border border-emerald-200">
                  🟢 Cobro — {contact.default_currency}
                </span>
              )}
            </Section>
          )}

          {/* Notas */}
          {contact.notes && (
            <Section icon={<FileText className="h-4 w-4 text-slate-400" />} label="Notas">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {contact.notes}
              </p>
            </Section>
          )}

          {/* Fechas */}
          <Section icon={<Calendar className="h-4 w-4 text-slate-400" />} label="Registro">
            <div className="space-y-0.5 text-xs text-slate-500">
              <p>
                <span className="font-semibold text-slate-700">Creado:</span>{' '}
                {formatDate(contact.created_at)}
              </p>
              {contact.updated_at !== contact.created_at && (
                <p>
                  <span className="font-semibold text-slate-700">Última actualización:</span>{' '}
                  {formatDate(contact.updated_at)}
                </p>
              )}
            </div>
          </Section>

          {/* Inactivo */}
          {!contact.is_active && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
              <Info className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              Este contacto está marcado como <strong>inactivo</strong>.
            </div>
          )}
        </div>

        {/* Footer de acciones */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Edit2 className="h-3.5 w-3.5" />}
            onClick={() => {
              onClose()
              onEdit(contact)
            }}
            className="text-xs font-bold"
          >
            Editar Contacto
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Helper interno ──────────────────────────────────────────────────────────
function Section({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-3xs font-extrabold text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  )
}
