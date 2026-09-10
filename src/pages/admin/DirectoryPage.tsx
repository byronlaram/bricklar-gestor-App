import { useState } from 'react'
import {
  Users,
  Store,
  Landmark,
  Plus,
  Search,
  Building2,
  Sparkles,
  BookUser,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'
import { Card } from '@/shared/components/ui/Card'
import { Spinner } from '@/shared/components/ui/Spinner'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import {
  useDirectoryContacts,
  useCreateContact,
  useDeleteContact,
} from '@/modules/directory/hooks/useDirectoryContacts'
import { ContactCard } from '@/modules/directory/components/ContactCard'
import { ContactFormModal } from '@/modules/directory/components/ContactFormModal'
import { ContactDetailModal } from '@/modules/directory/components/ContactDetailModal'
import type {
  DirectoryContact,
  DirectoryCategory,
} from '@/modules/directory/types/directory.types'

export default function DirectoryPage() {
  const [selectedCategory, setSelectedCategory] = useState<DirectoryCategory | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<DirectoryContact | null>(null)
  const [defaultCategoryForNew, setDefaultCategoryForNew] = useState<DirectoryCategory>('customer')
  const [viewingContact, setViewingContact] = useState<DirectoryContact | null>(null)

  const { data: contacts = [], isLoading } = useDirectoryContacts({
    category: selectedCategory,
    search: searchTerm,
  })

  // Full dataset for statistics
  const { data: allContacts = [] } = useDirectoryContacts({
    category: 'all',
  })

  const deleteMutation = useDeleteContact()
  const createMutation = useCreateContact()

  const totalAll = allContacts.length
  const totalCustomers = allContacts.filter((c) => c.category === 'customer').length
  const totalProviders = allContacts.filter((c) => c.category === 'provider').length
  const totalInstitutions = allContacts.filter((c) => c.category === 'institution_other').length

  const handleOpenNew = (category?: DirectoryCategory) => {
    setEditingContact(null)
    setDefaultCategoryForNew(
      category || (selectedCategory === 'all' ? 'customer' : selectedCategory)
    )
    setIsModalOpen(true)
  }

  const handleEdit = (contact: DirectoryContact) => {
    setEditingContact(contact)
    setIsModalOpen(true)
  }

  const handleView = (contact: DirectoryContact) => {
    setViewingContact(contact)
  }

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id)
  }

  // Initial demo seed if empty
  const handleSeedDefaults = async () => {
    const initialSeed = [
      {
        name: 'SERVANIC',
        category: 'provider' as DirectoryCategory,
        contact_person: 'Ventas y Mostrador',
        phone: '2278-0000',
        address: 'Plaza España, Managua',
        address_reference: 'Frente a Rotonda El Güegüense',
        default_financial_type: 'payment' as const,
        default_currency: 'NIO' as const,
        notes: 'Compra de repuestos y materiales de oficina.',
      },
      {
        name: 'Pedro Sellos',
        category: 'provider' as DirectoryCategory,
        contact_person: 'Don Pedro',
        phone: '8899-1122',
        address: 'Ciudad Jardín, Managua',
        default_financial_type: 'payment' as const,
        default_currency: 'NIO' as const,
        notes: 'Fabricación y confección de sellos y papelería.',
      },
      {
        name: 'Cristhian Fisher Mejía',
        category: 'customer' as DirectoryCategory,
        contact_person: 'Cristhian Fisher',
        phone: '8894-1666',
        address: 'POWER TOOLS CENTER, Managua',
        default_financial_type: 'collection' as const,
        default_currency: 'NIO' as const,
        notes: 'Entrega de órdenes de trabajo y cobro de factura.',
      },
      {
        name: 'ATM BANPRO',
        category: 'institution_other' as DirectoryCategory,
        contact_person: 'Cajero Automático',
        address: 'Sucursal Plaza Bancentro',
        default_financial_type: 'none' as const,
        default_currency: 'NIO' as const,
        notes: 'Retiro de efectivo para compras operativas.',
      },
      {
        name: 'Colegio de las Niñas',
        category: 'institution_other' as DirectoryCategory,
        contact_person: 'Administración Escolar',
        address: 'Carretera a Masaya, Managua',
        address_reference: 'Entrada principal de visitas',
        default_financial_type: 'none' as const,
        default_currency: 'NIO' as const,
        notes: 'Gestiones y trámites escolares.',
      },
    ]

    for (const item of initialSeed) {
      await createMutation.mutateAsync(item)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#004594] text-white shadow-2xs">
              <BookUser className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Directorio Central
              </h1>
              <p className="text-xs text-muted-foreground">
                Registro organizado de Clientes, Proveedores, Instituciones y Puntos Frecuentes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalAll === 0 && !isLoading && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              isLoading={createMutation.isPending}
              leftIcon={<Sparkles className="h-4 w-4 text-amber-500" />}
              className="text-xs font-bold"
            >
              Cargar Contactos Frecuentes
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNew()}
            leftIcon={<Plus className="h-4 w-4" />}
            className="text-xs font-bold shadow-2xs"
          >
            Nuevo Registro
          </Button>
        </div>
      </div>

      {/* Tarjetas de Métricas y Conteo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card
          onClick={() => setSelectedCategory('all')}
          className={`p-4 border transition-all cursor-pointer rounded-2xl ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
              : 'bg-white text-slate-900 border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${selectedCategory === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Registros
            </span>
            <Building2 className={`h-4 w-4 ${selectedCategory === 'all' ? 'text-slate-300' : 'text-slate-400'}`} />
          </div>
          <p className="text-2xl font-black mt-2 font-tabular">{totalAll}</p>
          <span className={`text-3xs font-medium block mt-0.5 ${selectedCategory === 'all' ? 'text-slate-400' : 'text-slate-400'}`}>
            En todo el directorio
          </span>
        </Card>

        <Card
          onClick={() => setSelectedCategory('customer')}
          className={`p-4 border transition-all cursor-pointer rounded-2xl ${
            selectedCategory === 'customer'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-emerald-50/50 text-emerald-950 border-emerald-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${selectedCategory === 'customer' ? 'text-emerald-100' : 'text-emerald-800'}`}>
              Clientes
            </span>
            <Users className={`h-4 w-4 ${selectedCategory === 'customer' ? 'text-emerald-100' : 'text-emerald-600'}`} />
          </div>
          <p className="text-2xl font-black mt-2 font-tabular">{totalCustomers}</p>
          <span className={`text-3xs font-medium block mt-0.5 ${selectedCategory === 'customer' ? 'text-emerald-200' : 'text-emerald-700'}`}>
            Entregas / Cobros
          </span>
        </Card>

        <Card
          onClick={() => setSelectedCategory('provider')}
          className={`p-4 border transition-all cursor-pointer rounded-2xl ${
            selectedCategory === 'provider'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20'
              : 'bg-rose-50/50 text-rose-950 border-rose-200/80 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${selectedCategory === 'provider' ? 'text-rose-100' : 'text-rose-800'}`}>
              Proveedores
            </span>
            <Store className={`h-4 w-4 ${selectedCategory === 'provider' ? 'text-rose-100' : 'text-rose-600'}`} />
          </div>
          <p className="text-2xl font-black mt-2 font-tabular">{totalProviders}</p>
          <span className={`text-3xs font-medium block mt-0.5 ${selectedCategory === 'provider' ? 'text-rose-200' : 'text-rose-700'}`}>
            Compras / Pagos
          </span>
        </Card>

        <Card
          onClick={() => setSelectedCategory('institution_other')}
          className={`p-4 border transition-all cursor-pointer rounded-2xl ${
            selectedCategory === 'institution_other'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
              : 'bg-blue-50/50 text-blue-950 border-blue-200/80 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${selectedCategory === 'institution_other' ? 'text-blue-100' : 'text-blue-800'}`}>
              Instituciones & Otros
            </span>
            <Landmark className={`h-4 w-4 ${selectedCategory === 'institution_other' ? 'text-blue-100' : 'text-blue-600'}`} />
          </div>
          <p className="text-2xl font-black mt-2 font-tabular">{totalInstitutions}</p>
          <span className={`text-3xs font-medium block mt-0.5 ${selectedCategory === 'institution_other' ? 'text-blue-200' : 'text-blue-700'}`}>
            Bancos, Colegios y Gestiones
          </span>
        </Card>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Pestañas de categoría */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedCategory === 'all'
                ? 'bg-[#004594] text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({totalAll})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('customer')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'customer'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Clientes ({totalCustomers})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('provider')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'provider'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-800 hover:bg-rose-50'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            Proveedores ({totalProviders})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('institution_other')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              selectedCategory === 'institution_other'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-800 hover:bg-blue-50'
            }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            Instituciones & Otros ({totalInstitutions})
          </button>
        </div>

        {/* Buscador */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, persona, teléfono o dirección..."
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004594]/20 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Listado de Entidades */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Spinner size="lg" className="text-[#004594]" />
          <p className="text-xs text-slate-500 font-medium">Cargando directorio de contactos...</p>
        </div>
      ) : contacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<BookUser className="h-10 w-10 text-slate-400" />}
          title={
            searchTerm
              ? `No se encontraron resultados para "${searchTerm}"`
              : selectedCategory !== 'all'
              ? `No hay registros en la categoría seleccionada`
              : 'Directorio vacío'
          }
          description={
            searchTerm
              ? 'Intenta con otro término de búsqueda o limpia el filtro.'
              : 'Registra a tus clientes habituales, proveedores de compra o instituciones para agilizar la creación de tareas.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenNew()}
              leftIcon={<Plus className="h-4 w-4" />}
              className="text-xs font-bold"
            >
              Crear Primer Contacto
            </Button>
          }
        />
      )}

      {/* Modal de Vista de Detalle */}
      <ContactDetailModal
        isOpen={viewingContact !== null}
        contact={viewingContact}
        onClose={() => setViewingContact(null)}
        onEdit={(contact) => {
          setViewingContact(null)
          handleEdit(contact)
        }}
      />

      {/* Modal de Creación / Edición */}
      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contactToEdit={editingContact}
        initialCategory={defaultCategoryForNew}
      />
    </div>
  )
}
