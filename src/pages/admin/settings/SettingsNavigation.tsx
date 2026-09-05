import { Building2, Gauge, User, ShieldCheck, TrendingUp, Sliders } from 'lucide-react'

export type SettingsTabId = 'empresa' | 'operacion' | 'gestiones' | 'tipo-cambio' | 'perfil' | 'seguridad'

interface SettingsTab {
  id: SettingsTabId
  label: string
  icon: React.ReactNode
}

const TABS: SettingsTab[] = [
  { id: 'empresa', label: 'Empresa', icon: <Building2 className="h-4 w-4" /> },
  { id: 'operacion', label: 'Operación', icon: <Gauge className="h-4 w-4" /> },
  { id: 'gestiones', label: 'Tipos de Gestión', icon: <Sliders className="h-4 w-4" /> },
  { id: 'tipo-cambio', label: 'Tipo de Cambio', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'perfil', label: 'Mi Perfil', icon: <User className="h-4 w-4" /> },
  { id: 'seguridad', label: 'Seguridad', icon: <ShieldCheck className="h-4 w-4" /> },
]

interface SettingsNavigationProps {
  activeTab: SettingsTabId
  onTabChange: (tabId: SettingsTabId) => void
}

export function SettingsNavigation({ activeTab, onTabChange }: SettingsNavigationProps) {
  return (
    <div className="border-b border-border overflow-x-auto no-scrollbar scroll-smooth">
      <nav className="flex space-x-1 sm:space-x-2 min-w-max pb-px" aria-label="Pestañas de configuración">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium border-b-2 transition-all cursor-pointer rounded-t-lg select-none
                ${
                  isActive
                    ? 'border-primary text-primary bg-primary/5 font-semibold'
                    : 'border-transparent text-foreground-muted hover:text-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={isActive ? 'text-primary' : 'text-foreground-subtle'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
