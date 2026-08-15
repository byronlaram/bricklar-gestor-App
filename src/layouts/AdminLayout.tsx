import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/modules/auth/useAuth'
import { useTasksRealtime } from '@/modules/tasks/hooks/useTasksRealtime'
import { Avatar, Button, ConfirmDialog, useToast } from '@/shared/components/ui'
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
  ChevronDown,
  Bell,
  Bus,
  UserCheck,
} from 'lucide-react'

// ─── Estructura de Navegación Organizada por Secciones ─────────────────────────

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  roles: ('general_admin' | 'junior_admin')[]
  exact?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operaciones',
    items: [
      { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['general_admin', 'junior_admin'], exact: true },
      { to: '/admin/tareas', label: 'Tareas', icon: <ClipboardList size={18} />, roles: ['general_admin', 'junior_admin'] },
      { to: '/admin/jornadas', label: 'Jornadas y Fondos', icon: <Briefcase size={18} />, roles: ['general_admin', 'junior_admin'] },
      { to: '/admin/liquidaciones', label: 'Liquidaciones', icon: <Receipt size={18} />, roles: ['general_admin', 'junior_admin'] },
      { to: '/admin/cierre-diario', label: 'Cierre Diario', icon: <BookOpen size={18} />, roles: ['general_admin', 'junior_admin'] },
    ],
  },
  {
    title: 'Servicios',
    items: [
      { to: '/admin/buses', label: 'Directorio de Buses', icon: <Bus size={18} />, roles: ['general_admin', 'junior_admin'] },
      { to: '/admin/reportes', label: 'Reportes', icon: <BarChart3 size={18} />, roles: ['general_admin', 'junior_admin'] },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/admin/usuarios', label: 'Usuarios', icon: <Users size={18} />, roles: ['general_admin'] },
      { to: '/admin/sucursales', label: 'Sucursales', icon: <Building2 size={18} />, roles: ['general_admin'] },
      { to: '/admin/auditoria', label: 'Auditoría', icon: <Shield size={18} />, roles: ['general_admin'] },
      { to: '/admin/configuracion', label: 'Configuración', icon: <Settings size={18} />, roles: ['general_admin', 'junior_admin'] },
      { to: '/admin/mantenimiento', label: 'Mantenimiento', icon: <Wrench size={18} />, roles: ['general_admin'] },
    ],
  },
]

// Map para breadcrumbs dinámicos
const ROUTE_NAME_MAP: Record<string, string> = {
  admin: 'Dashboard',
  tareas: 'Gestión de Tareas',
  jornadas: 'Jornadas y Fondos',
  liquidaciones: 'Liquidaciones',
  'cierre-diario': 'Cierre Diario',
  buses: 'Directorio de Buses',
  reportes: 'Reportes Ejecutivos',
  usuarios: 'Gestión de Usuarios',
  sucursales: 'Sucursales de Operación',
  auditoria: 'Log de Auditoría',
  configuracion: 'Configuración',
  mantenimiento: 'Mantenimiento de Sistema',
}

// ─── Componente Sidebar ────────────────────────────────────────────────────────

