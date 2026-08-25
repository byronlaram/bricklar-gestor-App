import { useState, useEffect, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, ExternalLink, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export interface ImageViewerModalProps {
  images: string[]
  initialIndex?: number
  isOpen: boolean
  onClose: () => void
  title?: string
}

export function ImageViewerModal({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  title = 'Foto de Referencia',
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)))
      setScale(1)
    }
  }, [isOpen, initialIndex, images.length])

  const handlePrev = useCallback(() => {
    setScale(1)
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
  }, [images.length])

  const handleNext = useCallback(() => {
    setScale(1)
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
  }, [images.length])

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.35, 3))
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.35, 0.75))
  const handleResetZoom = () => setScale(1)

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, handlePrev, handleNext])

  if (!isOpen || images.length === 0) return null

  const currentImage = images[currentIndex] || images[0]

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-fade-in">
      {/* Barra Superior */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-black/40 border-b border-white/10 z-20">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm sm:text-base tracking-wide">
            {title}
          </span>
          {images.length > 1 && (
            <span className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white">
              {currentIndex + 1} de {images.length}
            </span>
          )}
        </div>

        {/* Acciones de zoom y utilidades */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Alejar"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Acercar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {scale !== 1 && (
            <button
              onClick={handleResetZoom}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Restablecer tamaño"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Abrir en pestaña nueva"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 text-white hover:bg-white/20 transition cursor-pointer ml-1"
            title="Cerrar (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Contenedor Principal de la Imagen con Soporte Zoom */}
      <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
        <img
          src={currentImage}
          alt={`Referencia ${currentIndex + 1}`}
          style={{ transform: `scale(${scale})` }}
          className="max-h-[82vh] max-w-[94vw] object-contain rounded-lg transition-transform duration-150 shadow-2xl"
          draggable={false}
        />

        {/* Flechas de Navegación si hay más de 1 imagen */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition cursor-pointer shadow-lg active:scale-95 z-20"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition cursor-pointer shadow-lg active:scale-95 z-20"
              aria-label="Siguiente"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>

      {/* Tiras de Miniaturas si hay múltiples fotos */}
      {images.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-black/50 border-t border-white/10 overflow-x-auto z-20">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setScale(1)
                setCurrentIndex(idx)
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                idx === currentIndex
                  ? 'border-sky-400 scale-105 shadow-md shadow-sky-500/30'
                  : 'border-white/20 opacity-50 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
