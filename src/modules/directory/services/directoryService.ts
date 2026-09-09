import { supabase } from '@/shared/lib/supabaseClient'
import type { Database } from '@/shared/lib/database.types'
import type {
  DirectoryContact,
  CreateContactPayload,
  UpdateContactPayload,
  DirectoryFilters,
} from '../types/directory.types'

const LOCAL_STORAGE_KEY = 'bricklar_directory_contacts_cache'

function getLocalContacts(): DirectoryContact[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setLocalContacts(contacts: DirectoryContact[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contacts))
  } catch (err) {
    console.error('[Directory] Error saving local contacts cache:', err)
  }
}

export async function getDirectoryContacts(filters?: DirectoryFilters): Promise<DirectoryContact[]> {
  try {
    let query = supabase
      .from('directory_contacts')
      .select('*')
      .order('name', { ascending: true })

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }

    if (filters?.isActiveOnly !== false) {
      query = query.eq('is_active', true)
    }

    if (filters?.search && filters.search.trim()) {
      const term = filters.search.trim()
      query = query.or(`name.ilike.%${term}%,contact_person.ilike.%${term}%,phone.ilike.%${term}%,address.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      console.warn('[Directory] Supabase query error, fallback to local cache:', error.message)
      const local = getLocalContacts()
      return filterLocalContacts(local, filters)
    }

    const contacts = (data ?? []) as unknown as DirectoryContact[]
    setLocalContacts(contacts)
    return contacts
  } catch (err) {
    console.warn('[Directory] Exception reading contacts, fallback to local:', err)
    const local = getLocalContacts()
    return filterLocalContacts(local, filters)
  }
}

function filterLocalContacts(contacts: DirectoryContact[], filters?: DirectoryFilters): DirectoryContact[] {
  let list = [...contacts]
  if (filters?.category && filters.category !== 'all') {
    list = list.filter((c) => c.category === filters.category)
  }
  if (filters?.isActiveOnly !== false) {
    list = list.filter((c) => c.is_active)
  }
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.toLowerCase().trim()
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.contact_person?.toLowerCase().includes(s) ||
        c.phone?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s)
    )
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

export async function createDirectoryContact(payload: CreateContactPayload): Promise<DirectoryContact> {
  const newContactData: Database['public']['Tables']['directory_contacts']['Insert'] = {
    name: payload.name.trim(),
    category: payload.category,
    contact_person: payload.contact_person?.trim() || null,
    phone: payload.phone?.trim() || null,
    whatsapp: payload.whatsapp?.trim() || null,
    email: payload.email?.trim() || null,
    address: payload.address?.trim() || null,
    address_reference: payload.address_reference?.trim() || null,
    maps_url: payload.maps_url?.trim() || null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    default_task_type: payload.default_task_type || null,
    default_financial_type: payload.default_financial_type || 'none',
    default_currency: payload.default_currency || 'NIO',
    notes: payload.notes?.trim() || null,
    is_active: payload.is_active ?? true,
  }

  try {
    const { data, error } = await supabase
      .from('directory_contacts')
      .insert(newContactData)
      .select()
      .single()

    if (error) {
      console.warn('[Directory] Supabase insert error, persisting locally:', error.message)
      const fakeContact: DirectoryContact = {
        id: crypto.randomUUID(),
        name: newContactData.name,
        category: newContactData.category as any,
        contact_person: newContactData.contact_person ?? null,
        phone: newContactData.phone ?? null,
        whatsapp: newContactData.whatsapp ?? null,
        email: newContactData.email ?? null,
        address: newContactData.address ?? null,
        address_reference: newContactData.address_reference ?? null,
        maps_url: newContactData.maps_url ?? null,
        latitude: newContactData.latitude ?? null,
        longitude: newContactData.longitude ?? null,
        default_task_type: newContactData.default_task_type ?? null,
        default_financial_type: (newContactData.default_financial_type as any) || 'none',
        default_currency: (newContactData.default_currency as any) || 'NIO',
        notes: newContactData.notes ?? null,
        is_active: newContactData.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      const local = getLocalContacts()
      setLocalContacts([fakeContact, ...local])
      return fakeContact
    }

    const saved = data as unknown as DirectoryContact
    const local = getLocalContacts()
    setLocalContacts([saved, ...local.filter((c) => c.id !== saved.id)])
    return saved
  } catch (err) {
    console.warn('[Directory] Exception creating contact, saving locally:', err)
    const fakeContact: DirectoryContact = {
      id: crypto.randomUUID(),
      name: newContactData.name,
      category: newContactData.category as any,
      contact_person: newContactData.contact_person ?? null,
      phone: newContactData.phone ?? null,
      whatsapp: newContactData.whatsapp ?? null,
      email: newContactData.email ?? null,
      address: newContactData.address ?? null,
      address_reference: newContactData.address_reference ?? null,
      maps_url: newContactData.maps_url ?? null,
      latitude: newContactData.latitude ?? null,
      longitude: newContactData.longitude ?? null,
      default_task_type: newContactData.default_task_type ?? null,
      default_financial_type: (newContactData.default_financial_type as any) || 'none',
      default_currency: (newContactData.default_currency as any) || 'NIO',
      notes: newContactData.notes ?? null,
      is_active: newContactData.is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const local = getLocalContacts()
    setLocalContacts([fakeContact, ...local])
    return fakeContact
  }
}

export async function updateDirectoryContact(payload: UpdateContactPayload): Promise<DirectoryContact> {
  const { id, ...rest } = payload
  const updateData: Database['public']['Tables']['directory_contacts']['Update'] = {}

  if (rest.name !== undefined) updateData.name = rest.name.trim()
  if (rest.category !== undefined) updateData.category = rest.category
  if (rest.contact_person !== undefined) updateData.contact_person = rest.contact_person?.trim() || null
  if (rest.phone !== undefined) updateData.phone = rest.phone?.trim() || null
  if (rest.whatsapp !== undefined) updateData.whatsapp = rest.whatsapp?.trim() || null
  if (rest.email !== undefined) updateData.email = rest.email?.trim() || null
  if (rest.address !== undefined) updateData.address = rest.address?.trim() || null
  if (rest.address_reference !== undefined) updateData.address_reference = rest.address_reference?.trim() || null
  if (rest.maps_url !== undefined) updateData.maps_url = rest.maps_url?.trim() || null
  if (rest.latitude !== undefined) updateData.latitude = rest.latitude
  if (rest.longitude !== undefined) updateData.longitude = rest.longitude
  if (rest.default_task_type !== undefined) updateData.default_task_type = rest.default_task_type
  if (rest.default_financial_type !== undefined) updateData.default_financial_type = rest.default_financial_type
  if (rest.default_currency !== undefined) updateData.default_currency = rest.default_currency
  if (rest.notes !== undefined) updateData.notes = rest.notes?.trim() || null
  if (rest.is_active !== undefined) updateData.is_active = rest.is_active
  updateData.updated_at = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from('directory_contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.warn('[Directory] Supabase update error, updating local:', error.message)
      const local = getLocalContacts()
      const idx = local.findIndex((c) => c.id === id)
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...updateData } as DirectoryContact
        setLocalContacts([...local])
        return local[idx]
      }
      throw new Error(error.message)
    }

    const updated = data as unknown as DirectoryContact
    const local = getLocalContacts()
    setLocalContacts(local.map((c) => (c.id === id ? updated : c)))
    return updated
  } catch (err) {
    console.warn('[Directory] Exception updating contact, updating local:', err)
    const local = getLocalContacts()
    const idx = local.findIndex((c) => c.id === id)
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...updateData } as DirectoryContact
      setLocalContacts([...local])
      return local[idx]
    }
    throw err
  }
}

export async function deleteDirectoryContact(id: string): Promise<void> {
  try {
    const { error } = await supabase.from('directory_contacts').delete().eq('id', id)
    if (error) {
      console.warn('[Directory] Supabase delete error, deleting local:', error.message)
    }
  } catch (err) {
    console.warn('[Directory] Exception deleting contact:', err)
  }

  const local = getLocalContacts()
  setLocalContacts(local.filter((c) => c.id !== id))
}
