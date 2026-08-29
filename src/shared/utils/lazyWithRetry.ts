import { lazy, type ComponentType } from 'react'

/**
 * Envoltorio resiliente para React.lazy con reintentos automáticos.
 * Si la descarga de un chunk dinámico falla (por ejemplo, microcorte de red en LTE,
 * o nueva versión desplegada con hashes distintos), reintenta la carga.
 * Si agota los reintentos, fuerza una recarga de página única para limpiar la caché del navegador.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retriesLeft = 2,
  interval = 1000
): React.LazyExoticComponent<T> {
  return lazy(() => {
    return new Promise<{ default: T }>((resolve, reject) => {
      function execute(attempts: number, delay: number) {
        factory()
          .then((module) => {
            // Éxito: limpiar bandera de recarga si existía
            if (typeof window !== 'undefined') {
              window.sessionStorage.removeItem('chunk_load_failed_reloaded')
            }
            resolve(module)
          })
          .catch((error) => {
            if (attempts <= 0) {
              if (typeof window !== 'undefined') {
                const hasReloaded = window.sessionStorage.getItem('chunk_load_failed_reloaded')
                if (!hasReloaded) {
                  window.sessionStorage.setItem('chunk_load_failed_reloaded', 'true')
                  window.location.reload()
                  return
                }
              }
              reject(error)
              return
            }

            window.setTimeout(() => {
              execute(attempts - 1, delay * 1.5)
            }, delay)
          })
      }

      execute(retriesLeft, interval)
    })
  })
}
