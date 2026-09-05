import { useState, useEffect, useRef } from 'react'
import {
  Building2,
  Save,
  Loader2,
  Upload,
  Camera,
  Trash2,
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Globe,
  FileText,
  Sparkles,
  CheckCircle2,
  Eye,
  Info,
} from 'lucide-react'
import { useCompanySettings } from '@/modules/settings/hooks/useCompanySettings'
import { type CompanySettings } from '@/modules/settings/services/companySettingsService'
import { Button, useToast } from '@/shared/components/ui'
import { cn } from '@/shared/utils/cn'

export function CompanySettingsTab() {
  const { settings, saveSettings, uploadLogo, isSaving, isLoading, isUploadingLogo } = useCompanySettings()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [formData, setFormData] = useState<CompanySettings>(settings)
  const [logoPreview, setLogoPreview] = useState<string>(settings.logo_url || '')
  const [isSavedSuccess, setIsSavedSuccess] = useState(false)

  // Sincronizar estado local cuando se carguen los datos
  useEffect(() => {
    if (settings) {
      setFormData(settings)
      setLogoPreview(settings.logo_url || '')
    }
  }, [settings])

  const handleInputChange = (field: keyof CompanySettings, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
    setIsSavedSuccess(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('El archivo de imagen no debe superar los 5 MB.')
      return
    }

    try {
      const publicUrl = await uploadLogo(file)
      setLogoPreview(publicUrl)
      setFormData((prev) => ({
        ...prev,
        logo_url: publicUrl,
      }))
      toast.success('Logotipo cargado', 'Haz clic en "Guardar Cambios" para aplicar a toda la plataforma.')
    } catch (err: any) {
      toast.error('Error al subir logotipo', err?.message || 'No se pudo subir la imagen.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveLogo = () => {
    setLogoPreview('')
    setFormData((prev) => ({
      ...prev,
      logo_url: '',
    }))
    setIsSavedSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.error('Ingresa el nombre comercial de la empresa.')
      return
    }

    try {
      await saveSettings(formData)
      setIsSavedSuccess(true)
      toast.success('Ajustes guardados', 'Los datos y la identidad de la empresa se actualizaron exitosamente.')
      setTimeout(() => setIsSavedSuccess(false), 4000)
    } catch (err: any) {
      toast.error('Error al guardar', err?.message || 'Ocurrió un error inesperado.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-card border border-border rounded-2xl">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
        <p className="text-xs text-foreground-muted">Cargando datos de la empresa...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in max-w-4xl">
      {/* Banner Superior Explicativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 bg-card border border-border rounded-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground">Identidad y Perfil de la Empresa</h2>
            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Personalización Global
            </span>
          </div>
          <p className="text-xs text-foreground-muted max-w-2xl leading-relaxed">
            Estos datos se utilizarán para personalizar el nombre en la barra lateral, las cabeceras de recibos PDF descargables, notificaciones y el portal de seguimiento para tus clientes.
          </p>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSaving || isUploadingLogo}
          className="shrink-0 gap-2 shadow-xs"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : isSavedSuccess ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              ¡Guardado!
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>

      {/* 1. Logotipo e Identidad Visual */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <Camera className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Logotipo de la Empresa
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Visualizador del Logo */}
          <div className="relative group shrink-0">
            <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20 overflow-hidden shadow-xs">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo Empresa"
                  className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="text-center p-3">
                  <Building2 className="h-8 w-8 text-foreground-muted mx-auto mb-1 opacity-50" />
                  <span className="text-[10px] text-foreground-muted font-medium">Sin logo</span>
                </div>
              )}
            </div>

            {logoPreview && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition cursor-pointer"
                title="Quitar logo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Acciones e instrucciones de subida */}
          <div className="space-y-2 flex-1 text-center sm:text-left">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleLogoUpload}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
            />

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo || isSaving}
                className="gap-1.5"
              >
                {isUploadingLogo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                {logoPreview ? 'Cambiar Logotipo' : 'Subir Logotipo'}
              </Button>

              {logoPreview && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Logotipo activo
                </span>
              )}
            </div>

            <p className="text-[11px] text-foreground-muted leading-relaxed">
              Formatos recomendados: PNG o SVG transparente, JPG o WebP. Tamaño óptimo: cuadrado o proporción 1:1 (mínimo 250x250 px).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Datos Generales de la Empresa */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <Building2 className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Información Legal y Comercial
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nombre Comercial <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Ej: Bricklar Gestor"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
            <span className="text-[10px] text-foreground-muted mt-0.5 block">
              Se muestra en el título principal de la barra de navegación y páginas públicas.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Razón Social
            </label>
            <input
              type="text"
              value={formData.legal_name}
              onChange={(e) => handleInputChange('legal_name', e.target.value)}
              placeholder="Ej: Distribuidora Bricklar S.A."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
            <span className="text-[10px] text-foreground-muted mt-0.5 block">
              Nombre fiscal para recibos y liquidaciones impresas.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Número RUC / Identificación Fiscal
            </label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => handleInputChange('tax_id', e.target.value)}
              placeholder="Ej: J0310000194829"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-mono font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Slogan o Lema Comercial
            </label>
            <input
              type="text"
              value={formData.slogan}
              onChange={(e) => handleInputChange('slogan', e.target.value)}
              placeholder="Ej: Logística y Mensajería Empresarial Inteligente"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-foreground mb-1">
              Descripción de la Empresa / Actividad
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Breve reseña o actividad principal de la empresa..."
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground resize-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Contacto y Canales Oficiales */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <Phone className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Contacto y Canales de Atención
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
              <Phone className="h-3 w-3 text-foreground-muted" /> Teléfono PBX / Celular
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+505 2222-0000"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
              <MessageCircle className="h-3 w-3 text-emerald-500" /> WhatsApp Oficial
            </label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => handleInputChange('whatsapp', e.target.value)}
              placeholder="+505 8888-0000"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
              <Mail className="h-3 w-3 text-foreground-muted" /> Correo Electrónico
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="contacto@tuempresa.com"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
          </div>
        </div>
      </div>

      {/* 4. Ubicación y Enlaces */}
      <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-border/60">
          <MapPin className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Ubicación Central y Sitio Web
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Dirección de Oficina Central
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Ej: Managua, Nicaragua - Pista Jean Paul Genie"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1 flex items-center gap-1">
              <Globe className="h-3 w-3 text-foreground-muted" /> Sitio Web Oficial
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://tuempresa.com"
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground font-medium"
            />
          </div>
        </div>
      </div>

      {/* Botón inferior de guardar */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSaving || isUploadingLogo}
          className="gap-2 px-6"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando Configuración...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar Configuración de Empresa
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
