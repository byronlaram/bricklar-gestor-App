import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import {
  Building2,
  Phone,
  MessageCircle,
  MapPin,
  Navigation,
  FileText,
  DollarSign,
  User,
  Users,
  Store,
  Landmark,
} from 'lucide-react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import type {
  DirectoryContact,
  DirectoryCategory,
  CreateContactPayload,
  FinancialType,
} from '../types/directory.types'
import { useCreateContact, useUpdateContact } from '../hooks/useDirectoryContacts'

interface ContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  contactToEdit?: DirectoryContact | null
  initialCategory?: DirectoryCategory
  initialName?: string
  initialData?: Partial<CreateContactPayload>
}

interface FormValues {
  name: string
  category: DirectoryCategory
  contact_person: string
  phone: string
  whatsapp: string
  email: string
  address: string
  address_reference: string
  maps_url: string
  default_financial_type: FinancialType
  default_currency: 'NIO' | 'USD'
  notes: string
}

export function ContactFormModal({
  isOpen,
  onClose,
  contactToEdit,
  initialCategory = 'customer',
  initialName = '',
  initialData,
}: ContactFormModalProps) {
  const isEditing = !!contactToEdit
  const createMutation = useCreateContact()
  const updateMutation = useUpdateContact()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
      category: initialCategory,
      contact_person: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      address_reference: '',
      maps_url: '',
      default_financial_type: 'none',
      default_currency: 'NIO',
      notes: '',
    },
  })

  const selectedCategory = watch('category')

  useEffect(() => {
    if (isOpen) {
      if (contactToEdit) {
        reset({
          name: contactToEdit.name,
          category: contactToEdit.category,
          contact_person: contactToEdit.contact_person || '',
          phone: contactToEdit.phone || '',
          whatsapp: contactToEdit.whatsapp || '',
          email: contactToEdit.email || '',
          address: contactToEdit.address || '',
          address_reference: contactToEdit.address_reference || '',
          maps_url: contactToEdit.maps_url || '',
          default_financial_type: contactToEdit.default_financial_type,
          default_currency: contactToEdit.default_currency,
          notes: contactToEdit.notes || '',
        })
      } else {
        reset({
          name: initialName || initialData?.name || '',
          category: initialCategory || initialData?.category || 'customer',
          contact_person: initialData?.contact_person || '',
          phone: initialData?.phone || '',
          whatsapp: initialData?.whatsapp || initialData?.phone || '',
          email: initialData?.email || '',
          address: initialData?.address || '',
          address_reference: initialData?.address_reference || '',
          maps_url: initialData?.maps_url || '',
          default_financial_type:
            initialData?.default_financial_type ||
            (initialCategory === 'provider' ? 'payment' : initialCategory === 'customer' ? 'collection' : 'none'),
          default_currency: initialData?.default_currency || 'NIO',
          notes: initialData?.notes || '',
        })
      }
    }
  }, [isOpen, contactToEdit, initialCategory, initialName, initialData, reset])

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditing && contactToEdit) {
        await updateMutation.mutateAsync({
          id: contactToEdit.id,
          name: data.name,
          category: data.category,
          contact_person: data.contact_person || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          address: data.address || null,
          address_reference: data.address_reference || null,
          maps_url: data.maps_url || null,
          default_financial_type: data.default_financial_type,
          default_currency: data.default_currency,
          notes: data.notes || null,
        })
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          category: data.category,
          contact_person: data.contact_person || null,
          phone: data.phone || null,
          whatsapp: data.whatsapp || null,
          email: data.email || null,
          address: data.address || null,
          address_reference: data.address_reference || null,
          maps_url: data.maps_url || null,
          default_financial_type: data.default_financial_type,
          default_currency: data.default_currency,
          notes: data.notes || null,
        })
      }
      onClose()
    } catch {
      // Error handled by mutation
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent size="lg" className="p-0 overflow-hidden">
        <ModalHeader onClose={onClose} className="px-6 pt-6 pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#004594]/10 text-[#004594]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle className="text-lg font-bold text-slate-900">
                {isEditing ? 'Editar Registro del Directorio' : 'Nuevo Contacto / Entidad'}
              </ModalTitle>
              <ModalDescription className="text-xs text-slate-500">
                Registra clientes, proveedores o instituciones para autocompletar tareas rápidamente.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-4 max-h-[75vh] overflow-y-auto">
          {/* Selector de Categoría Principal */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Tipo de Entidad <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setValue('category', 'customer')
                  if (!isEditing) setValue('default_financial_type', 'collection')
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedCategory === 'customer'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users className="h-5 w-5 mb-1 text-emerald-600" />
                <span className="text-xs">Cliente</span>
                <span className="text-[10px] text-slate-400 font-normal">Entregas / Cobros</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue('category', 'provider')
                  if (!isEditing) setValue('default_financial_type', 'payment')
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedCategory === 'provider'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-500/20 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Store className="h-5 w-5 mb-1 text-rose-600" />
                <span className="text-xs">Proveedor</span>
                <span className="text-[10px] text-slate-400 font-normal">Compras / Pagos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setValue('category', 'institution_other')
                  if (!isEditing) setValue('default_financial_type', 'none')
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition cursor-pointer ${
                  selectedCategory === 'institution_other'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Landmark className="h-5 w-5 mb-1 text-blue-600" />
                <span className="text-xs">Instituciones & Otros</span>
                <span className="text-[10px] text-slate-400 font-normal">Bancos / Colegios / Trámites</span>
              </button>
            </div>
          </div>

          {/* Nombre comercial / Razón social */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nombre Comercial / Entidad <span className="text-rose-500">*</span>
            </label>
            <Input
              {...register('name', { required: 'El nombre es obligatorio' })}
              placeholder="Ej: SERVANIC, Pedro Sellos, Cristhian Fisher, Colegio San Agustín, ATM Banpro"
              error={errors.name?.message}
            />
          </div>

          {/* Persona de contacto y Teléfono */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Persona de Contacto / Encargado
              </label>
              <Input
                {...register('contact_person')}
                placeholder="Ej: Lic. Martha, Don Pedro"
                leftIcon={<User className="h-4 w-4 text-slate-400" />}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Teléfono / Celular
              </label>
              <Input
                {...register('phone')}
                placeholder="Ej: 8888-9999"
                leftIcon={<Phone className="h-4 w-4 text-slate-400" />}
              />
            </div>
          </div>

          {/* WhatsApp y Correo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                WhatsApp Directo
              </label>
              <Input
                {...register('whatsapp')}
                placeholder="Ej: 8888-9999"
                leftIcon={<MessageCircle className="h-4 w-4 text-emerald-500" />}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Correo Electrónico (Opcional)
              </label>
              <Input
                type="email"
                {...register('email')}
                placeholder="contacto@empresa.com"
              />
            </div>
          </div>

          {/* Ubicación y Dirección */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#004594]" /> Ubicación Frecuente
            </h4>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Dirección Física
              </label>
              <Input
                {...register('address')}
                placeholder="Ej: De los semáforos de Plaza El Sol 2c al lago, 1c abajo"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Punto de Referencia
                </label>
                <Input
                  {...register('address_reference')}
                  placeholder="Ej: Portón negro frente a farmacia"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Enlace Google Maps / Waze
                </label>
                <Input
                  {...register('maps_url')}
                  placeholder="https://maps.google.com/?q=..."
                  leftIcon={<Navigation className="h-4 w-4 text-indigo-500" />}
                />
              </div>
            </div>
          </div>

          {/* Comportamiento Financiero Habitual */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-[#004594]" /> Comportamiento Financiero por Defecto
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Operación Habitual
                </label>
                <select
                  {...register('default_financial_type')}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004594]/20"
                >
                  <option value="none">⚪ Sin movimiento financiero habitual</option>
                  <option value="collection">🟢 Cobro a recibir (Ingreso)</option>
                  <option value="payment">🔴 Pago a proveedor (Egreso)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Moneda Habitual
                </label>
                <select
                  {...register('default_currency')}
                  className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#004594]/20"
                >
                  <option value="NIO">Córdobas (C$ NIO)</option>
                  <option value="USD">Dólares ($ USD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notas e Instrucciones Permanentes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-slate-500" /> Notas / Instrucciones Frecuentes
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Ej: Horario de atención de 8:00 AM a 4:30 PM. Entrar por el portón de visitas y anunciar con vigilante."
              className="w-full text-xs bg-white border border-slate-200 rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004594]/20 resize-none font-medium"
            />
          </div>

          <ModalFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              {isEditing ? 'Guardar Cambios' : 'Registrar en Directorio'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  )
}
