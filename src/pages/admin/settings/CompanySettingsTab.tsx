import { Building2, Sparkles } from 'lucide-react'

export function CompanySettingsTab() {
  return (
    <div className="bg-card border border-border rounded-2xl p-8 shadow-xs text-center space-y-4 max-w-2xl">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
        <Building2 className="h-6 w-6" />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-foreground">
            Configuración de la empresa
          </h2>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Próximamente
          </span>
        </div>
        <p className="text-xs sm:text-sm text-foreground-muted max-w-md mx-auto leading-relaxed">
          Las preferencias generales de la empresa se administrarán desde esta sección.
        </p>
      </div>
    </div>
  )
}
