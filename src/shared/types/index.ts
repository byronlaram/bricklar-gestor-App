// ─── Shared Types: Global ──────────────────────────────────────────────────────
// Tipos globales compartidos entre módulos

export type UUID = string;

export type Currency = 'NIO' | 'USD';

export type TaskType =
  | 'delivery'
  | 'bus_shipment'
  | 'logistics_shipment'
  | 'purchase'
  | 'bank_deposit'
  | 'credit_payment'
  | 'service_payment'
  | 'fuel'
  | 'other_errand';

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'en_route'
  | 'in_progress'
  | 'completed'
  | 'not_completed'
  | 'rescheduled'
  | 'cancelled'
  | 'archived';

export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export type FinancialStatus =
  | 'no_movement'
  | 'collection_pending'
  | 'collected'
  | 'payment_pending'
  | 'paid'
  | 'partial'
  | 'discrepancy'
  | 'verification_pending';

export type UserRole = 'general_admin' | 'junior_admin' | 'courier';

export type WorkdayStatus =
  | 'open'
  | 'pending_settlement'
  | 'reviewed'
  | 'closed'
  | 'reopened_with_authorization';

export type SettlementStatus =
  | 'draft'
  | 'pending_review'
  | 'observed'
  | 'approved'
  | 'closed'
  | 'adjusted';

export type CashTransferStatus =
  | 'pending_confirmation'
  | 'confirmed'
  | 'disputed'
  | 'voided';

export type MovementType =
  | 'cash_advance'
  | 'customer_collection'
  | 'payment'
  | 'purchase'
  | 'deposit'
  | 'fuel'
  | 'shipment_fee'
  | 'refund'
  | 'change_given'
  | 'cash_return'
  | 'adjustment'
  | 'other_income'
  | 'other_expense';

export type MovementDirection = 'income' | 'expense';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'mobile_wallet'
  | 'cheque'
  | 'mixed'
  | 'other';

// Labels en español para enums
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  delivery: 'Entrega',
  bus_shipment: 'Encomienda por bus',
  logistics_shipment: 'Encomienda logística',
  purchase: 'Compra',
  bank_deposit: 'Depósito bancario',
  credit_payment: 'Pago de crédito',
  service_payment: 'Pago de servicio',
  fuel: 'Combustible',
  other_errand: 'Otra gestión',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pendiente',
  assigned: 'Asignada',
  en_route: 'En ruta',
  in_progress: 'En gestión',
  completed: 'Completada',
  not_completed: 'No completada',
  rescheduled: 'Reprogramada',
  cancelled: 'Cancelada',
  archived: 'Archivada',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  general_admin: 'Administrador General',
  junior_admin: 'Administrador Junior',
  courier: 'Motorizado',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  NIO: 'Córdoba (C$)',
  USD: 'Dólar (US$)',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia bancaria',
  mobile_wallet: 'Billetera móvil',
  cheque: 'Cheque',
  mixed: 'Mixto',
  other: 'Otro',
};

// Transiciones de estado permitidas
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['assigned', 'cancelled', 'rescheduled'],
  assigned: ['en_route', 'cancelled', 'rescheduled'],
  en_route: ['in_progress', 'assigned', 'not_completed'],
  in_progress: ['completed', 'assigned', 'not_completed'],
  completed: ['archived'],
  not_completed: ['pending', 'rescheduled', 'cancelled'],
  rescheduled: ['pending', 'cancelled'],
  cancelled: ['archived'],
  archived: [],
};

// Transiciones permitidas por rol
export const COURIER_ALLOWED_TRANSITIONS: Partial<Record<TaskStatus, TaskStatus[]>> = {
  assigned: ['en_route'],
  en_route: ['in_progress', 'assigned', 'not_completed'],
  in_progress: ['completed', 'assigned', 'not_completed'],
};

export const WORKDAY_STATUS_LABELS: Record<WorkdayStatus, string> = {
  open: 'Abierta',
  pending_settlement: 'Pendiente Liquidación',
  reviewed: 'Revisada',
  closed: 'Cerrada',
  reopened_with_authorization: 'Reabierta',
};

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  draft: 'Borrador',
  pending_review: 'Pendiente Revisión',
  observed: 'Observada',
  approved: 'Aprobada',
  closed: 'Cerrada',
  adjusted: 'Ajustada',
};