function Sidebar({
  isOpen,
  onClose,
  onOpenLogoutConfirm,
}: {
  isOpen: boolean
  onClose: () => void
  onOpenLogoutConfirm: () => void
}) {
  const { profile, role } = useAuth()

  return (
    <>
      {/* Overlay Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Principal */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between',
          'bg-primary text-white border-r border-slate-800 shadow-xl',
          'transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navegación principal de administración"
      >
        <div>
          {/* Header Marca / Logo — Franja Blanca para contraste */}
          <div className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-xs">
            <Link
              to="/admin"
              onClick={onClose}
              className="flex items-center gap-3 hover:opacity-95 transition cursor-pointer"
            >
              <img
                src="/branding/bricklar-icon.svg"
                alt="Bricklar"
                className="h-9 w-9 rounded-xl shadow-xs shrink-0"
              />
              <div>
                <p className="text-sm font-bold leading-none text-primary tracking-tight">Bricklar Gestor</p>
                <p className="text-2xs text-slate-500 font-medium mt-0.5">Panel Administrativo</p>
              </div>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden transition-colors cursor-pointer"
              aria-label="Cerrar menú"
            >
              <X size={18} />
            </button>
          </div>

          {/* Menú por Secciones */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 max-h-[calc(100vh-140px)] no-scrollbar">
            {NAV_SECTIONS.map((section) => {
              const allowedItems = section.items.filter(
                (item) => role && item.roles.includes(role as 'general_admin' | 'junior_admin')
              )
              if (allowedItems.length === 0) return null

              return (
                <div key={section.title} className="space-y-1">
                  <span className="px-3 text-2xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                    {section.title}
                  </span>
                  <ul className="space-y-0.5">
                    {allowedItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          to={item.to}
                          end={item.exact}
                          onClick={() => onClose()}
                          className={({ isActive }: { isActive: boolean }) =>
                            cn(
                              'flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150',
                              isActive
                                ? 'bg-accent text-white shadow-xs'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                            )
                          }
                        >
                          {({ isActive }: { isActive: boolean }) => (
                            <>
                              <span className={isActive ? 'text-white' : 'text-slate-400 shrink-0'}>
                                {item.icon}
                              </span>
                              <span className="flex-1 truncate">{item.label}</span>
                              {isActive && <ChevronRight size={14} className="text-white/70 shrink-0" />}
                            </>
                          )}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </nav>
        </div>

        {/* Footer Perfil Usuario */}
        <div className="border-t border-slate-800 p-3 space-y-2 bg-slate-950/40">
          <div className="flex items-center gap-2.5 rounded-lg bg-slate-900/80 px-3 py-2 border border-slate-800/80">
            <Avatar name={profile?.full_name ?? 'Administrador'} size="sm" src={profile?.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{profile?.full_name ?? 'Administrador'}</p>
              <p className="truncate text-2xs text-slate-400">{profile?.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-slate-300 hover:bg-white/10 hover:text-white text-xs h-9"
            leftIcon={<LogOut size={16} />}
            onClick={() => {
              onClose()
              onOpenLogoutConfirm()
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>
    </>
  )
}

// ─── Componente Principal AdminLayout (App Shell Definitivo) ───────────────────

export default function AdminLayout() {
  useTasksRealtime()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const toast = useToast()

  // Generación dinámica de Breadcrumb
  const pathSegments = location.pathname.split('/').filter(Boolean)
  const currentSegment = pathSegments[pathSegments.length - 1] ?? 'admin'
  const pageTitle = ROUTE_NAME_MAP[currentSegment] ?? 'Panel de Control'

  // Manejador de cierre al hacer clic fuera del dropdown o al presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUserMenuOpen(false)
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [userMenuOpen])

  // Ejecución segura de Logout
  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      setLogoutConfirmOpen(false)
      setUserMenuOpen(false)
      navigate('/login', { replace: true })
    } catch (err: any) {
      console.error('Error al cerrar sesión:', err)
      toast.error(err?.message || 'Error al cerrar sesión. Inténtalo de nuevo.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 selection:bg-accent selection:text-white">
      {/* Sidebar Navegación */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenLogoutConfirm={() => setLogoutConfirmOpen(true)}
      />

      {/* Ámbito Principal del App Shell */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Definitivo */}
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-2xs z-20">
          <div className="flex items-center gap-3">
            {/* Botón Toggle Mobile */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-slate-600 hover:text-slate-900"
              aria-label="Abrir menú de navegación"
            >
              <Menu size={20} />
            </Button>

            {/* Breadcrumb & Titular de Página */}
            <div>
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider">
                <Link to="/admin" className="hover:text-accent transition-colors">Bricklar</Link>
                <ChevronRight size={12} className="text-slate-300" />
                <span className="text-slate-600">{pageTitle}</span>
              </div>
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Área Derecha Header: Notificaciones + User Dropdown en Topbar */}
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              onClick={() => navigate('/admin/auditoria')}
              className="relative text-slate-600 hover:text-primary rounded-lg border-slate-200"
              aria-label="Auditoría y notificaciones"
              title="Notificaciones y Registro de Auditoría"
            >
              <Bell size={18} />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent animate-pulse" />
            </Button>

            {/* User Profile Dropdown en Escritorio/Topbar */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                aria-label="Menú de perfil de usuario"
                className="flex items-center gap-2.5 pl-2 border-l border-slate-200 rounded-lg p-1.5 hover:bg-slate-50 transition cursor-pointer"
              >
                <Avatar name={profile?.full_name ?? 'Admin'} size="sm" src={profile?.avatar_url} />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-900 leading-tight">{profile?.full_name ?? 'Administrador'}</p>
                  <p className="text-2xs text-slate-400 font-medium capitalize">{profile?.role?.replace('_', ' ') ?? 'General Admin'}</p>
                </div>
                <ChevronDown size={14} className={cn('text-slate-400 transition-transform duration-200', userMenuOpen ? 'rotate-180' : '')} />
              </button>

              {/* Menú Desplegable (Dropdown) */}
              {userMenuOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-fade-in"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="px-4 py-2.5 border-b border-slate-100 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name ?? 'Administrador'}</p>
                    <p className="text-2xs text-slate-400 truncate">{profile?.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 text-2xs font-semibold text-accent bg-sky-50 border border-sky-100 rounded-full capitalize">
                      {profile?.role?.replace('_', ' ') ?? 'Administrador'}
                    </span>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false)
                        navigate('/admin/configuracion')
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                    >
                      <Settings size={15} className="text-slate-400" />
                      Configuración de cuenta
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false)
                        navigate('/admin/auditoria')
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                    >
                      <UserCheck size={15} className="text-slate-400" />
                      Log de Actividad / Auditoría
                    </button>
                  </div>

                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false)
                        setLogoutConfirmOpen(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition cursor-pointer"
                    >
                      <LogOut size={15} className="text-slate-400" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Área Principal de Contenido Uniforme */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50" id="main-content">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ConfirmDialog de Cierre de Sesión para Administración */}
      <ConfirmDialog
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        title="¿Deseas cerrar tu sesión?"
        description="Saldrás del panel administrativo de Bricklar Gestor. Para volver a ingresar deberás autenticarte de nuevo."
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        variant="primary"
        isLoading={isLoggingOut}
      />
    </div>
  )
}
