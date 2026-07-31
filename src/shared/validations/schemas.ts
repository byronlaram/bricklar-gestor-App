import { z } from 'zod'

// ─── Validaciones compartidas (frontend + edge functions) ──────────────────────

/** UUID válido */
export const uuidSchema = z.string().uuid('ID inválido')

/** Moneda válida */
export const currencySchema = z.enum(['NIO', 'USD'], {
  errorMap: () => ({ message: 'Moneda debe ser NIO o USD' }),
})

/** Monto positivo con hasta 2 decimales */
export const positiveAmountSchema = z
  .number({ invalid_type_error: 'Debe ser un número' })
  .positive('El monto debe ser mayor que cero')
  .multipleOf(0.01, 'Máximo 2 decimales')

/** Monto opcional (nulo o positivo) */
export const optionalAmountSchema = z
  .number()
  .positive('El monto debe ser mayor que cero')
  .multipleOf(0.01)
  .nullable()
  .optional()

/** Tipo de cambio positivo */
export const exchangeRateSchema = z
  .number({ invalid_type_error: 'Debe ser un número' })
  .positive('El tipo de cambio debe ser mayor que cero')
  .multipleOf(0.0001)

/** Fecha en formato YYYY-MM-DD */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)')

/** Hora en formato HH:MM */
export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)')
  .nullable()
  .optional()

/** Teléfono nicaragüense (8 dígitos) o internacional */
export const phoneSchema = z
  .string()
  .min(8, 'Teléfono muy corto')
  .max(20, 'Teléfono muy largo')
  .regex(/^[+\d\s\-()]+$/, 'Formato de teléfono inválido')
  .nullable()
  .optional()

/** URL válida o nula */
export const urlSchema = z
  .string()
  .url('URL inválida')
  .nullable()
  .optional()

/** URL de mapa válida */
export const mapUrlSchema = z
  .string()
  .refine(
    (val) => {
      if (!val) return true
      try {
        const parsed = new URL(val)
        return (
          parsed.hostname.includes('google.com') ||
          parsed.hostname.includes('maps.app.goo.gl') ||
          parsed.hostname.includes('waze.com') ||
          parsed.hostname.includes('goo.gl')
        )
      } catch {
        return false
      }
    },
    { message: 'Debe ser una URL de Google Maps o Waze' }
  )
  .nullable()
  .optional()

/** Latitud válida */
export const latSchema = z.number().min(-90).max(90).nullable().optional()

/** Longitud válida */
export const lngSchema = z.number().min(-180).max(180).nullable().optional()

// ─── Schema de tarea (base) ────────────────────────────────────────────────────
export const taskBaseSchema = z.object({
  task_type: z.enum([
    'delivery', 'bus_shipment', 'logistics_shipment', 'purchase',
    'bank_deposit', 'credit_payment', 'service_payment', 'fuel', 'other_errand',
  ], { errorMap: () => ({ message: 'Tipo de tarea requerido' }) }),
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  description: z.string().min(5, 'La descripción es obligatoria').max(2000),
  scheduled_date: dateSchema,
  scheduled_start_time: timeSchema,
  scheduled_deadline: timeSchema,
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  // Contacto
  contact_name: z.string().min(2, 'El nombre es requerido').max(200).optional(),
  company_name: z.string().max(200).nullable().optional(),
  phone: phoneSchema,
  whatsapp: phoneSchema,
  address: z.string().max(500).nullable().optional(),
  address_reference: z.string().max(500).nullable().optional(),
  maps_url: mapUrlSchema,
  latitude: latSchema,
  longitude: lngSchema,
  // Gestión
  provider_name: z.string().max(200).nullable().optional(),
  institution_name: z.string().max(200).nullable().optional(),
  destination_contact: z.string().max(200).nullable().optional(),
  management_description: z.string().max(2000).nullable().optional(),
  // Financiero previsto
  requires_collection: z.boolean().default(false),
  expected_collection_amount: optionalAmountSchema,
  expected_collection_currency: currencySchema.nullable().optional(),
  expected_payment_method: z.string().nullable().optional(),
  requires_payment: z.boolean().default(false),
  expected_payment_amount: optionalAmountSchema,
  expected_payment_currency: currencySchema.nullable().optional(),
  // Extra
  notes: z.string().max(2000).nullable().optional(),
}).superRefine((data, ctx) => {
  // Monto obligatorio si requiere cobro
  if (data.requires_collection && !data.expected_collection_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expected_collection_amount'],
      message: 'El monto de cobro es obligatorio cuando se marca cobro requerido',
    })
  }
  if (data.requires_collection && !data.expected_collection_currency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expected_collection_currency'],
      message: 'La moneda es obligatoria cuando se marca cobro requerido',
    })
  }
  // Monto obligatorio si requiere pago
  if (data.requires_payment && !data.expected_payment_amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expected_payment_amount'],
      message: 'El monto de pago es obligatorio cuando se marca pago requerido',
    })
  }
  if (data.requires_payment && !data.expected_payment_currency) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['expected_payment_currency'],
      message: 'La moneda es obligatoria cuando se marca pago requerido',
    })
  }
})

export type TaskBaseInput = z.infer<typeof taskBaseSchema>
