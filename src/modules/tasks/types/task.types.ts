// ─── Tipos enriquecidos del módulo Tareas ────────────────────────────────────
import type {
  TaskType,
  TaskStatus,
  TaskPriority,
  FinancialStatus,
  Currency,
  PaymentMethod,
} from '@/shared/types'

export type ApprovalStatus = 'approved' | 'pending' | 'rejected'
export type CreationOrigin = 'admin' | 'courier_created'

// ─── Entidad principal: Task ──────────────────────────────────────────────────

export interface Task {
  id: string
  code: string
  branch_id: string
  task_type: TaskType
  title: string
  description: string
  scheduled_date: string          // YYYY-MM-DD
  scheduled_start_time: string | null
  scheduled_deadline: string | null
  priority: TaskPriority
  status: TaskStatus
  financial_status: FinancialStatus
  route_order: number | null
  // Aprobación y Origen
  approval_status?: ApprovalStatus
  approved_by?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  creation_origin?: CreationOrigin
  evidence_url?: string | null
  workday_id?: string | null
  // Contacto
  contact_name: string | null
  company_name: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  address_reference: string | null
  maps_url: string | null
  latitude: number | null
  longitude: number | null
  // Gestión
  provider_name: string | null
  institution_name: string | null
  destination_contact: string | null
  management_description: string | null
  // Financiero
  requires_collection: boolean
  expected_collection_amount: number | null
  expected_collection_currency: Currency | null
  expected_payment_method: PaymentMethod | null
  requires_payment: boolean
  expected_payment_amount: number | null
  expected_payment_currency: Currency | null
  // Control
  assigned_courier_id: string | null
  created_by: string
  updated_by: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  rescheduled_from_task_id: string | null
  notes: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

// ─── Tarea con datos del motorizado ──────────────────────────────────────────

export interface CourierSummary {
  id: string
  full_name: string
  display_name: string | null
  phone: string | null
  avatar_url: string | null
}

export interface TaskWithCourier extends Task {
  courier: CourierSummary | null
  created_by_profile: { full_name: string } | null
}

// ─── Filtros de listado ───────────────────────────────────────────────────────

export interface TaskFilters {
  branch_id?: string
  date?: string                   // YYYY-MM-DD (scheduled_date)
  date_from?: string
  date_to?: string
  status?: TaskStatus | ''
  approval_status?: ApprovalStatus | ''
  creation_origin?: CreationOrigin | ''
  task_type?: TaskType | ''
  priority?: TaskPriority | ''
  courier_id?: string | ''
  search?: string                 // busca en title, code, contact_name
  page?: number
  page_size?: number
}

// ─── Historial de asignaciones ───────────────────────────────────────────────

export interface TaskAssignment {
  id: string
  task_id: string
  courier_id: string
  assigned_by: string
  unassigned_at: string | null
  unassigned_by: string | null
  reason: string | null
  created_at: string
  courier?: CourierSummary
  assigned_by_profile?: { full_name: string }
}

// ─── Historial de estados ─────────────────────────────────────────────────────

export interface TaskStatusHistory {
  id: string
  task_id: string
  from_status: TaskStatus | null
  to_status: TaskStatus
  changed_by: string
  notes: string | null
  created_at: string
  changed_by_profile?: { full_name: string }
}

export interface TaskMetadata {
  reference_photos?: string[]
  [key: string]: unknown
}

// ─── Payload para crear tarea ─────────────────────────────────────────────────

export interface CreateTaskPayload {
  branch_id: string
  task_type: TaskType
  title: string
  description: string
  scheduled_date: string
  scheduled_start_time?: string | null
  scheduled_deadline?: string | null
  priority?: TaskPriority
  approval_status?: ApprovalStatus
  creation_origin?: CreationOrigin
  evidence_url?: string | null
  workday_id?: string | null
  contact_name?: string | null
  company_name?: string | null
  phone?: string | null
  whatsapp?: string | null
  address?: string | null
  address_reference?: string | null
  maps_url?: string | null
  latitude?: number | null
  longitude?: number | null
  provider_name?: string | null
  institution_name?: string | null
  destination_contact?: string | null
  management_description?: string | null
  requires_collection?: boolean
  expected_collection_amount?: number | null
  expected_collection_currency?: Currency | null
  expected_payment_method?: PaymentMethod | null
  requires_payment?: boolean
  expected_payment_amount?: number | null
  expected_payment_currency?: Currency | null
  notes?: string | null
  assigned_courier_id?: string | null
  metadata?: TaskMetadata | Record<string, unknown> | null
}

// ─── Payload para actualizar tarea ───────────────────────────────────────────

export type UpdateTaskPayload = Partial<Omit<CreateTaskPayload, 'branch_id' | 'task_type'>>

// ─── Payload para asignar motorizado ─────────────────────────────────────────

export interface AssignCourierPayload {
  task_id: string
  courier_id: string | null
  reason?: string
}

// ─── Desglose de Pago / Liquidación de Tarea ────────────────────────────────
export interface TaskPaymentBreakdown {
  // Para cobros:
  cash_amount?: number
  transfer_amount?: number
  transfer_bank?: string
  transfer_reference?: string
  cheque_amount?: number
  cheque_bank?: string
  cheque_number?: string
  discrepancy_collection_reason?: string
  // Para compras / gastos:
  actual_paid_amount?: number
  invoice_number?: string
  paid_method?: PaymentMethod | 'cheque'
  discrepancy_payment_reason?: string
}

// ─── Payload para cambiar estado ──────────────────────────────────────────────

export interface ChangeStatusPayload {
  task_id: string
  new_status: TaskStatus
  notes?: string
  cancellation_reason?: string
  payment_breakdown?: TaskPaymentBreakdown
  metadata?: Record<string, unknown>
}

// ─── Resultado paginado ───────────────────────────────────────────────────────

export interface PaginatedTasks {
  data: TaskWithCourier[]
  count: number
  page: number
  page_size: number
  total_pages: number
}
