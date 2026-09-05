import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/modules/auth/useAuth'
import type { ExchangeRate, SaveExchangeRatePayload, ExchangeRateFilters } from '../types/exchangeRates.types'
import {
  getExchangeRates,
  getLatestExchangeRate,
  saveExchangeRate as saveService,
  deleteExchangeRate as deleteService,
} from '../services/exchangeRatesService'

export function useExchangeRates(filters?: ExchangeRateFilters) {
  const { profile } = useAuth()
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [latestRate, setLatestRate] = useState<ExchangeRate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRates = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [fetchedRates, latest] = await Promise.all([
        getExchangeRates(filters),
        getLatestExchangeRate(filters?.branch_id),
      ])
      setRates(fetchedRates)
      setLatestRate(latest)
    } catch (err: any) {
      console.error('[useExchangeRates] load error:', err)
      setError(err.message || 'Error al cargar tasas de cambio')
    } finally {
      setIsLoading(false)
    }
  }, [filters?.branch_id, filters?.start_date, filters?.end_date, filters?.limit])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  const saveRate = async (payload: SaveExchangeRatePayload): Promise<ExchangeRate> => {
    if (!profile?.id) throw new Error('Usuario no autenticado')
    setIsSaving(true)
    setError(null)
    try {
      const saved = await saveService(payload, profile.id)
      await loadRates()
      return saved
    } catch (err: any) {
      const msg = err.message || 'Error al guardar la tasa de cambio'
      setError(msg)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  const deleteRate = async (id: string): Promise<void> => {
    setIsSaving(true)
    setError(null)
    try {
      await deleteService(id)
      await loadRates()
    } catch (err: any) {
      const msg = err.message || 'Error al eliminar la tasa de cambio'
      setError(msg)
      throw err
    } finally {
      setIsSaving(false)
    }
  }

  return {
    rates,
    latestRate,
    isLoading,
    isSaving,
    error,
    refresh: loadRates,
    saveRate,
    deleteRate,
  }
}
