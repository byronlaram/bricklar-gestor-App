import type { TaskType, PaymentMethod } from '@/shared/types'

export interface TaskTypeFieldConfig {
  label: string
  placeholder?: string
  helpText?: string
  required?: boolean
}

export interface TaskTypeConfig {
  type: TaskType
  label: string
  suggestedTitle: string
  descriptionPlaceholder: string
  
  // Mapeos y etiquetas contextuales de entidad
  entityType: 'client' | 'provider' | 'bank' | 'transport' | 'custom'
  entityLabel?: string
  entityPlaceholder?: string
  
  institutionLabel?: string
  institutionPlaceholder?: string
  
  referenceNumberLabel?: string
  referenceNumberPlaceholder?: string

  contactNameLabel?: string
  contactNamePlaceholder?: string

  addressLabel?: string
  addressPlaceholder?: string

  addressReferenceLabel?: string
  addressReferencePlaceholder?: string

  // Configuración financiera por defecto
  defaultRequiresCollection: boolean
  defaultRequiresPayment: boolean
  defaultPaymentMethod?: PaymentMethod

  // Campos principales visibles en Modo Rápido
  fastModeFields: Array<
    | 'contact_name'
    | 'company_name'
    | 'provider_name'
    | 'institution_name'
    | 'destination_contact'
    | 'phone'
    | 'address'
    | 'address_reference'
    | 'maps_url'
    | 'financial'
  >
}

