import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  sendPasswordResetLink,
  generateTempPassword,
} from '../services/usersService'
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

  const invalidateUserAndCourierQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    queryClient.invalidateQueries({ queryKey: ['couriers'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => invalidateUserAndCourierQueries(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: () => invalidateUserAndCourierQueries(),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserStatus(id, isActive),
    onSuccess: () => invalidateUserAndCourierQueries(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => invalidateUserAndCourierQueries(),
  })

  const sendResetLinkMutation = useMutation({
    mutationFn: ({ email, userId }: { email: string; userId: string }) =>
      sendPasswordResetLink(email, userId),
  })

  const generateTempPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      generateTempPassword(userId, password),
    onSuccess: () => invalidateUserAndCourierQueries(),
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

    deleteUser: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,

    sendResetLink: sendResetLinkMutation.mutateAsync,
    isSendingResetLink: sendResetLinkMutation.isPending,

    generateTempPassword: generateTempPasswordMutation.mutateAsync,
    isGeneratingTempPassword: generateTempPasswordMutation.isPending,
  }
}
