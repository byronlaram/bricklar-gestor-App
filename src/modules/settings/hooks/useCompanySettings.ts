import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getCompanySettings,
  saveCompanySettings,
  uploadCompanyLogo,
  type CompanySettings,
  DEFAULT_COMPANY_SETTINGS,
} from '../services/companySettingsService'
import { useAuth } from '@/modules/auth/useAuth'

export const COMPANY_SETTINGS_QUERY_KEY = ['company-profile-settings']

export function useCompanySettings() {
  const queryClient = useQueryClient()
  const { profile } = useAuth()

  const query = useQuery<CompanySettings>({
    queryKey: COMPANY_SETTINGS_QUERY_KEY,
    queryFn: getCompanySettings,
    staleTime: 1000 * 60 * 10, // 10 minutos
  })

  const saveMutation = useMutation({
    mutationFn: (newSettings: CompanySettings) =>
      saveCompanySettings(newSettings, profile?.id),
    onSuccess: (_, variables) => {
      queryClient.setQueryData(COMPANY_SETTINGS_QUERY_KEY, variables)
    },
  })

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
  })

  return {
    settings: query.data || DEFAULT_COMPANY_SETTINGS,
    isLoading: query.isLoading,
    isError: query.isError,
    saveSettings: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    uploadLogo: uploadLogoMutation.mutateAsync,
    isUploadingLogo: uploadLogoMutation.isPending,
  }
}
