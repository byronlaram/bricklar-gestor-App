import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { cn } from '@/shared/utils/cn'
import {
  Home,
  ClipboardList,
  MapPin,
  Banknote,
  Calculator,
  Bus,
  Bell,
  LogOut,
} from 'lucide-react'

// ─── Navegación inferior móvil (motorizado) ───────────────────────────────────

const NAV_ITEMS = [
  { to: '/motorizado', label: 'Inicio', icon: Home, exact: true },
  { to: '/motorizado/tareas', label: 'Mis Tareas', icon: ClipboardList },
  { to: '/motorizado/ruta', label: 'Mi Ruta', icon: MapPin },
  { to: '/motorizado/fondos', label: 'Fondos', icon: Banknote },
  { to: '/motorizado/liquidacion', label: 'Liquidación', icon: Calculator },
]

const MORE_ITEMS = [
  { to: '/motorizado/buses', label: 'Buses', icon: Bus },
  { to: '/motorizado/notificaciones', label: 'Alertas', icon: Bell },
]

export default function CourierLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar móvil */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur-sm shadow-sm">
        <Link to="/motorizado" className="flex items-center gap-2 hover:opacity-90 transition cursor-pointer">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-700 shadow-sm">
            <span className="text-xs font-bold text-white">GO</span>
          </div>
          <span className="text-sm font-semibold text-foreground">GestorOps</span>
        </Link>
        <div className="flex-1" />
        <NavLink
          to="/motorizado/notificaciones"
          className="relative rounded-full p-2 text-foreground-muted hover:bg-surface-hover"
          aria-label="Notificaciones"
        >
          <Bell size={18} />
        </NavLink>
        {/* Info del motorizado */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm font-medium text-foreground">{profile?.display_name ?? profile?.full_name}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-md p-2 text-foreground-muted hover:bg-surface-hover hover:text-foreground"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>

      {/* Contenido de la página */}
      <main className="flex-1 mb-nav overflow-y-auto" id="main-content">
        <Outlet />
      </main>

      {/* Barra de navegación inferior (mobile-first) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex h-16 items-center border-t border-border bg-surface/95 pb-safe backdrop-blur-sm shadow-[0_-1px_8px_0_hsl(222_20%_0%/0.08)]"
        aria-label="Navegación principal del motorizado"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-center touch-target transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-foreground-muted hover:text-foreground'
                )
              }
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? 'text-accent' : ''}
                  />
                  <span className={cn(
                    'text-[10px] font-medium leading-none',
                    isActive ? 'text-accent' : 'text-foreground-muted'
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}

        {/* Buses — ítem extra compacto */}
        {MORE_ITEMS.slice(0, 1).map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-center touch-target transition-colors',
                  isActive
                    ? 'text-accent'
                    : 'text-foreground-muted hover:text-foreground'
                )
              }
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} className={isActive ? 'text-accent' : ''} />
                  <span className={cn('text-[10px] font-medium leading-none', isActive ? 'text-accent' : 'text-foreground-muted')}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
