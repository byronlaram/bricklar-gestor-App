export type DirectoryCategory = 'customer' | 'provider' | 'institution_other'

export type FinancialType = 'none' | 'collection' | 'payment'

export interface DirectoryContact {
  id: string
  name: string
  category: DirectoryCategory
  contact_person: string | null
  phone: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  address_reference: string | null
  maps_url: string | null
  latitude: number | null
  longitude: number | null
  default_task_type: string | null
  default_financial_type: FinancialType
  default_currency: 'NIO' | 'USD'
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateContactPayload {
  name: string
  category: DirectoryCategory
  contact_person?: string | null
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  address?: string | null
  address_reference?: string | null
  maps_url?: string | null
  latitude?: number | null
  longitude?: number | null
  default_task_type?: string | null
  default_financial_type?: FinancialType
  default_currency?: 'NIO' | 'USD'
  notes?: string | null
  is_active?: boolean
}

export interface UpdateContactPayload extends Partial<CreateContactPayload> {
  id: string
}

export interface DirectoryFilters {
  search?: string
  category?: DirectoryCategory | 'all'
  isActiveOnly?: boolean
}

export const CATEGORY_LABELS: Record<DirectoryCategory, string> = {
  customer: 'Clientes',
  provider: 'Proveedores',
  institution_other: 'Instituciones y Otros',
}

export const CATEGORY_SINGULAR_LABELS: Record<DirectoryCategory, string> = {
  customer: 'Cliente',
  provider: 'Proveedor',
  institution_other: 'Institución / Gestión',
}

export const CATEGORY_COLORS: Record<
  DirectoryCategory,
  { bg: string; text: string; border: string; badgeVariant: 'completed' | 'urgent' | 'assigned' }
> = {
  customer: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badgeVariant: 'completed',
  },
  provider: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badgeVariant: 'urgent',
  },
  institution_other: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badgeVariant: 'assigned',
  },
}
