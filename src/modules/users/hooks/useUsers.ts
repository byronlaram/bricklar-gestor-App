import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, toggleUserStatus } from '../services/usersService'
import type { UserFilters, CreateUserPayload, UpdateUserPayload } from '../types/users.types'

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => getUsers(filters),
    staleTime: 1000 * 30,
  })
}

export function useUserMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })

  return {
    createUser: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateUser: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    toggleUserStatus: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,
  }
}
