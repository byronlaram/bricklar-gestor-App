/**
 * Bricklar Logistics - Corporate PDF & Printable Receipt Service
 * Generates beautiful, formatted, official corporate vouchers and reports.
 */

import { formatDate } from './format'

function getStoredCompanyProfile() {
  try {
    const raw = localStorage.getItem('company_profile_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        name: parsed.name || 'BRICKLAR LOGISTICS',
        legalName: parsed.legal_name || 'Distribuidora Bricklar S.A.',
        taxId: parsed.tax_id || 'J0310000194829',
        slogan: parsed.slogan || 'Gestión Integral de Envíos & Liquidaciones',
        phone: parsed.phone || '',
        email: parsed.email || '',
        logoUrl: parsed.logo_url || '',
      }
    }
  } catch (e) {}
  return {
    name: 'BRICKLAR LOGISTICS',
    legalName: 'Distribuidora Bricklar S.A.',
    taxId: 'J0310000194829',
    slogan: 'Gestión Integral de Envíos & Liquidaciones',
    phone: '',
    email: '',
    logoUrl: '',
  }
}

export interface SettlementReceiptData {
  settlementId: string
  settlementDate: string
  courierName: string
  courierPhone?: string | null
  branchName: string
  status: string
  reviewerName?: string | null
  reviewedAt?: string | null
  initialCash: number
  advances: number
  collectionsNIO: number
  collectionsUSD: number
  transfersNIO: number
  transfersUSD: number
  expensesNIO: number
  expectedCashNIO: number
  actualCashNIO: number
  differenceNIO: number
  notes?: string | null
  tasksCount?: number
  expensesList?: Array<{
    description: string
    amount: number
    currency: string
    movementType: string
  }>
  collectionsList?: Array<{
    code: string
    title: string
    amount: number
    currency: string
    paymentMethod: string
  }>
}

export interface DailyClosureReceiptData {
  branchName: string
  date: string
  closedBy?: string | null
  closedAt?: string | null
  notes?: string | null
  totalCouriers: number
  settledCouriers: number
  totalCollectionsNIO: number
  totalCollectionsUSD: number
  totalTransfersNIO: number
  totalTransfersUSD: number
  totalExpensesNIO: number
  totalFundsGivenNIO: number
  totalAlreadyReceivedNIO?: number
  totalCashInVaultNIO: number
  exchangeRate?: number | null
  workdays: Array<{
    courierName: string
    status: string
    initialCash: number
    collectionsNIO: number
    expensesNIO: number
    expectedCash: number
    actualCash: number
    difference: number
  }>
}

