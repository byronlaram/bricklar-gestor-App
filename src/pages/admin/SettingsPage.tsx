import { useSearchParams } from 'react-router-dom'
import { SettingsNavigation, type SettingsTabId } from './settings/SettingsNavigation'
import { CompanySettingsTab } from './settings/CompanySettingsTab'
import { OperationSettingsTab } from './settings/OperationSettingsTab'
import { ExchangeRateSettingsTab } from './settings/ExchangeRateSettingsTab'
import { ProfileSettingsTab } from './settings/ProfileSettingsTab'
import { SecuritySettingsTab } from './settings/SecuritySettingsTab'

const VALID_TABS: SettingsTabId[] = ['empresa', 'operacion', 'tipo-cambio', 'perfil', 'seguridad']

export default function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawTab = searchParams.get('tab') as SettingsTabId | null
  const activeTab: SettingsTabId = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'empresa'

  const handleTabChange = (newTab: SettingsTabId) => {
    setSearchParams({ tab: newTab }, { replace: true })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configuración</h1>
        <p className="text-xs sm:text-sm text-foreground-muted mt-0.5">
          Administra las preferencias de la empresa, tipos de cambio, operación y tu cuenta.
        </p>
      </div>

      {/* Tabs Navigation */}
      <SettingsNavigation activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab Content */}
      <div className="pt-2 animate-fade-in">
        {activeTab === 'empresa' && <CompanySettingsTab />}
        {activeTab === 'operacion' && <OperationSettingsTab />}
        {activeTab === 'tipo-cambio' && <ExchangeRateSettingsTab />}
        {activeTab === 'perfil' && <ProfileSettingsTab />}
        {activeTab === 'seguridad' && <SecuritySettingsTab />}
      </div>
    </div>
  )
}
