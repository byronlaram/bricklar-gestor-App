import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDirectoryContacts,
  createDirectoryContact,
  updateDirectoryContact,
  deleteDirectoryContact,
} from '../services/directoryService'
import type {
  CreateContactPayload,
  UpdateContactPayload,
  DirectoryFilters,
} from '../types/directory.types'
import { useToast } from '@/shared/components/ui'

export const DIRECTORY_QUERY_KEY = ['directory_contacts']

export function useDirectoryContacts(filters?: DirectoryFilters) {
  return useQuery({
    queryKey: [...DIRECTORY_QUERY_KEY, filters],
    queryFn: () => getDirectoryContacts(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: CreateContactPayload) => createDirectoryContact(payload),
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: DIRECTORY_QUERY_KEY })
      toast.success('Contacto guardado', `"${newContact.name}" fue agregado al directorio.`)
    },
    onError: (error: Error) => {
      toast.error('Error al guardar contacto', error.message)
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (payload: UpdateContactPayload) => updateDirectoryContact(payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: DIRECTORY_QUERY_KEY })
      toast.success('Contacto actualizado', `"${updated.name}" fue modificado correctamente.`)
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar contacto', error.message)
    },
  })
}

export function useDeleteContact() {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: (id: string) => deleteDirectoryContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DIRECTORY_QUERY_KEY })
      toast.success('Contacto eliminado', 'La entidad fue removida del directorio.')
    },
    onError: (error: Error) => {
      toast.error('Error al eliminar contacto', error.message)
    },
  })
}
