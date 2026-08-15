import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { RouteGuard, PublicOnlyGuard } from '@/modules/auth/RouteGuard'
import { Loader2 } from 'lucide-react'

// ─── Lazy imports ────────────────────────────────────────────────────────────────
// Auth
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RecoverPasswordPage = lazy(() => import('@/pages/auth/RecoverPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))
const SuspendedPage = lazy(() => import('@/pages/auth/SuspendedPage'))

// Admin
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const AdminDashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const AdminTasksPage = lazy(() => import('@/pages/admin/TasksPage'))
const AdminTaskDetailPage = lazy(() => import('@/pages/admin/TaskDetailPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const AdminBranchesPage = lazy(() => import('@/pages/admin/BranchesPage'))
const AdminWorkdaysPage = lazy(() => import('@/pages/admin/WorkdaysPage'))
const AdminSettlementsPage = lazy(() => import('@/pages/admin/SettlementsPage'))
const AdminDailyClosurePage = lazy(() => import('@/pages/admin/DailyClosurePage'))
const AdminBusDirectoryPage = lazy(() => import('@/pages/admin/BusDirectoryPage'))
const AdminReportsPage = lazy(() => import('@/pages/admin/ReportsPage'))
const AdminAuditPage = lazy(() => import('@/pages/admin/AuditPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/SettingsPage'))
const AdminMaintenancePage = lazy(() => import('@/pages/admin/MaintenancePage'))

// Motorizado
const CourierLayout = lazy(() => import('@/layouts/CourierLayout'))
const CourierHomePage = lazy(() => import('@/pages/courier/HomePage'))
const CourierTasksPage = lazy(() => import('@/pages/courier/TasksPage'))
const CourierTaskDetailPage = lazy(() => import('@/pages/courier/TaskDetailPage'))
const CourierRoutePage = lazy(() => import('@/pages/courier/RoutePage'))
const CourierFundsPage = lazy(() => import('@/pages/courier/FundsPage'))
const CourierSettlementPage = lazy(() => import('@/pages/courier/SettlementPage'))
const CourierBusesPage = lazy(() => import('@/pages/courier/BusesPage'))
const CourierNotificationsPage = lazy(() => import('@/pages/courier/NotificationsPage'))

// Dev / Catálogo (Solo Desarrollo)
import { ToastProvider } from '@/shared/components/ui'
const UiKitCatalogPage = import.meta.env.DEV
  ? lazy(() => import('@/pages/dev/UiKitCatalogPage'))
  : null


// ─── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
        <p className="text-sm text-foreground-muted">Cargando…</p>
      </div>
    </div>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────
export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Raíz — redirige según sesión (manejado por guards) */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* ── Rutas públicas (solo sin sesión) ────────────────────────── */}
          <Route
            path="/login"
            element={
              <PublicOnlyGuard>
                <LoginPage />
              </PublicOnlyGuard>
            }
          />
          <Route
            path="/recuperar-contrasena"
            element={
              <PublicOnlyGuard>
                <RecoverPasswordPage />
              </PublicOnlyGuard>
            }
          />
          <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
          <Route path="/cuenta-suspendida" element={<SuspendedPage />} />

          {/* ── Panel Administrador ──────────────────────────────────────── */}
          <Route
            path="/admin"
            element={
              <RouteGuard allowedRoles={['general_admin', 'junior_admin']}>
                <AdminLayout />
              </RouteGuard>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="tareas" element={<AdminTasksPage />} />
            <Route path="tareas/:id" element={<AdminTaskDetailPage />} />
            <Route path="usuarios" element={
              <RouteGuard allowedRoles={['general_admin']}>
                <AdminUsersPage />
              </RouteGuard>
            } />
            <Route path="sucursales" element={
              <RouteGuard allowedRoles={['general_admin']}>
                <AdminBranchesPage />
              </RouteGuard>
            } />
            <Route path="jornadas" element={<AdminWorkdaysPage />} />
            <Route path="liquidaciones" element={<AdminSettlementsPage />} />
            <Route path="cierre-diario" element={<AdminDailyClosurePage />} />
            <Route path="buses" element={<AdminBusDirectoryPage />} />
            <Route path="reportes" element={<AdminReportsPage />} />
            <Route path="auditoria" element={
              <RouteGuard allowedRoles={['general_admin']}>
                <AdminAuditPage />
              </RouteGuard>
            } />
            <Route path="configuracion" element={<AdminSettingsPage />} />
            <Route path="mantenimiento" element={
              <RouteGuard allowedRoles={['general_admin']}>
                <AdminMaintenancePage />
              </RouteGuard>
            } />
          </Route>

          {/* ── Panel Motorizado ─────────────────────────────────────────── */}
          <Route
            path="/motorizado"
            element={
              <RouteGuard allowedRoles={['courier']}>
                <CourierLayout />
              </RouteGuard>
            }
          >
            <Route index element={<CourierHomePage />} />
            <Route path="tareas" element={<CourierTasksPage />} />
            <Route path="tareas/:id" element={<CourierTaskDetailPage />} />
            <Route path="ruta" element={<CourierRoutePage />} />
            <Route path="fondos" element={<CourierFundsPage />} />
            <Route path="liquidacion" element={<CourierSettlementPage />} />
            <Route path="buses" element={<CourierBusesPage />} />
            <Route path="notificaciones" element={<CourierNotificationsPage />} />
          </Route>

          {/* ── Ruta de Desarrollo (Solo en entorno DEV) ────────────────────── */}
          {import.meta.env.DEV && UiKitCatalogPage && (
            <Route
              path="/dev/ui-kit"
              element={
                <ToastProvider>
                  <UiKitCatalogPage />
                </ToastProvider>
              }
            />
          )}

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
