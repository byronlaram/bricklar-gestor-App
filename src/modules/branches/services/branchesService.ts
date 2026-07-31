import { supabase } from '@/shared/lib/supabaseClient'
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '../types/branches.types'

export async function getBranches(): Promise<Branch[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Branches] getBranches error:', error)
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as Branch[]
}

export async function createBranch(payload: CreateBranchPayload): Promise<Branch> {
  const insertData = {
    name: payload.name,
    code: payload.code.toUpperCase(),
    address: payload.address ?? null,
    phone: payload.phone ?? null,
    is_active: true,
  }

  const { data, error } = await supabase
    .from('branches')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('[Branches] createBranch error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Branch
}

export async function updateBranch(id: string, payload: UpdateBranchPayload): Promise<Branch> {
  const updateData: Record<string, unknown> = {}
  if (payload.name !== undefined) updateData.name = payload.name
  if (payload.code !== undefined) updateData.code = payload.code.toUpperCase()
  if (payload.address !== undefined) updateData.address = payload.address
  if (payload.phone !== undefined) updateData.phone = payload.phone
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active

  const { data, error } = await supabase
    .from('branches')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[Branches] updateBranch error:', error)
    throw new Error(error.message)
  }

  return data as unknown as Branch
}

export async function toggleBranchStatus(id: string, is_active: boolean): Promise<Branch> {
  return updateBranch(id, { is_active })
}
