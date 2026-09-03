import { useState, useEffect, useRef } from 'react'
import {
  Download,
  Upload,
  Clock,
  Shield,
  Loader2,
  HardDrive,
  Calendar,
  Save,
  CheckCircle,
} from 'lucide-react'
import { useAuth } from '@/modules/auth/useAuth'
import { useToast } from '@/shared/components/ui/useToast'
import { Button } from '@/shared/components/ui/Button'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/shared/components/ui/Modal'
import { formatDate } from '@/shared/utils/format'
import {
  generateFullBackup,
  triggerBackupDownload,
  parseBackupFile,
  restoreFromBackupData,
  getBackupScheduleConfig,
  saveBackupScheduleConfig,
  type BackupData,
  type BackupScheduleConfig,
} from '../services/backupService'

export function BackupManager() {
  const { profile } = useAuth()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados de Respaldo Manual
  const [isExporting, setIsExporting] = useState(false)
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null)

  // Estados de Configuración Automática
  const [scheduleConfig, setScheduleConfig] = useState<BackupScheduleConfig>(getBackupScheduleConfig())
  const [isConfigSaved, setIsConfigSaved] = useState(false)

  // Estados de Restauración
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null)
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    const cfg = getBackupScheduleConfig()
    setScheduleConfig(cfg)
    if (cfg.last_backup_at) {
      setLastBackupDate(cfg.last_backup_at)
    }
  }, [])

  // 1. Manejador de Respaldo Inmediato (1 Clic)
  const handleGenerateBackup = async () => {
    setIsExporting(true)
    try {
      const backup = await generateFullBackup(profile?.email || 'admin@gestorops.com')
      await triggerBackupDownload(backup)
      setLastBackupDate(backup.metadata.created_at)
      toast.success(
        'Respaldo Descargado',
        'El archivo de seguridad se generó y resguardó exitosamente.'
      )
    } catch (err: unknown) {
      console.error('Error generating backup:', err)
      toast.error('Error al generar respaldo', (err as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  // 2. Manejador de Guardado de Configuración de Respaldo Automático
  const handleSaveScheduleConfig = () => {
    saveBackupScheduleConfig(scheduleConfig)
    setIsConfigSaved(true)
    toast.success(
      'Configuración Guardada',
      'Las preferencias de respaldos automáticos se actualizaron correctamente.'
    )
    setTimeout(() => setIsConfigSaved(false), 3000)
  }

  // 3. Manejador de Selección de Archivo para Restaurar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsReadingFile(true)
    try {
      const parsed = await parseBackupFile(file)
      setPendingRestoreData(parsed)
      setIsConfirmRestoreOpen(true)
    } catch (err: unknown) {
      console.error('Error parsing backup file:', err)
      toast.error('Archivo no válido', (err as Error).message)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setIsReadingFile(false)
    }
  }

  // 4. Confirmación de Restauración
  const handleExecuteRestore = async () => {
    if (!pendingRestoreData) return

    setIsRestoring(true)
    try {
      const result = await restoreFromBackupData(pendingRestoreData)
      toast.success('Restauración Completa', result.message)
      setIsConfirmRestoreOpen(false)
      setPendingRestoreData(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: unknown) {
      console.error('Error executing restore:', err)
      toast.error('Error al restaurar', (err as Error).message)
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── SECCIÓN 1: Generación Inmediata de Respaldo (1 Clic) ─── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-[#004594] border border-blue-100">
              <Download className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Copia de Seguridad Inmediata (Respaldo Completo)
              </h2>
              <p className="text-xs text-foreground-muted">
                Empaqueta todas las tareas, turnos, movimientos de caja, liquidaciones y rutas de bus en un archivo seguro JSON.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={handleGenerateBackup}
            disabled={isExporting}
            leftIcon={
              isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )
            }
            className="shadow-xs cursor-pointer"
          >
            {isExporting ? 'Generando y empaquetando...' : 'Descargar Respaldo Completo Ahora'}
          </Button>

          {lastBackupDate && (
            <div className="flex items-center gap-2 text-xs text-foreground-muted font-medium bg-muted/40 px-3.5 py-2 rounded-xl border border-border/50">
              <Clock className="h-3.5 w-3.5 text-accent" />
              <span>Último respaldo: <strong>{formatDate(lastBackupDate, 'dd/MM/yyyy HH:mm')}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* ─── SECCIÓN 2: Configuración de Respaldos Automáticos ─── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Configurador de Respaldos Automáticos
            </h2>
            <p className="text-xs text-foreground-muted">
              Define la frecuencia y la hora para generar y resguardar automáticamente la información operativa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Frecuencia */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground block">
              Frecuencia de Respaldo
            </label>
            <select
              value={scheduleConfig.frequency}
              onChange={(e) =>
                setScheduleConfig({
                  ...scheduleConfig,
                  frequency: e.target.value as BackupScheduleConfig['frequency'],
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-accent/40"
            >
              <option value="daily">Diario (Recomendado)</option>
              <option value="every_12h">Cada 12 Horas</option>
              <option value="weekly">Semanal</option>
            </select>
          </div>

          {/* Hora de Respaldo */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground block">
              Hora de Ejecución (Managua)
            </label>
            <input
              type="time"
              value={scheduleConfig.time}
              onChange={(e) =>
                setScheduleConfig({
                  ...scheduleConfig,
                  time: e.target.value,
                })
              }
              className="w-full px-3 py-2 bg-background border border-border rounded-xl text-foreground font-medium focus:ring-2 focus:ring-accent/40"
            />
          </div>

          {/* Respaldo Automático en Cierre Diario */}
          <div className="space-y-1.5">
            <label className="font-bold text-foreground block">
              Respaldo en Cierre Diario
            </label>
            <div className="flex items-center h-[38px]">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={scheduleConfig.auto_download}
                  onChange={(e) =>
                    setScheduleConfig({
                      ...scheduleConfig,
                      auto_download: e.target.checked,
                    })
                  }
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <span>Descargar copia al cerrar caja</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-2xs text-foreground-muted flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-600" />
            Los respaldos incluyen integridad relacional de usuarios, órdenes y caja.
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveScheduleConfig}
            leftIcon={isConfigSaved ? <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5 text-accent" />}
            className="cursor-pointer"
          >
            {isConfigSaved ? '¡Configuración Guardada!' : 'Guardar Configuración'}
          </Button>
        </div>
      </div>

      {/* ─── SECCIÓN 3: Restauración desde Archivo de Respaldo ─── */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/50 pb-3">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Restaurar Base de Datos desde Respaldo (.JSON)
            </h2>
            <p className="text-xs text-foreground-muted">
              Carga un archivo de copia de seguridad previamente descargado para recuperar todos los registros.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={isReadingFile || isRestoring}
            className="hidden"
            id="backup-file-input"
          />

          <Button
            variant="outline"
            size="md"
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingFile || isRestoring}
            leftIcon={
              isReadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <HardDrive className="h-4 w-4 text-purple-600" />
              )
            }
            className="cursor-pointer border-purple-200 hover:bg-purple-50 hover:text-purple-700"
          >
            {isReadingFile ? 'Leyendo archivo...' : 'Seleccionar Archivo de Respaldo (.json)'}
          </Button>
        </div>
      </div>

      {/* Modal de Confirmación de Restauración */}
      <Modal isOpen={isConfirmRestoreOpen} onClose={() => {
        if (!isRestoring) {
          setIsConfirmRestoreOpen(false)
          setPendingRestoreData(null)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }}>
        <ModalContent size="md">
          <ModalHeader onClose={() => {
            if (!isRestoring) {
              setIsConfirmRestoreOpen(false)
              setPendingRestoreData(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }
          }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700 border border-purple-200">
                <HardDrive className="h-5 w-5" />
              </div>
              <div>
                <ModalTitle>Confirmar Restauración de Datos</ModalTitle>
                <ModalDescription>
                  Verifica el contenido detectado en el archivo de respaldo
                </ModalDescription>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-4 text-xs">
            {pendingRestoreData && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-mono">
                  <div>📋 Tareas: <strong>{pendingRestoreData.data.tasks?.length ?? 0}</strong></div>
                  <div>🛵 Jornadas: <strong>{pendingRestoreData.data.workdays?.length ?? 0}</strong></div>
                  <div>💵 Movimientos: <strong>{pendingRestoreData.data.cash_movements?.length ?? 0}</strong></div>
                  <div>🚌 Rutas de Bus: <strong>{pendingRestoreData.data.bus_routes?.length ?? 0}</strong></div>
                  <div>👥 Perfiles: <strong>{pendingRestoreData.data.profiles?.length ?? 0}</strong></div>
                  <div>🏢 Sucursales: <strong>{pendingRestoreData.data.branches?.length ?? 0}</strong></div>
                </div>
                <p className="text-2xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
                  ⚠️ Los registros existentes se sincronizarán y actualizarán con la información del archivo de respaldo.
                </p>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              variant="outline"
              size="md"
              disabled={isRestoring}
              onClick={() => {
                setIsConfirmRestoreOpen(false)
                setPendingRestoreData(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              size="md"
              isLoading={isRestoring}
              onClick={handleExecuteRestore}
            >
              Confirmar y Restaurar Datos
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