const CORPORATE_CSS = `
  @page {
    size: letter portrait;
    margin: 12mm 15mm;
  }
  * {
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  body {
    color: #0f172a;
    background: #ffffff;
    margin: 0;
    padding: 0;
    font-size: 11.5px;
    line-height: 1.4;
  }
  .receipt-container {
    width: 100%;
    max-width: 780px;
    margin: 0 auto;
    padding: 10px 0;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 12px;
    margin-bottom: 16px;
  }
  .brand-title {
    font-size: 20px;
    font-weight: 900;
    color: #0369a1;
    letter-spacing: -0.5px;
    margin: 0 0 2px 0;
    text-transform: uppercase;
  }
  .brand-subtitle {
    font-size: 10px;
    color: #64748b;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .receipt-meta {
    text-align: right;
  }
  .receipt-badge {
    display: inline-block;
    background: #e0f2fe;
    color: #0369a1;
    font-weight: 800;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid #bae6fd;
    margin-bottom: 4px;
    font-family: monospace;
  }
  .meta-text {
    font-size: 10px;
    color: #475569;
  }
  .grid-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  .info-item {
    display: flex;
    flex-direction: column;
  }
  .info-label {
    font-size: 9.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }
  .info-value {
    font-size: 12px;
    font-weight: 700;
    color: #0f172a;
  }
  .section-title {
    font-size: 12px;
    font-weight: 800;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin: 14px 0 6px 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #cbd5e1;
    margin-left: 8px;
  }
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 11px;
  }
  table.data-table th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 800;
    text-align: left;
    padding: 6px 10px;
    border-top: 1px solid #cbd5e1;
    border-bottom: 2px solid #cbd5e1;
    font-size: 10px;
    text-transform: uppercase;
  }
  table.data-table td {
    padding: 6px 10px;
    border-bottom: 1px solid #e2e8f0;
    color: #1e293b;
  }
  table.data-table tr:nth-child(even) {
    background: #fafafa;
  }
  .text-right {
    text-align: right;
  }
  .text-center {
    text-align: center;
  }
  .font-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  .balance-card {
    background: #f8fafc;
    border: 2px solid #0284c7;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 16px 0;
  }
  .balance-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 0;
    font-size: 11.5px;
  }
  .balance-row.total-expected {
    font-weight: 800;
    font-size: 13px;
    color: #0369a1;
    border-top: 1px dashed #cbd5e1;
    padding-top: 6px;
    margin-top: 4px;
  }
  .balance-row.total-actual {
    font-weight: 900;
    font-size: 14px;
    color: #0f172a;
    background: #e2e8f0;
    padding: 6px 10px;
    border-radius: 6px;
    margin-top: 6px;
  }
  .balance-row.diff {
    font-weight: 800;
    font-size: 12px;
    margin-top: 4px;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .diff-exact {
    background: #ecfdf5;
    color: #065f46;
  }
  .diff-shortage {
    background: #fef2f2;
    color: #991b1b;
  }
  .diff-surplus {
    background: #eff6ff;
    color: #1e40af;
  }
  .signatures {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 40px;
    margin-top: 40px;
    padding-top: 10px;
  }
  .signature-box {
    border-top: 1px solid #475569;
    text-align: center;
    padding-top: 8px;
  }
  .signature-title {
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
  }
  .signature-sub {
    font-size: 9.5px;
    color: #64748b;
  }
  .footer-legal {
    text-align: center;
    font-size: 9px;
    color: #94a3b8;
    margin-top: 30px;
    border-top: 1px solid #f1f5f9;
    padding-top: 8px;
  }
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .no-print {
      display: none !important;
    }
  }
`

/**
 * Generates and triggers the printable corporate settlement voucher
 */
