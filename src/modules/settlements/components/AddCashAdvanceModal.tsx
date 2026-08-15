import { DeliverCashModal, type DeliverCashModalProps } from './DeliverCashModal'

/**
 * @deprecated Utilizar DeliverCashModal directamente.
 * Este wrapper mantiene compatibilidad con código existente.
 */
export function AddCashAdvanceModal(props: DeliverCashModalProps) {
  return <DeliverCashModal {...props} />
}

export { DeliverCashModal }
