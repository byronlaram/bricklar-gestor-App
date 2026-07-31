import { useState, type ReactNode } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/modules/auth/AuthContext'
import { cn } from '@/shared/utils/cn'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  Briefcase,
  Receipt,
  BarChart3,
  BookOpen,
  Shield,
  Settings,
  Wrench,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Bus,
} from 'lucide-react'

// ─── Navegación ────────────────────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles: ('general_admin' | 'junior_admin')[]
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['general_admin', 'junior_admin'], exact: true },
  { to: '/admin/tareas', label: 'Tareas', icon: <ClipboardList size={18} />, roles: ['general_admin', 'junior_admin'] },
  { to: '/admin/jornadas', label: 'Jornadas y Fondos', icon: <Briefcase size={18} />, roles: ['general_admin', 'junior_admin'] },
  { to: '/admin/liquidaciones', label: 'Liquidaciones', icon: <Receipt size={18} />, roles: ['general_admin', 'junior_admin'] },
  { to: '/admin/cierre-diario', label: 'Cierre Diario', icon: <BookOpen size={18} />, roles: ['general_admin', 'junior_admin'] },
  { to: '/admin/buses', label: 'Directorio de Buses', icon: <Bus size={18} />, roles: ['general_admin', 'junior_admin'] },
  { to: '/admin/reportes', label: 'Reportes', icon: <BarChart3 size={18} />, roles: ['general_admin', 'junior_admin'] },
  { to: '/admin/usuarios', label: 'Usuarios', icon: <Users size={18} />, roles: ['general_admin'] },
  { to: '/admin/sucursales', label: 'Sucursales', icon: <Building2 size={18} />, roles: ['general_admin'] },
  { to: '/admin/auditoria', label: 'Auditoría', icon: <Shield size={18} />, roles: ['general_admin'] },
  { to: '/admin/configuracion', label: 'Configuración', icon: <Settings size={18} />, roles: ['general_admin', 'junior_admin'] },
  { to: '/admin/mantenimiento', label: 'Mantenimiento', icon: <Wrench size={18} />, roles: ['general_admin'] },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  const allowedItems = NAV_ITEMS.filter(
    (item) => role && item.roles.includes(role as 'general_admin' | 'junior_admin')
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-primary-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col',
          'bg-primary-700 text-white shadow-xl',
          'transition-transform duration-300 ease-out',
          'lg:relative lg:translate-x-0 lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navegación principal"
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-primary-600/50 px-4">
          <Link to="/admin" onClick={onClose} className="flex items-center gap-2.5 hover:opacity-90 transition cursor-pointer">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent shadow-inner-glow">
              <span className="text-sm font-bold text-white">GO</span>
            </div>
            <div>
              <p className="text-sm font-semibold leading-none">GestorOps</p>
              <p className="text-2xs text-primary-300">Panel Admin</p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-primary-300 hover:bg-primary-600 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2" aria-label="Menú de administración">
          <ul className="space-y-0.5">
            {allowedItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.exact}
                  onClick={() => onClose()}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
                      isActive
                        ? 'bg-accent text-white shadow-sm'
                        : 'text-primary-200 hover:bg-primary-600/60 hover:text-white'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-white' : 'text-primary-400'}>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight size={14} className="text-white/60" />}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User section */}
        <div className="border-t border-primary-600/50 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-md bg-primary-800/50 px-3 py-2">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
              {profile?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{profile?.full_name}</p>
              <p className="truncate text-2xs text-primary-400">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary-300 transition-colors hover:bg-primary-600/60 hover:text-white"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}

// ─── Admin Layout ─────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-border bg-surface px-4 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-foreground-muted hover:bg-surface-hover hover:text-foreground lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          {/* Notificaciones / Auditoría */}
          <button
            onClick={() => navigate('/admin/auditoria')}
            className="relative rounded-full p-2 text-foreground-muted hover:bg-surface-hover hover:text-foreground cursor-pointer transition"
            aria-label="Notificaciones y auditoría"
            title="Log de Auditoría y Notificaciones"
          >
            <Bell size={20} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