export const TASK_TYPE_CONFIGS: Record<TaskType, TaskTypeConfig> = {
  delivery: {
    type: 'delivery',
    label: 'Entrega / Mensajería',
    suggestedTitle: 'Entrega de paquete a cliente',
    descriptionPlaceholder: 'Detalla el contenido a entregar y cualquier instrucción especial...',
    entityType: 'client',
    contactNameLabel: 'Nombre del Cliente / Destinatario',
    contactNamePlaceholder: 'Ej: Juan Pérez',
    addressLabel: 'Dirección de Entrega',
    addressPlaceholder: 'Ej: Semáforos del Zumen 2c al lago',
    addressReferenceLabel: 'Referencia de Ubicación',
    addressReferencePlaceholder: 'Ej: Casa azul con portón negro frente al parque',
    defaultRequiresCollection: false,
    defaultRequiresPayment: false,
    fastModeFields: ['contact_name', 'phone', 'address', 'address_reference', 'financial'],
  },

  bus_shipment: {
    type: 'bus_shipment',
    label: 'Encomienda por Bus',
    suggestedTitle: 'Encomienda por bus interurbano',
    descriptionPlaceholder: 'Indica el contenido del paquete y detalles para la terminal...',
    entityType: 'transport',
    institutionLabel: 'Cooperativa / Empresa de Bus',
    institutionPlaceholder: 'Ej: Cooperativa Cotran',
    addressLabel: 'Terminal u Origen de Entrega',
    addressPlaceholder: 'Ej: Terminal Mercado Mayoreo',
    addressReferenceLabel: 'Ciudad de Destino / Punto de Entrega',
    addressReferencePlaceholder: 'Ej: Matagalpa - Terminal Sur',
    referenceNumberLabel: 'Número de Guía / N° de Ficha',
    referenceNumberPlaceholder: 'Ej: GUIA-88492',
    defaultRequiresCollection: false,
    defaultRequiresPayment: true,
    defaultPaymentMethod: 'cash',
    fastModeFields: ['institution_name', 'address', 'address_reference', 'destination_contact', 'financial'],
  },

  logistics_shipment: {
    type: 'logistics_shipment',
    label: 'Encomienda Logística (Cargo)',
    suggestedTitle: 'Envío por agencias de carga / logística',
    descriptionPlaceholder: 'Detalles del envío, dimensiones y requisitos de recepción...',
    entityType: 'transport',
    institutionLabel: 'Empresa Logística / Carga',
    institutionPlaceholder: 'Ej: CargoTrans / Servicor',
    addressLabel: 'Punto de Retiro / Origen',
    addressPlaceholder: 'Ej: Sucursal Central CargoTrans',
    addressReferenceLabel: 'Ciudad o Dirección de Destino',
    addressReferencePlaceholder: 'Ej: Chinandega, Calle Comercial',
    referenceNumberLabel: 'Número de Guía / Rastreo',
    referenceNumberPlaceholder: 'Ej: TRK-990214',
    defaultRequiresCollection: false,
    defaultRequiresPayment: false,
    fastModeFields: ['institution_name', 'address', 'address_reference', 'destination_contact', 'contact_name', 'phone', 'financial'],
  },

  purchase: {
    type: 'purchase',
    label: 'Compra de Insumos / Productos',
    suggestedTitle: 'Compra en establecimiento',
    descriptionPlaceholder: 'Lista detallada de artículos, cantidades o repuestos a comprar...',
    entityType: 'provider',
    entityLabel: 'Proveedor / Comercio',
    entityPlaceholder: 'Ej: Repuestos El Halcón',
    addressLabel: 'Dirección o Sucursal del Comercio',
    addressPlaceholder: 'Ej: Altamira, de la Vicky 1c abajo',
    referenceNumberLabel: 'N° de Cotización / Orden de Compra',
    referenceNumberPlaceholder: 'Ej: OC-2026-14',
    defaultRequiresCollection: false,
    defaultRequiresPayment: true,
    defaultPaymentMethod: 'cash',
    fastModeFields: ['provider_name', 'address', 'destination_contact', 'financial'],
  },

  fuel: {
    type: 'fuel',
    label: 'Compra de Combustible',
    suggestedTitle: 'Compra de combustible',
    descriptionPlaceholder: 'Tipo de combustible (Súper/Regular/Diesel) e indicaciones...',
    entityType: 'provider',
    entityLabel: 'Gasolinera / Estación de Servicio',
    entityPlaceholder: 'Ej: Puma Rubenia / UNO Carretera Masaya',
    referenceNumberLabel: 'N° de Factura / Ticket / Bomba',
    referenceNumberPlaceholder: 'Ej: Factura 001-948',
    defaultRequiresCollection: false,
    defaultRequiresPayment: true,
    defaultPaymentMethod: 'cash',
    fastModeFields: ['provider_name', 'destination_contact', 'financial'],
  },

  bank_deposit: {
    type: 'bank_deposit',
    label: 'Depósito Bancario',
    suggestedTitle: 'Depósito bancario en ventanilla / cajero',
    descriptionPlaceholder: 'Indique concepto de depósito o referencias requeridas...',
    entityType: 'bank',
    institutionLabel: 'Banco / Entidad Financiera',
    institutionPlaceholder: 'Ej: BAC Credomatic / Banpro / Lafise',
    referenceNumberLabel: 'Número de Cuenta / Referencia',
    referenceNumberPlaceholder: 'Ej: 351-99201-4',
    contactNameLabel: 'Nombre del Beneficiario / Titular',
    contactNamePlaceholder: 'Ej: Distribuidora Bricklar S.A.',
    addressLabel: 'Sucursal Bancaria / Sucursal de Origen',
    addressPlaceholder: 'Ej: Sucursal BAC Plaza España',
    defaultRequiresCollection: false,
    defaultRequiresPayment: true,
    defaultPaymentMethod: 'cash',
    fastModeFields: ['institution_name', 'destination_contact', 'contact_name', 'address', 'financial'],
  },

  credit_payment: {
    type: 'credit_payment',
    label: 'Pago de Crédito / Cuota',
    suggestedTitle: 'Pago de cuota de crédito',
    descriptionPlaceholder: 'Detalles de la cuota, código de cliente o acuerdo de pago...',
    entityType: 'bank',
    institutionLabel: 'Banco / Financiera / Acreedor',
    institutionPlaceholder: 'Ej: Financiera FAMA / BAC Credomatic',
    referenceNumberLabel: 'N° de Crédito / Referencia de Pago',
    referenceNumberPlaceholder: 'Ej: CR-883019',
    contactNameLabel: 'Nombre del Titular del Crédito',
    contactNamePlaceholder: 'Ej: Maria Lopez',
    defaultRequiresCollection: false,
    defaultRequiresPayment: true,
    defaultPaymentMethod: 'cash',
    fastModeFields: ['institution_name', 'destination_contact', 'contact_name', 'financial'],
  },

  service_payment: {
    type: 'service_payment',
    label: 'Pago de Servicios',
    suggestedTitle: 'Pago de servicio público / privado',
    descriptionPlaceholder: 'Indique mes del servicio, contador o número de contrato...',
    entityType: 'provider',
    entityLabel: 'Proveedor del Servicio',
    entityPlaceholder: 'Ej: Disnorte-Dissur / Enacal / Claro / Tigo',
    referenceNumberLabel: 'N° de Contrato / NIS / Factura',
    referenceNumberPlaceholder: 'Ej: NIS 2948102',
    defaultRequiresCollection: false,
    defaultRequiresPayment: true,
    defaultPaymentMethod: 'cash',
    fastModeFields: ['provider_name', 'destination_contact', 'financial'],
  },

  other_errand: {
    type: 'other_errand',
    label: 'Otra Gestión / Trámite',
    suggestedTitle: 'Gestión administrativa general',
    descriptionPlaceholder: 'Instrucciones claras y detalladas para el motorizado...',
    entityType: 'custom',
    contactNameLabel: 'Contacto u Organización',
    contactNamePlaceholder: 'Ej: Lic. Carlos Mendoza',
    addressLabel: 'Ubicación / Dirección',
    addressPlaceholder: 'Ej: Oficinas centrales MTI',
    defaultRequiresCollection: false,
    defaultRequiresPayment: false,
    fastModeFields: ['contact_name', 'phone', 'address', 'address_reference', 'financial'],
  },
}
