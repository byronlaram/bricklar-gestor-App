export interface Branch {
  id: string
  name: string
  code: string
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
}

export interface CreateBranchPayload {
  name: string
  code: string
  address?: string
  phone?: string
}

export interface UpdateBranchPayload {
  name?: string
  code?: string
  address?: string
  phone?: string
  is_active?: boolean
}