export function printSettlementReceipt(data: SettlementReceiptData): void {
  const printWindow = window.open('', '_blank', 'width=850,height=900')
  if (!printWindow) {
    alert('Por favor permita ventanas emergentes para generar el comprobante en PDF.')
    return
  }

  const company = getStoredCompanyProfile()
  const shortId = data.settlementId ? data.settlementId.slice(0, 8).toUpperCase() : 'N/A'
  const isDiffExact = Math.abs(data.differenceNIO) < 0.01
  const isDiffShort = data.differenceNIO < -0.01
  const diffClass = isDiffExact ? 'diff-exact' : isDiffShort ? 'diff-shortage' : 'diff-surplus'
  const diffLabel = isDiffExact
    ? 'CUADRADO EXACTO'
    : isDiffShort
    ? `FALTANTE: C$ ${Math.abs(data.differenceNIO).toFixed(2)}`
    : `SOBRANTE: C$ ${data.differenceNIO.toFixed(2)}`

  const expensesRows =
    data.expensesList && data.expensesList.length > 0
      ? data.expensesList
          .map(
            (e) => `
        <tr>
          <td>${e.description}</td>
          <td><span style="font-size: 9px; font-weight: 700; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${e.movementType}</span></td>
          <td class="text-right font-mono font-bold">${e.currency === 'USD' ? '$' : 'C$'} ${e.amount.toFixed(2)}</td>
        </tr>
      `
          )
          .join('')
      : `<tr><td colspan="3" class="text-center" style="color: #94a3b8; font-style: italic;">Sin gastos operativos reportados</td></tr>`

  const collectionsRows =
    data.collectionsList && data.collectionsList.length > 0
      ? data.collectionsList
          .map(
            (c) => `
        <tr>
          <td class="font-mono font-bold" style="color: #0369a1;">${c.code}</td>
          <td>${c.title}</td>
          <td><span style="font-size: 9px; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">${c.paymentMethod}</span></td>
          <td class="text-right font-mono font-bold">${c.currency === 'USD' ? '$' : 'C$'} ${c.amount.toFixed(2)}</td>
        </tr>
      `
          )
          .join('')
      : ''

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Comprobante de Liquidación - ${shortId}</title>
        <style>${CORPORATE_CSS}</style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="header">
            <div>
              <div class="brand-title">${company.name.toUpperCase()}</div>
              <div class="brand-subtitle">${company.slogan}</div>
            </div>
            <div class="receipt-meta">
              <div class="receipt-badge">LIQ-${shortId}</div>
              <div class="meta-text">Fecha: <strong>${formatDate(data.settlementDate)}</strong></div>
              <div class="meta-text">Emisión: ${new Date().toLocaleTimeString('es-NI')}</div>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="grid-info">
            <div class="info-item">
              <span class="info-label">Motorizado / Conductor</span>
              <span class="info-value">👤 ${data.courierName}</span>
              ${data.courierPhone ? `<span style="font-size: 10px; color: #64748b;">Tel: ${data.courierPhone}</span>` : ''}
            </div>
            <div class="info-item">
              <span class="info-label">Sucursal Operativa</span>
              <span class="info-value">🏢 ${data.branchName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Estado de Liquidación</span>
              <span class="info-value" style="color: ${data.status === 'approved' ? '#059669' : '#d97706'}; text-transform: uppercase;">
                ● ${data.status === 'approved' ? 'Aprobada Formalmente' : data.status}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Auditado Por</span>
              <span class="info-value">${data.reviewerName ? `🛡️ ${data.reviewerName}` : 'Pendiente de auditor'}</span>
              ${data.reviewedAt ? `<span style="font-size: 10px; color: #64748b;">${new Date(data.reviewedAt).toLocaleString('es-NI')}</span>` : ''}
            </div>
          </div>

          <!-- Resumen Financiero Integrado -->
          <div class="section-title">Arqueo y Balance Financiero</div>
          <div class="balance-card">
            <div class="balance-row">
              <span>(+) Fondo Inicial de Cambio:</span>
              <span class="font-mono font-bold">C$ ${(data.initialCash || 0).toFixed(2)}</span>
            </div>
            <div class="balance-row">
              <span>(+) Recargas / Entregas de Fondos en Ruta:</span>
              <span class="font-mono font-bold">C$ ${(data.advances || 0).toFixed(2)}</span>
            </div>
            <div class="balance-row">
              <span>(+) Cobros Recibidos en Efectivo (Córdobas):</span>
              <span class="font-mono font-bold" style="color: #059669;">C$ ${(data.collectionsNIO || 0).toFixed(2)}</span>
            </div>
            ${
              data.collectionsUSD > 0
                ? `
            <div class="balance-row">
              <span>(+) Cobros Recibidos en Efectivo (Dólares):</span>
              <span class="font-mono font-bold" style="color: #059669;">$ ${(data.collectionsUSD || 0).toFixed(2)}</span>
            </div>`
                : ''
            }
            <div class="balance-row">
              <span>(-) Gastos Operativos y Combustible:</span>
              <span class="font-mono font-bold" style="color: #dc2626;">- C$ ${(data.expensesNIO || 0).toFixed(2)}</span>
            </div>
            <div class="balance-row total-expected">
              <span>(=) TOTAL EFECTIVO A ENTREGAR (ESPERADO):</span>
              <span class="font-mono">C$ ${(data.expectedCashNIO || 0).toFixed(2)}</span>
            </div>
            <div class="balance-row total-actual">
              <span>(=) EFECTIVO FÍSICO ENTREGADO EN CAJA:</span>
              <span class="font-mono">C$ ${(data.actualCashNIO || 0).toFixed(2)}</span>
            </div>
            <div class="balance-row diff ${diffClass}">
              <span>ESTADO DE CUADRE:</span>
              <span class="font-mono font-bold">${diffLabel}</span>
            </div>
          </div>

          <!-- Resumen de Transferencias Bancarias si existen -->
          ${
            data.transfersNIO > 0 || data.transfersUSD > 0
              ? `
          <div class="section-title">Transferencias Bancarias Recibidas</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th class="text-right">Monto Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.transfersNIO > 0 ? `<tr><td>Transferencias en Córdobas (Verificadas en Cuenta)</td><td class="text-right font-mono font-bold">C$ ${data.transfersNIO.toFixed(2)}</td></tr>` : ''}
              ${data.transfersUSD > 0 ? `<tr><td>Transferencias en Dólares (Verificadas en Cuenta)</td><td class="text-right font-mono font-bold">$ ${data.transfersUSD.toFixed(2)}</td></tr>` : ''}
            </tbody>
          </table>
          `
              : ''
          }

          <!-- Detalle de Gastos -->
          <div class="section-title">Detalle de Gastos Justificados</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Descripción del Gasto</th>
                <th>Tipo</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${expensesRows}
            </tbody>
          </table>

          <!-- Detalle de Tareas si existen -->
          ${
            collectionsRows
              ? `
          <div class="section-title">Detalle de Gestiones Realizadas</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Método</th>
                <th class="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              ${collectionsRows}
            </tbody>
          </table>
          `
              : ''
          }

          <!-- Observaciones -->
          ${
            data.notes
              ? `
          <div class="section-title">Observaciones y Notas</div>
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; margin-bottom: 16px;">
            ${data.notes}
          </div>`
              : ''
          }

          <!-- Firmas -->
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-title">${data.courierName}</div>
              <div class="signature-sub">Firma del Motorizado (Entregó Conforme)</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">${data.reviewerName || 'Administración / Caja'}</div>
              <div class="signature-sub">Firma y Sello (Recibió y Auditó Conforme)</div>
            </div>
          </div>

          <!-- Footer Legal -->
          <div class="footer-legal">
            Documento de control interno generado automáticamente por Bricklar Gestor el ${new Date().toLocaleDateString('es-NI')} a las ${new Date().toLocaleTimeString('es-NI')}. Válido como comprobante físico de auditoría.
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

/**
 * Generates and triggers the printable corporate Daily Closure report
 */
export function printDailyClosureReceipt(data: DailyClosureReceiptData): void {
  const printWindow = window.open('', '_blank', 'width=900,height=950')
  if (!printWindow) {
    alert('Por favor permita ventanas emergentes para generar el reporte de cierre.')
    return
  }

  const company = getStoredCompanyProfile()

  const workdaysRows = data.workdays
    .map(
      (w) => `
    <tr>
      <td class="font-bold">👤 ${w.courierName}</td>
      <td><span style="font-size: 9px; font-weight: 700; background: ${w.status === 'closed' ? '#ecfdf5' : '#fffbeb'}; color: ${w.status === 'closed' ? '#065f46' : '#92400e'}; padding: 2px 6px; border-radius: 4px;">${w.status === 'closed' ? 'CERRADA' : w.status}</span></td>
      <td class="text-right font-mono">C$ ${w.initialCash.toFixed(2)}</td>
      <td class="text-right font-mono font-bold" style="color: #059669;">C$ ${w.collectionsNIO.toFixed(2)}</td>
      <td class="text-right font-mono font-bold" style="color: #dc2626;">C$ ${w.expensesNIO.toFixed(2)}</td>
      <td class="text-right font-mono font-bold">C$ ${w.expectedCash.toFixed(2)}</td>
      <td class="text-right font-mono font-bold" style="color: #0369a1;">C$ ${w.actualCash.toFixed(2)}</td>
      <td class="text-right font-mono font-bold" style="color: ${Math.abs(w.difference) < 0.01 ? '#059669' : w.difference < 0 ? '#dc2626' : '#2563eb'};">
        ${Math.abs(w.difference) < 0.01 ? '0.00' : (w.difference > 0 ? '+' : '') + w.difference.toFixed(2)}
      </td>
    </tr>
  `
    )
    .join('')

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Cierre Diario Consolidado - ${data.branchName} - ${data.date}</title>
        <style>${CORPORATE_CSS}</style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="header">
            <div>
              <div class="brand-title">${company.name.toUpperCase()}</div>
              <div class="brand-subtitle">${company.slogan}</div>
            </div>
            <div class="receipt-meta">
              <div class="receipt-badge">CIERRE DIARIO</div>
              <div class="meta-text">Fecha Operativa: <strong>${formatDate(data.date)}</strong></div>
              <div class="meta-text">Generado: ${new Date().toLocaleString('es-NI')}</div>
            </div>
          </div>

          <!-- Metadata Grid -->
          <div class="grid-info">
            <div class="info-item">
              <span class="info-label">Sucursal</span>
              <span class="info-value">🏢 ${data.branchName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Cobertura de Motorizados</span>
              <span class="info-value">👥 ${data.settledCouriers} de ${data.totalCouriers} Liquidados (${Math.round((data.settledCouriers / (data.totalCouriers || 1)) * 100)}%)</span>
            </div>
            <div class="info-item">
              <span class="info-label">Responsable de Cierre</span>
              <span class="info-value">🛡️ ${data.closedBy || 'Administración'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Tipo de Cambio del Día</span>
              <span class="info-value">${data.exchangeRate ? `💵 $ 1.00 = C$ ${data.exchangeRate.toFixed(4)}` : 'Oficial'}</span>
            </div>
          </div>

          <!-- Consolidado Financiero en Bóveda / Caja -->
          <div class="section-title">Consolidado Financiero en Bóveda</div>
          <div class="balance-card">
            <div class="balance-row">
              <span>(+) Fondos Totales Entregados a Motorizados (C$):</span>
              <span class="font-mono font-bold">C$ ${(data.totalFundsGivenNIO || 0).toFixed(2)}</span>
            </div>
            <div class="balance-row">
              <span>(+) Recaudación Total en Efectivo (Córdobas):</span>
              <span class="font-mono font-bold" style="color: #059669;">C$ ${(data.totalCollectionsNIO || 0).toFixed(2)}</span>
            </div>
            ${
              data.totalCollectionsUSD > 0
                ? `
            <div class="balance-row">
              <span>(+) Recaudación Total en Efectivo (Dólares):</span>
              <span class="font-mono font-bold" style="color: #059669;">$ ${(data.totalCollectionsUSD || 0).toFixed(2)}</span>
            </div>`
                : ''
            }
            <div class="balance-row">
              <span>(-) Gastos y Combustible Justificados en Sucursal:</span>
              <span class="font-mono font-bold" style="color: #dc2626;">- C$ ${(data.totalExpensesNIO || 0).toFixed(2)}</span>
            </div>
            ${
              (data.totalAlreadyReceivedNIO || 0) > 0
                ? `
            <div class="balance-row">
              <span>(-) Entregas Previas / Parciales en Ventanilla:</span>
              <span class="font-mono font-bold" style="color: #9333ea;">- C$ ${(data.totalAlreadyReceivedNIO || 0).toFixed(2)}</span>
            </div>`
                : ''
            }
            <div class="balance-row">
              <span>(💳) Transferencias Bancarias Verificadas en Cuenta:</span>
              <span class="font-mono font-bold" style="color: #0284c7;">C$ ${(data.totalTransfersNIO || 0).toFixed(2)} ${data.totalTransfersUSD > 0 ? ` + $ ${data.totalTransfersUSD.toFixed(2)}` : ''}</span>
            </div>
            <div class="balance-row total-actual">
              <span>(=) EFECTIVO TOTAL RECAUDADO EN BÓVEDA / CAJA:</span>
              <span class="font-mono font-black" style="color: #0369a1;">C$ ${(data.totalCashInVaultNIO || 0).toFixed(2)}</span>
            </div>
          </div>

          <!-- Desglose por Motorizado -->
          <div class="section-title">Desglose Individual por Motorizado</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Motorizado</th>
                <th>Estado</th>
                <th class="text-right">Fondo</th>
                <th class="text-right">Cobros</th>
                <th class="text-right">Gastos</th>
                <th class="text-right">Esperado</th>
                <th class="text-right">Entregado</th>
                <th class="text-right">Dif.</th>
              </tr>
            </thead>
            <tbody>
              ${workdaysRows}
            </tbody>
          </table>

          <!-- Observaciones -->
          ${
            data.notes
              ? `
          <div class="section-title">Notas de Cierre</div>
          <div style="background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 8px 12px; font-size: 11px; color: #92400e; margin-bottom: 16px;">
            ${data.notes}
          </div>`
              : ''
          }

          <!-- Firmas -->
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-title">${data.closedBy || 'Administrador de Sucursal'}</div>
              <div class="signature-sub">Firma y Sello (Cajero / Admin Sucursal)</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">Gerencia General / Contabilidad</div>
              <div class="signature-sub">Firma de Recepción Contable</div>
            </div>
          </div>

          <!-- Footer Legal -->
          <div class="footer-legal">
            Cierre Diario oficial emitido por el sistema Bricklar Gestor el ${new Date().toLocaleDateString('es-NI')} a las ${new Date().toLocaleTimeString('es-NI')}. Archivo contable definitivo.
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

export interface ExecutiveDashboardReceiptData {
  branchName: string
  date: string
  generatedBy?: string | null
  totalTasks: number
  completedTasks: number
  completionRate: number
  inRouteTasks: number
  pendingTasks: number
  failedTasks: number
  activeCouriers: number
  totalCashNIO: number
  totalTransferNIO: number
  totalCollectionsUSD: number
  totalExpensesNIO: number
  netCashNIO: number
  courierRanking: Array<{
    name: string
    completed: number
    totalAssigned: number
    completionRate: number
    totalCollectedNIO: number
    status: string
  }>
}

export function generateExecutiveDashboardReceipt(data: ExecutiveDashboardReceiptData) {
  const printWindow = window.open('', '_blank', 'width=950,height=1100')
  if (!printWindow) {
    alert('Por favor, permite las ventanas emergentes para generar el informe ejecutivo.')
    return
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>Informe Ejecutivo - ${data.branchName} - ${data.date}</title>
        <style>
          ${CORPORATE_CSS}
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <!-- Membrete Corporativo -->
          <div class="receipt-header">
            <div class="brand">
              <div class="brand-logo">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div class="brand-info">
                <h1>BRICKLAR LOGÍSTICA</h1>
                <p>GESTIÓN DE ENTREGAS, FLOTA Y COBRANZAS</p>
              </div>
            </div>
            <div class="doc-meta">
              <div class="doc-badge">INFORME EJECUTIVO</div>
              <div class="doc-id">FECHA: ${data.date}</div>
              <div class="doc-date">SUCURSAL: ${data.branchName.toUpperCase()}</div>
            </div>
          </div>

          <!-- Métricas Clave de Eficiencia -->
          <div class="metrics-grid" style="grid-template-columns: repeat(4, 1fr);">
            <div class="metric-box highlight">
              <div class="metric-label">Efectividad de Entrega</div>
              <div class="metric-val">${data.completionRate.toFixed(1)}%</div>
              <div style="font-size: 10px; color: #166534; font-weight: 600; margin-top: 2px;">
                ${data.completedTasks} de ${data.totalTasks} tareas
              </div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Recaudación Total (C$)</div>
              <div class="metric-val" style="color: #0f172a;">C$ ${(data.totalCashNIO + data.totalTransferNIO).toFixed(2)}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                Efectivo: C$ ${data.totalCashNIO.toFixed(2)}
              </div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Recaudación ($ USD)</div>
              <div class="metric-val" style="color: #0284c7;">$ ${data.totalCollectionsUSD.toFixed(2)}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Cobros en dólares</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">Neto en Bóveda / Caja</div>
              <div class="metric-val" style="color: #0f172a;">C$ ${data.netCashNIO.toFixed(2)}</div>
              <div style="font-size: 10px; color: #e11d48; margin-top: 2px;">
                Gastos: -C$ ${data.totalExpensesNIO.toFixed(2)}
              </div>
            </div>
          </div>

          <!-- Resumen de Estados Operativos -->
          <div class="section-title">DESGLOSE DE OPERACIONES Y GESTIÓN</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Indicador Operativo</th>
                <th style="text-align: center;">Cantidad</th>
                <th style="text-align: right;">% Sobre Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Entregas / Gestiones Completadas con Éxito</strong></td>
                <td style="text-align: center;"><span class="badge badge-success">${data.completedTasks}</span></td>
                <td style="text-align: right; font-weight: 700;">${data.totalTasks > 0 ? ((data.completedTasks / data.totalTasks) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>Tareas en Tránsito / En Gestión de Ruta</td>
                <td style="text-align: center;"><span class="badge" style="background:#e0f2fe; color:#0369a1;">${data.inRouteTasks}</span></td>
                <td style="text-align: right;">${data.totalTasks > 0 ? ((data.inRouteTasks / data.totalTasks) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>Tareas Pendientes de Asignación / Despacho</td>
                <td style="text-align: center;"><span class="badge badge-warning">${data.pendingTasks}</span></td>
                <td style="text-align: right;">${data.totalTasks > 0 ? ((data.pendingTasks / data.totalTasks) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>Tareas No Completadas / Canceladas / Incidencias</td>
                <td style="text-align: center;"><span class="badge badge-danger">${data.failedTasks}</span></td>
                <td style="text-align: right; color: #e11d48;">${data.totalTasks > 0 ? ((data.failedTasks / data.totalTasks) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </table>

          <!-- Ranking de Rendimiento de Motorizados -->
          <div class="section-title">TABLA DE RENDIMIENTO Y PRODUCTIVIDAD DE MOTORIZADOS</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th>Motorizado / Repartidor</th>
                <th style="text-align: center;">Completadas</th>
                <th style="text-align: center;">Tasa Éxito</th>
                <th style="text-align: right;">Recaudado (C$)</th>
                <th style="text-align: center;">Estado Jornada</th>
              </tr>
            </thead>
            <tbody>
              ${
                data.courierRanking.length === 0
                  ? `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">No se registraron jornadas o entregas para esta fecha.</td></tr>`
                  : data.courierRanking
                      .map(
                        (c, idx) => `
                    <tr>
                      <td style="text-align: center; font-weight: 700; color: ${idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#b45309' : '#94a3b8'};">
                        ${idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : (idx + 1).toString()}
                      </td>
                      <td><strong>${c.name}</strong></td>
                      <td style="text-align: center; font-weight: 600;">${c.completed} / ${c.totalAssigned}</td>
                      <td style="text-align: center;">
                        <span class="badge ${c.completionRate >= 90 ? 'badge-success' : c.completionRate >= 70 ? 'badge-warning' : 'badge-danger'}">
                          ${c.completionRate.toFixed(0)}%
                        </span>
                      </td>
                      <td style="text-align: right; font-weight: 700; font-family: monospace;">C$ ${c.totalCollectedNIO.toFixed(2)}</td>
                      <td style="text-align: center;">
                        <span class="badge ${c.status === 'open' ? 'badge-warning' : 'badge-success'}">
                          ${c.status === 'open' ? 'En Ruta' : 'Cerrada'}
                        </span>
                      </td>
                    </tr>
                  `
                      )
                      .join('')
              }
            </tbody>
          </table>

          <!-- Firmas Oficiales -->
          <div class="signatures">
            <div class="signature-box">
              <div class="signature-title">${data.generatedBy || 'Supervisor de Operaciones'}</div>
              <div class="signature-sub">Firma de Emisión Operativa</div>
            </div>
            <div class="signature-box">
              <div class="signature-title">Gerencia General / Dirección</div>
              <div class="signature-sub">Firma y Visto Bueno Ejecutivo</div>
            </div>
          </div>

          <!-- Footer Legal -->
          <div class="footer-legal">
            Informe Ejecutivo de Rendimiento generado automáticamente por Bricklar Gestor el ${new Date().toLocaleDateString('es-NI')} a las ${new Date().toLocaleTimeString('es-NI')}. Documento corporativo de auditoría.
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}

