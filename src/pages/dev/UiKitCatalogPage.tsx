import { useState } from 'react'
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  BentoCard,
  MetricCard,
  Badge,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  useToast,
  Skeleton,
  TableSkeleton,
  Spinner,
  EmptyState,
  ConfirmDialog,
  Divider,
  Avatar,
} from '@/shared/components/ui'
import {
  Shield,
  Search,
  Mail,
  Lock,
  Plus,
  Trash2,
  Download,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  RefreshCw,
  FolderOpen,
  UserCheck,
  PackageCheck,
  Sparkles,
  Layers,
  Palette,
  Type,
  ToggleLeft,
  Layout,
  Bell,
  Activity,
  User,
} from 'lucide-react'

export default function UiKitCatalogPage() {
  const toast = useToast()

  // Estados interactivos para Modal y ConfirmDialog
  const [isBasicModalOpen, setIsBasicModalOpen] = useState(false)
  const [isLargeModalOpen, setIsLargeModalOpen] = useState(false)
  const [isConfirmDestructiveOpen, setIsConfirmDestructiveOpen] = useState(false)
  const [isConfirmWarningOpen, setIsConfirmWarningOpen] = useState(false)

  // Estado interactivo para demo de Input
  const [inputValue, setInputValue] = useState('Agencia Central Zona 10')
  const [inputError, setInputError] = useState('')

  // Estado de carga simulada para ConfirmDialog
  const [isConfirming, setIsConfirming] = useState(false)

  const handleConfirmDestructiveAction = () => {
    setIsConfirming(true)
    setTimeout(() => {
      setIsConfirming(false)
      setIsConfirmDestructiveOpen(false)
      toast.success('Usuario eliminado', 'El registro ha sido removido del sistema.')
    }, 1200)
  }

  const handleConfirmWarningAction = () => {
    setIsConfirmWarningOpen(false)
    toast.warning('Jornada finalizada', 'Se ha registrado el cierre parcial de turno.')
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 selection:bg-accent selection:text-white">
      {/* ── Top Header / Dev Bar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-lg shadow-sm">
              B
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-tight flex items-center gap-2">
                Bricklar Design System v1
                <span className="text-2xs uppercase tracking-widest font-semibold px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-full border border-sky-500/30">
                  Fase 0C
                </span>
              </h1>
              <p className="text-xs text-slate-400">Catálogo Visual y Validación de Componentes UI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Entorno Dev (`import.meta.env.DEV`)
            </span>
          </div>
        </div>
      </header>

      {/* ── Subenrutador de Navegación Rápida ───────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-16 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto py-2.5 flex items-center gap-2 text-xs font-semibold text-slate-600 no-scrollbar">
          <a href="#sec-tokens" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Palette className="h-3.5 w-3.5 text-primary" /> Colores & Tokens
          </a>
          <a href="#sec-typography" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Type className="h-3.5 w-3.5 text-primary" /> Tipografía
          </a>
          <a href="#sec-buttons" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <ToggleLeft className="h-3.5 w-3.5 text-primary" /> Botones
          </a>
          <a href="#sec-inputs" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Search className="h-3.5 w-3.5 text-primary" /> Inputs
          </a>
          <a href="#sec-cards" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Layout className="h-3.5 w-3.5 text-primary" /> Cards & KPIs
          </a>
          <a href="#sec-badges" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Badges
          </a>
          <a href="#sec-modals" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Shield className="h-3.5 w-3.5 text-primary" /> Modales & Confirm
          </a>
          <a href="#sec-toast" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Bell className="h-3.5 w-3.5 text-primary" /> Toasts
          </a>
          <a href="#sec-states" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <Activity className="h-3.5 w-3.5 text-primary" /> Estados Carga
          </a>
          <a href="#sec-avatar-divider" className="px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1.5 shrink-0">
            <User className="h-3.5 w-3.5 text-primary" /> Avatar & Divider
          </a>
        </div>
      </nav>

      {/* ── Main Container ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">

        {/* ── Intro Alert Card ─────────────────────────────────────────── */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-primary flex items-center gap-2">
              <Layers className="h-5 w-5 text-accent" /> Biblioteca Atómica UI Bricklar
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
              Esta página interna permite inspeccionar la calidad visual, estados interactivos, responsive design y accesibilidad ARIA de todos los 13 componentes desacoplados del sistema.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => window.location.reload()}
            >
              Recargar Vista
            </Button>
          </div>
        </div>

        {/* ── SECCIÓN 1: COLORES Y TOKENS ───────────────────────────────── */}
        <section id="sec-tokens" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Palette className="h-5 w-5 text-primary" /> 1. Colores y Tokens de Diseño
            </h2>
            <span className="text-xs font-semibold text-slate-500">Paleta Oficial Bricklar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Azul Marino Principal */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-[#0B192C] flex items-end p-2.5 text-white font-mono text-xs font-bold justify-between">
                <span>Primary Navy</span>
                <span>#0B192C</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">bg-primary</code></p>
                <p className="text-slate-500">Uso: Botones principales, encabezados, avatares predeterminados.</p>
              </div>
            </div>

            {/* Azul Oscuro Hover / Active */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-[#07101E] flex items-end p-2.5 text-white font-mono text-xs font-bold justify-between">
                <span>Primary Dark</span>
                <span>#07101E</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">bg-primary-600</code></p>
                <p className="text-slate-500">Uso: Estado hover/active de botones primarios y sombras profundas.</p>
              </div>
            </div>

            {/* Celeste Acogedor Accent */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-[#008DDA] flex items-end p-2.5 text-white font-mono text-xs font-bold justify-between">
                <span>Sky Accent</span>
                <span>#008DDA</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-600">bg-accent</code></p>
                <p className="text-slate-500">Uso: Indicadores activos, anillos de foco accesibles, enlaces.</p>
              </div>
            </div>

            {/* Celeste Sutil Background */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-sky-50 border border-sky-200 flex items-end p-2.5 text-sky-900 font-mono text-xs font-bold justify-between">
                <span>Sky Light</span>
                <span>#F0F9FF</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-sky-700">bg-sky-50</code></p>
                <p className="text-slate-500">Uso: Fondos de notificaciones informativas, resaltados suaves.</p>
              </div>
            </div>

            {/* Fondos Grises Canvas */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-slate-50 border border-slate-200 flex items-end p-2.5 text-slate-800 font-mono text-xs font-bold justify-between">
                <span>Slate Canvas</span>
                <span>#F8FAFC</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">bg-slate-50 / bg-background</code></p>
                <p className="text-slate-500">Uso: Fondo global de la aplicación (Canvas ultra claro).</p>
              </div>
            </div>

            {/* Superficie Blanca */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-white border border-slate-300 flex items-end p-2.5 text-slate-800 font-mono text-xs font-bold justify-between">
                <span>White Surface</span>
                <span>#FFFFFF</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">bg-surface / bg-white</code></p>
                <p className="text-slate-500">Uso: Tarjetas, campos de texto, superficies de modales.</p>
              </div>
            </div>

            {/* Bordes */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-slate-100 border-2 border-slate-300 flex items-end p-2.5 text-slate-800 font-mono text-xs font-bold justify-between">
                <span>Border Default</span>
                <span>#E2E8F0</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">border-border / border-slate-300</code></p>
                <p className="text-slate-500">Uso: Delimitadores de tarjetas, inputs, líneas separadoras.</p>
              </div>
            </div>

            {/* Semántico Éxito */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-emerald-500 flex items-end p-2.5 text-white font-mono text-xs font-bold justify-between">
                <span>Success Emerald</span>
                <span>#10B981</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-700">bg-emerald-500 / text-emerald-700</code></p>
                <p className="text-slate-500">Uso: Tareas completadas, liquidaciones exitosas, badges OK.</p>
              </div>
            </div>

            {/* Semántico Advertencia */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-amber-500 flex items-end p-2.5 text-white font-mono text-xs font-bold justify-between">
                <span>Warning Amber</span>
                <span>#F59E0B</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-700">bg-amber-500 / text-amber-700</code></p>
                <p className="text-slate-500">Uso: Tareas pendientes, alertas preventivas, fondos por rendir.</p>
              </div>
            </div>

            {/* Semántico Error / Destructivo */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
              <div className="h-16 rounded-lg bg-rose-600 flex items-end p-2.5 text-white font-mono text-xs font-bold justify-between">
                <span>Destructive Rose</span>
                <span>#E11D48</span>
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-slate-900">Token: <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-700">bg-destructive / text-rose-600</code></p>
                <p className="text-slate-500">Uso: Operaciones destructivas, errores de validación, urgencias.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 2: TIPOGRAFÍA ─────────────────────────────────────── */}
        <section id="sec-typography" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Type className="h-5 w-5 text-primary" /> 2. Jerarquía Tipográfica
            </h2>
            <span className="text-xs font-semibold text-slate-500">Fuentes Inter & Monospace</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs divide-y divide-slate-100 space-y-4">
            <div className="pt-2 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-widest">Título H1 (24px / 1.5rem • Bold)</span>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Panel de Administración de Cobros y Tareas</h1>
              </div>
              <code className="text-2xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">text-2xl font-bold</code>
            </div>

            <div className="pt-3 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-widest">Título H2 (20px / 1.25rem • Bold)</span>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Detalle de la Jornada Operativa</h2>
              </div>
              <code className="text-2xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">text-xl font-bold</code>
            </div>

            <div className="pt-3 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-widest">Subtítulo / Card Title (18px / 1.125rem • SemiBold)</span>
                <h3 className="text-lg font-semibold text-slate-900">Resumen de Liquidaciones por Motorizado</h3>
              </div>
              <code className="text-2xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">text-lg font-semibold</code>
            </div>

            <div className="pt-3 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-widest">Texto Normal / Body (14px / 0.875rem • Regular)</span>
                <p className="text-sm text-slate-800 leading-relaxed">
                  El motorizado asignado ha completado la entrega de documentos en la sucursal asignada y ha recibido la constancia firmada.
                </p>
              </div>
              <code className="text-2xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">text-sm text-slate-800</code>
            </div>

            <div className="pt-3 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-widest">Texto Secundario (14px / 0.875rem • Muted)</span>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Última sincronización realizada hace 5 minutos desde la aplicación móvil.
                </p>
              </div>
              <code className="text-2xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">text-sm text-foreground-muted</code>
            </div>

            <div className="pt-3 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-widest">Etiquetas / Overlines (12px / 0.75rem • Bold Uppercase)</span>
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  ESTADO DE CAJA CHICA
                </span>
              </div>
              <code className="text-2xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">text-xs font-semibold uppercase</code>
            </div>

            <div className="pt-3 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
              <div>
                <span className="text-2xs font-semibold text-slate-400 uppercase tracking-widest">Cifras Monetarias (Font Mono • Bold)</span>
                <div className="text-2xl font-bold font-mono tracking-tight text-primary">
                  Q 1,450.00 <span className="text-sm text-slate-500 font-normal">GTQ</span>
                </div>
              </div>
              <code className="text-2xs font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded shrink-0">font-mono font-bold</code>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 3: BOTONES ────────────────────────────────────────── */}
        <section id="sec-buttons" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <ToggleLeft className="h-5 w-5 text-primary" /> 3. Botones y Variantes
            </h2>
            <span className="text-xs font-semibold text-slate-500">Componente `Button`</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-8">
            {/* Variantes Principales */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Variantes Visuales</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary (`bg-primary`)</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            <Divider />

            {/* Tamaños */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tamaños Disponibles</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm" variant="primary">Pequeño (`sm` - 32px)</Button>
                <Button size="md" variant="primary">Mediano (`md` - 40px)</Button>
                <Button size="lg" variant="primary">Grande (`lg` - 48px)</Button>
              </div>
            </div>

            <Divider />

            {/* Botón Touch Hero (Motorizados) */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Variante Especial: `touch-hero` (Optimizado para Touch Motorizado)</h3>
              <div className="max-w-md">
                <Button variant="touch-hero" leftIcon={<PackageCheck className="h-5 w-5" />}>
                  Completar Entrega de Tarea
                </Button>
              </div>
            </div>

            <Divider />

            {/* Estados Especiales: Disabled, Loading, Icons */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estados Especiales y Con Iconos</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" disabled>Deshabilitado</Button>
                <Button variant="primary" isLoading>Cargando datos</Button>
                <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>Crear Tarea</Button>
                <Button variant="secondary" rightIcon={<ChevronRight className="h-4 w-4" />}>Siguiente Pasó</Button>
                <Button size="icon" variant="outline" aria-label="Descargar documento">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" aria-label="Eliminar registro">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 4: INPUTS ─────────────────────────────────────────── */}
        <section id="sec-inputs" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Search className="h-5 w-5 text-primary" /> 4. Campos de Entrada (`Input`)
            </h2>
            <span className="text-xs font-semibold text-slate-500">Soporte ARIA & Iconos</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Estándar / Vacío */}
              <Input
                label="Nombre de Usuario"
                placeholder="ej. Juan Pérez"
                helperText="Introduce tu nombre completo registrado."
              />

              {/* Con Valor Interactivo */}
              <Input
                label="Sucursal Destino (Editable)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Campo interactivo de prueba."
              />

              {/* Con Left Icon */}
              <Input
                label="Buscar Tareas"
                placeholder="Buscar por código o cliente..."
                leftIcon={<Search className="h-4 w-4" />}
              />

              {/* Con Left & Right Icon */}
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="usuario@bricklar.com"
                leftIcon={<Mail className="h-4 w-4" />}
                rightIcon={<UserCheck className="h-4 w-4 text-emerald-600" />}
              />

              {/* Estado Error */}
              <Input
                label="Monto de Rembolso (GTQ)"
                value="abc"
                error={inputError || "El valor debe ser un número válido positivo."}
                leftIcon={<DollarSign className="h-4 w-4" />}
                onChange={(e) => {
                  if (!e.target.value) setInputError('Campo requerido')
                  else setInputError('')
                }}
              />

              {/* Estado Deshabilitado */}
              <Input
                label="Código de Autenticación RLS"
                value="BRK-2026-X99"
                disabled
                leftIcon={<Lock className="h-4 w-4" />}
                helperText="Este campo es generado por el sistema."
              />
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 5: CARDS ──────────────────────────────────────────── */}
        <section id="sec-cards" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Layout className="h-5 w-5 text-primary" /> 5. Tarjetas (`Card`, `BentoCard`, `MetricCard`)
            </h2>
            <span className="text-xs font-semibold text-slate-500">Componentes de Estructura</span>
          </div>

          {/* MetricCards (KPIs) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Variantes KPI (`MetricCard`)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Tareas Entregadas"
                value="14 Tareas"
                subtitle="100% de la jornada cumplida"
                icon={<PackageCheck className="h-5 w-5 text-emerald-600" />}
                accentColor="success"
              />
              <MetricCard
                title="Saldo en Caja Chica"
                value="Q 350.00"
                subtitle="Fondos asignados pendientes"
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                accentColor="primary"
              />
              <MetricCard
                title="Siguiente Destino"
                value="Zona 10 Central"
                subtitle="Tiempo estimado: 15 mins"
                icon={<MapPin className="h-5 w-5 text-sky-600" />}
                accentColor="accent"
              />
              <MetricCard
                title="Jornada Operativa"
                value="En Curso"
                subtitle="Iniciada a las 08:00 AM"
                icon={<Clock className="h-5 w-5 text-amber-500" />}
                accentColor="warning"
              />
            </div>
          </div>

          {/* Card Standard y Hoverable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Tarjeta Estándar Informática</CardTitle>
                <CardDescription>Resumen general del estado de servicio de mensajería.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                <p>
                  Esta tarjeta implementa la estructura estándar con `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` y `CardFooter`.
                </p>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-800">Parámetros de entrega:</span>
                  <p>Dirección: 15 Avenida 4-22, Zona 10, Ciudad de Guatemala</p>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" size="sm">Ver Archivos</Button>
                <Button variant="primary" size="sm">Iniciar Ruta</Button>
              </CardFooter>
            </Card>

            <Card isHoverable>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Tarjeta Interactivas (`isHoverable`)</CardTitle>
                  <Badge variant="assigned">Asignada</Badge>
                </div>
                <CardDescription>Pasa el cursor por encima para observar la elevación de sombra.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-600">
                <p>
                  Ideal para listados navegables de tareas donde la tarjeta completa actúa como disparador de navegación.
                </p>
                <div className="flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-500">Cliente: Banco Industrial</span>
                  <span className="font-bold text-primary font-mono">Q 850.00</span>
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-2xs text-slate-400">ID: TRK-9981</span>
                <span className="text-xs font-semibold text-accent flex items-center gap-1">
                  Detalles <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </CardFooter>
            </Card>
          </div>

          {/* Bento Cards */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Variantes Bento Grid (`BentoCard`)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BentoCard isHero className="md:col-span-2">
                <div className="space-y-2">
                  <span className="text-2xs font-bold uppercase tracking-widest text-accent">Bento Hero Card</span>
                  <h3 className="text-lg font-bold text-slate-900">Resumen Operativo Diario del Gestor</h3>
                  <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                    Diseñado para destacar métricas clave o avisos prioritarios en el Dashboard con un gradiente sutil.
                  </p>
                </div>
                <div className="pt-4 flex items-center gap-4">
                  <Button variant="primary" size="sm">Revisar Reporte</Button>
                </div>
              </BentoCard>

              <BentoCard>
                <div className="space-y-2">
                  <span className="text-2xs font-bold uppercase tracking-widest text-slate-400">Bento Standard</span>
                  <h4 className="text-sm font-semibold text-slate-900">Notificaciones</h4>
                  <p className="text-xs text-slate-500">Sin mensajes urgentes pendientes en la cola.</p>
                </div>
                <span className="text-2xs text-emerald-600 font-semibold flex items-center gap-1 pt-2">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Sincronizado
                </span>
              </BentoCard>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 6: BADGES ─────────────────────────────────────────── */}
        <section id="sec-badges" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Sparkles className="h-5 w-5 text-primary" /> 6. Insignias Semánticas (`Badge`)
            </h2>
            <span className="text-xs font-semibold text-slate-500">Estados Operativos Bricklar</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
            {/* Variantes de Estado */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estados de Tareas y Operaciones</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="pending" showDot>Pendiente</Badge>
                <Badge variant="assigned" showDot>Asignada</Badge>
                <Badge variant="en_route" showDot>En Ruta</Badge>
                <Badge variant="completed" showDot>Completada</Badge>
                <Badge variant="urgent" showDot>Urgente</Badge>
                <Badge variant="neutral" showDot>Neutral / Archivado</Badge>
              </div>
            </div>

            <Divider />

            {/* Tamaños y Con Iconos */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tamaños e Iconos Integrados</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="sm" variant="completed" icon={<CheckCircle2 className="h-3 w-3" />}>SM Completo</Badge>
                <Badge size="md" variant="completed" icon={<CheckCircle2 className="h-3.5 w-3.5" />}>MD Completo</Badge>
                <Badge size="md" variant="urgent" icon={<AlertTriangle className="h-3.5 w-3.5" />}>Atención Requerida</Badge>
                <Badge size="md" variant="assigned" icon={<UserCheck className="h-3.5 w-3.5" />}>Motorizado Asignado</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 7: MODALES Y CONFIRM DIALOG ───────────────────────── */}
        <section id="sec-modals" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Shield className="h-5 w-5 text-primary" /> 7. Modales y Diálogos de Confirmación (`Modal`, `ConfirmDialog`)
            </h2>
            <span className="text-xs font-semibold text-slate-500">Prueba Interactiva y Tecla Escape</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <p className="text-xs text-slate-600">
              Prueba la apertura de diálogos flotantes accesibles. Puedes cerrarlos pulsando la tecla <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">Escape</code> o haciendo clic fuera del diálogo.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setIsBasicModalOpen(true)}>
                Abrir Modal Estándar (`md`)
              </Button>
              <Button variant="outline" onClick={() => setIsLargeModalOpen(true)}>
                Abrir Modal Grande (`lg`)
              </Button>
              <Button variant="destructive" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => setIsConfirmDestructiveOpen(true)}>
                Probar ConfirmDialog Destructivo
              </Button>
              <Button variant="secondary" leftIcon={<AlertTriangle className="h-4 w-4 text-amber-600" />} onClick={() => setIsConfirmWarningOpen(true)}>
                Probar ConfirmDialog Advertencia
              </Button>
            </div>
          </div>

          {/* Modal Estándar Demo */}
          <Modal isOpen={isBasicModalOpen} onClose={() => setIsBasicModalOpen(false)}>
            <ModalContent size="md">
              <ModalHeader onClose={() => setIsBasicModalOpen(false)}>
                <ModalTitle>Asignar Motorizado a Tarea #104</ModalTitle>
                <ModalDescription>Selecciona un motorizado disponible de la lista activa.</ModalDescription>
              </ModalHeader>
              <ModalBody className="space-y-3">
                <Input label="Buscar Motorizado" placeholder="Nombre o placa..." leftIcon={<Search className="h-4 w-4" />} />
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Carlos Mendoza (Placa M-9821)</span>
                    <Badge variant="completed" size="sm">Disponible</Badge>
                  </div>
                  <p className="text-slate-500">Ubicación actual: Zona 9 • 2 tareas completadas hoy</p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="outline" onClick={() => setIsBasicModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={() => {
                  setIsBasicModalOpen(false)
                  toast.success('Motorizado asignado', 'Carlos Mendoza fue asignado exitosamente.')
                }}>Confirmar Asignación</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Modal Grande Demo */}
          <Modal isOpen={isLargeModalOpen} onClose={() => setIsLargeModalOpen(false)}>
            <ModalContent size="lg">
              <ModalHeader onClose={() => setIsLargeModalOpen(false)}>
                <ModalTitle>Detalles Integrales de la Tarea TRK-2026</ModalTitle>
                <ModalDescription>Historial de auditoría y recibos de cobro.</ModalDescription>
              </ModalHeader>
              <ModalBody className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 uppercase text-2xs font-bold">Origen</span>
                    <p className="font-semibold text-slate-800 mt-1">Oficina Central Bricklar</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-slate-400 uppercase text-2xs font-bold">Monto Cobrado</span>
                    <p className="font-bold text-primary font-mono text-sm mt-1">Q 1,200.00</p>
                  </div>
                </div>
                <TableSkeleton rows={3} columns={3} />
              </ModalBody>
              <ModalFooter>
                <Button variant="outline" onClick={() => setIsLargeModalOpen(false)}>Cerrar Ventana</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* ConfirmDialog Destructivo */}
          <ConfirmDialog
            isOpen={isConfirmDestructiveOpen}
            onClose={() => setIsConfirmDestructiveOpen(false)}
            onConfirm={handleConfirmDestructiveAction}
            title="¿Eliminar Usuario del Sistema?"
            description="Esta acción eliminará permanentemente la cuenta de acceso y revocará todas las políticas RLS asociadas. ¿Deseas continuar?"
            confirmText="Sí, Eliminar Usuario"
            cancelText="Cancelar"
            variant="destructive"
            isLoading={isConfirming}
          />

          {/* ConfirmDialog Advertencia */}
          <ConfirmDialog
            isOpen={isConfirmWarningOpen}
            onClose={() => setIsConfirmWarningOpen(false)}
            onConfirm={handleConfirmWarningAction}
            title="¿Finalizar Turno de Trabajo?"
            description="Se calculará el balance preliminar de la caja chica antes del cierre oficial."
            confirmText="Confirmar Cierre"
            cancelText="Volver"
            variant="primary"
          />
        </section>

        {/* ── SECCIÓN 8: TOAST NOTIFICATIONS ────────────────────────────── */}
        <section id="sec-toast" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Bell className="h-5 w-5 text-primary" /> 8. Sistema de Notificaciones (`Toast` & `useToast`)
            </h2>
            <span className="text-xs font-semibold text-slate-500">Temporizador 3.5s & Cierre Manual</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
            <p className="text-xs text-slate-600">
              Pulsa cualquiera de los botones para disparar una notificación emergente en la esquina superior derecha del navegador:
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
                leftIcon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                onClick={() => toast.success('Operación exitosa', 'La entrega ha sido registrada correctamente.')}
              >
                Toast Success
              </Button>

              <Button
                variant="outline"
                className="border-rose-500/40 text-rose-700 hover:bg-rose-50"
                leftIcon={<XCircle className="h-4 w-4 text-rose-600" />}
                onClick={() => toast.error('Error de conexión', 'No se pudo guardar la firma digital en Supabase.')}
              >
                Toast Error
              </Button>

              <Button
                variant="outline"
                className="border-amber-500/40 text-amber-700 hover:bg-amber-50"
                leftIcon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                onClick={() => toast.warning('Advertencia de saldo', 'La caja chica ha alcanzado el 80% del límite asignado.')}
              >
                Toast Warning
              </Button>

              <Button
                variant="outline"
                className="border-sky-500/40 text-sky-700 hover:bg-sky-50"
                leftIcon={<Info className="h-4 w-4 text-sky-600" />}
                onClick={() => toast.info('Actualización disponible', 'Se han recibido 2 nuevas tareas en tu sector.')}
              >
                Toast Info
              </Button>
            </div>
          </div>
        </section>

        {/* ── SECCIÓN 9: ESTADOS DEL SISTEMA ────────────────────────────── */}
        <section id="sec-states" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <Activity className="h-5 w-5 text-primary" /> 9. Estados del Sistema (`Skeleton`, `Spinner`, `EmptyState`)
            </h2>
            <span className="text-xs font-semibold text-slate-500">Retroalimentación de Carga y Sin Datos</span>
          </div>

          {/* Skeleton Loaders */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Esqueletos de Carga (`Skeleton` & `TableSkeleton`)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <span className="text-2xs font-semibold text-slate-400 uppercase">Esqueleto de Tarjeta</span>
                <div className="flex items-center gap-3">
                  <Skeleton isCircle className="h-10 w-10" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
                <Skeleton className="h-20 w-full" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <span className="text-2xs font-semibold text-slate-400 uppercase">Esqueleto de Tabla (`TableSkeleton`)</span>
                <TableSkeleton rows={3} columns={3} />
              </div>
            </div>
          </div>

          {/* Spinners */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Giroscopios de Carga (`Spinner`)</h3>
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Spinner size="sm" variant="primary" />
                <span>sm (16px)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Spinner size="md" variant="accent" />
                <span>md (24px)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Spinner size="lg" variant="primary" />
                <span>lg (32px)</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Spinner size="xl" variant="accent" />
                <span>xl (48px)</span>
              </div>
            </div>
          </div>

          {/* EmptyState */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Estado Vacío (`EmptyState`)</h3>
            <EmptyState
              title="No hay tareas registradas en este sector"
              description="Actualmente no tienes entregas o cobros asignados para el filtro de fecha seleccionado."
              icon={<FolderOpen className="h-7 w-7 text-slate-400" />}
              action={
                <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
                  Actualizar Lista
                </Button>
              }
            />
          </div>
        </section>

        {/* ── SECCIÓN 10: AVATAR Y DIVIDER ──────────────────────────────── */}
        <section id="sec-avatar-divider" className="scroll-mt-36 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              <User className="h-5 w-5 text-primary" /> 10. Avatares y Separadores (`Avatar`, `Divider`)
            </h2>
            <span className="text-xs font-semibold text-slate-500">Iniciales, Presencia y Líneas</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-8">
            {/* Avatares Tamaños y Estados */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Variantes de Tamaño e Iniciales</h3>
              <div className="flex flex-wrap items-end gap-6">
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Byron Lara" size="sm" status="online" />
                  <span className="text-2xs text-slate-500">sm (32px)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Carlos Mendoza" size="md" status="busy" />
                  <span className="text-2xs text-slate-500">md (40px)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Ana Sofía" size="lg" status="away" />
                  <span className="text-2xs text-slate-500">lg (48px)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <Avatar name="Gestor Administrador" size="xl" status="offline" />
                  <span className="text-2xs text-slate-500">xl (64px)</span>
                </div>
              </div>
            </div>

            <Divider />

            {/* Dividers */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Variantes del Separador (`Divider`)</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-2xs text-slate-400 block mb-1">Divider Horizontal Predeterminado</span>
                  <Divider />
                </div>

                <div>
                  <span className="text-2xs text-slate-400 block mb-1">Divider Horizontal con Etiqueta Seccional</span>
                  <Divider label="DETALLES DE OPERACIÓN" />
                </div>

                <div>
                  <span className="text-2xs text-slate-400 block mb-2">Divider Vertical entre Elementos</span>
                  <div className="flex items-center gap-4 h-8 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
                    <span>Elemento Izquierdo</span>
                    <Divider orientation="vertical" />
                    <span>Elemento Central</span>
                    <Divider orientation="vertical" />
                    <span>Elemento Derecho</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-slate-700">Design System Bricklar v1 — Catálogo Visual UI Kit (Fase 0C)</p>
          <p className="mt-1">Página temporal de desarrollo protegida bajo `import.meta.env.DEV`</p>
        </div>
      </footer>
    </div>
  )
}
