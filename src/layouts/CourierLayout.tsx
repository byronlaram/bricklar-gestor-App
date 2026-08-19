import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/shared/lib/supabaseClient'
import { useAuth } from '@/modules/auth/useAuth'
import { useTasksRealtime } from '@/modules/tasks/hooks/useTasksRealtime'
import { Avatar, ConfirmDialog, useToast } from '@/shared/components/ui'
import { cn } from '@/shared/utils/cn'
import {
  Home,
  ClipboardList,
  Banknote,
  Calculator,
  Bus,
  Bell,
  LogOut,
} from 'lucide-react'

// ─── Navegación inferior móvil (motorizado - SaaS Premium) ──────────────────

const NAV_ITEMS = [
  { to: '/motorizado', label: 'Inicio', icon: Home, exact: true },
  { to: '/motorizado/tareas', label: 'Mis Tareas', icon: ClipboardList },
  { to: '/motorizado/fondos', label: 'Fondos', icon: Banknote },
  { to: '/motorizado/liquidacion', label: 'Liquidación', icon: Calculator },
  { to: '/motorizado/buses', label: 'Buses', icon: Bus },
]

export default function CourierLayout() {
  useTasksRealtime()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()

  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Consulta en tiempo real de notificaciones no leídas
  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('id, read_at')
        .eq('user_id', profile.id)
        .is('read_at', null)
        .limit(50)

      if (error) {
        return []
      }
      return data ?? []
    },
    enabled: !!profile?.id,
    refetchInterval: 1000 * 30,
  })

  const unreadCount = unreadNotifications.length

  // Cierre de menú al hacer clic fuera o presionar Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUserMenuOpen])

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      setIsLogoutConfirmOpen(false)
      setIsUserMenuOpen(false)
      navigate('/login', { replace: true })
    } catch (err: any) {
      console.error('Error al cerrar sesión:', err)
      toast.error(err?.message || 'Error al cerrar sesión. Inténtalo de nuevo.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#003875] via-[#004594] to-[#071D3A] text-slate-900 selection:bg-blue-100 selection:text-[#004594]">
      {/* Top bar móvil sobre el fondo azul corporativo (Estilo Banpro) */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between px-4 sm:px-6 bg-[#003875]/95 backdrop-blur-md border-b border-white/10 shadow-xs">
        <div className="flex items-center gap-3">
          {/* Botón de Menú lateral en Tarjeta Blanca Translúcida */}
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 shadow-2xs flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer backdrop-blur-xs"
            aria-label="Abrir menú de usuario"
          >
            <div className="flex flex-col gap-1 w-4">
              <span className="h-0.5 w-full bg-white rounded-full" />
              <span className="h-0.5 w-3/4 bg-white rounded-full" />
              <span className="h-0.5 w-full bg-white rounded-full" />
            </div>
          </button>

          <div>
            <span className="text-base font-black text-white tracking-tight leading-tight block">
              Bricklar GestorApp
            </span>
            <span className="text-[10px] font-semibold text-blue-200/90 leading-none block">
              Gestor de Tareas
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Campana de Notificaciones con Badge numérico */}
          <NavLink
            to="/motorizado/notificaciones"
            className="relative w-10 h-10 rounded-2xl bg-white/15 border border-white/20 shadow-2xs flex items-center justify-center text-white hover:bg-white/25 transition cursor-pointer backdrop-blur-xs"
            aria-label="Notificaciones"
          >
            <Bell size={18} className="text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-scale-in">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>

          {/* Menú de Perfil con Avatar */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={isUserMenuOpen}
              className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-white/40 transition cursor-pointer"
            >
              <Avatar name={profile?.full_name ?? 'Motorizado'} size="md" src={profile?.avatar_url} />
            </button>

            {/* Dropdown flotante */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200/90 shadow-2xl py-2 z-50 animate-fade-in text-slate-800"
                role="menu"
                aria-orientation="vertical"
              >
                <div className="px-4 py-2.5 border-b border-slate-100 space-y-0.5">
                  <p className="text-xs font-bold text-[#004594] truncate">{profile?.display_name || profile?.full_name}</p>
                  <p className="text-2xs text-slate-400 truncate">{profile?.email}</p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      navigate('/motorizado')
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#004594] transition cursor-pointer"
                  >
                    <Home size={16} className="text-[#004594]" />
                    Inicio / Resumen
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      navigate('/motorizado/tareas')
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-[#004594] transition cursor-pointer"
                  >
                    <ClipboardList size={16} className="text-[#004594]" />
                    Mis Tareas
                  </button>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      setIsLogoutConfirmOpen(true)
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                  >
                    <LogOut size={16} className="text-slate-400" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contenedor Principal Blanco Flotante (Estilo Tarjeta de App Móvil Banpro) */}
      <main className="flex-1 pb-24 overflow-y-auto pt-2 px-2 sm:px-4" id="main-content">
        <div className="max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 space-y-6 min-h-[calc(100vh-6rem)] border border-slate-100">
          <Outlet />
        </div>
      </main>

      {/* Menú Inferior Móvil Blanco Limpio con Sombras */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around border-t border-slate-200/80 bg-white/95 pb-safe shadow-xl px-2 backdrop-blur-md"
        aria-label="Navegación principal del motorizado"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              className={({ isActive }: { isActive: boolean }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 py-1 text-center transition-all min-h-[48px]',
                  isActive ? 'text-[#004594] font-extrabold' : 'text-slate-400 hover:text-slate-600'
                )
              }
              aria-label={item.label}
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'p-1 rounded-xl transition-all duration-200 flex items-center justify-center',
                    isActive ? 'text-[#004594] scale-110 bg-[#004594]/10' : 'text-slate-400'
                  )}>
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className={cn(
                    'text-[10px] leading-none tracking-tight',
                    isActive ? 'text-[#004594] font-extrabold' : 'text-slate-400 font-medium'
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* ConfirmDialog de Cierre de Sesión para el Motorizado */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        title="¿Deseas cerrar tu sesión?"
        description="Saldrás de la aplicación del motorizado. Recuerda haber finalizado tus entregas del turno."
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        variant="primary"
        isLoading={isLoggingOut}
      />
    </div>
  )
}
