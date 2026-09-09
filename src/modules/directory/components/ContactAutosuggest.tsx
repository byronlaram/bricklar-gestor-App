import { useState, useRef, useEffect } from 'react'
import {
  Users,
  Store,
  Landmark,
  MapPin,
  Phone,
  Plus,
  Search,
  Check,
  Building2,
} from 'lucide-react'
import { useDirectoryContacts } from '../hooks/useDirectoryContacts'
import type { DirectoryContact, DirectoryCategory } from '../types/directory.types'
import { CATEGORY_COLORS, CATEGORY_SINGULAR_LABELS } from '../types/directory.types'

interface ContactAutosuggestProps {
  value: string
  onChange: (val: string) => void
  onSelectContact: (contact: DirectoryContact) => void
  onAddNewContactRequest?: (typedName: string) => void
  placeholder?: string
  categoryFilter?: DirectoryCategory
  className?: string
  disabled?: boolean
  error?: string
}

export function ContactAutosuggest({
  value,
  onChange,
  onSelectContact,
  onAddNewContactRequest,
  placeholder = 'Buscar o escribir nombre...',
  categoryFilter,
  className = '',
  disabled = false,
  error,
}: ContactAutosuggestProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: contacts = [] } = useDirectoryContacts({
    category: categoryFilter || 'all',
  })

  // Filter contacts by query
  const query = (value || '').toLowerCase().trim()
  const filtered = contacts.filter((c) => {
    if (!query) return true
    return (
      c.name.toLowerCase().includes(query) ||
      c.contact_person?.toLowerCase().includes(query) ||
      c.phone?.toLowerCase().includes(query) ||
      c.address?.toLowerCase().includes(query)
    )
  })

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (contact: DirectoryContact) => {
    onChange(contact.name)
    onSelectContact(contact)
    setIsOpen(false)
  }

  const getCategoryIcon = (category: DirectoryCategory) => {
    switch (category) {
      case 'customer':
        return <Users className="h-3.5 w-3.5 text-emerald-600" />
      case 'provider':
        return <Store className="h-3.5 w-3.5 text-rose-600" />
      case 'institution_other':
        return <Landmark className="h-3.5 w-3.5 text-blue-600" />
      default:
        return <Building2 className="h-3.5 w-3.5 text-slate-500" />
    }
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full text-xs bg-white border ${
            error ? 'border-rose-400 focus:ring-rose-500/20' : 'border-slate-200 focus:ring-[#004594]/20'
          } rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 font-medium transition disabled:bg-slate-100 disabled:cursor-not-allowed pr-8`}
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Search className="h-3.5 w-3.5" />
        </div>
      </div>

      {error && <p className="text-[11px] text-rose-600 mt-1 font-medium">{error}</p>}

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {filtered.length > 0 ? (
            <div className="p-1.5 space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Directorio ({filtered.length} sugerencia{filtered.length === 1 ? '' : 's'})
              </div>
              {filtered.map((contact) => {
                const colorConfig = CATEGORY_COLORS[contact.category]
                const isSelected = value.trim().toLowerCase() === contact.name.toLowerCase()
                return (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => handleSelect(contact)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-start justify-between gap-2 cursor-pointer ${
                      isSelected ? 'bg-[#004594]/10 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {getCategoryIcon(contact.category)}
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {contact.name}
                        </span>
                        <span
                          className={`text-3xs font-extrabold px-1.5 py-0.2 rounded-full border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}
                        >
                          {CATEGORY_SINGULAR_LABELS[contact.category]}
                        </span>
                      </div>

                      {contact.contact_person && (
                        <p className="text-[11px] text-slate-600 font-medium truncate">
                          Contacto: <strong>{contact.contact_person}</strong>
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-3xs text-slate-500 flex-wrap">
                        {contact.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-2.5 w-2.5 text-slate-400" /> {contact.phone}
                          </span>
                        )}
                        {contact.address && (
                          <span className="flex items-center gap-0.5 truncate max-w-[200px]">
                            <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" /> {contact.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-4 w-4 text-[#004594] shrink-0 mt-0.5" />
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-xs text-slate-500 font-medium">
                No se encontraron contactos que coincidan con "{value}"
              </p>
            </div>
          )}

          {onAddNewContactRequest && value.trim() && (
            <div className="p-1.5 bg-slate-50/80">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onAddNewContactRequest(value.trim())
                }}
                className="w-full p-2 rounded-xl text-xs font-bold text-[#004594] hover:bg-[#004594]/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                Registrar "{value.trim()}" en el Directorio
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
