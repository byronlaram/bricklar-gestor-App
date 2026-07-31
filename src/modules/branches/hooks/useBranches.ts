import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBranches, createBranch, updateBranch, toggleBranchStatus } from '../services/branchesService'
import type { CreateBranchPayload, UpdateBranchPayload } from '../types/branches.types'

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: () => getBranches(),
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

export function useBranchMutations() {
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (payload: CreateBranchPayload) => createBranch(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBranchPayload }) =>
      updateBranch(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  })

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleBranchStatus(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  })

  return {
    createBranch: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,

    updateBranch: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,

    toggleBranchStatus: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,
  }
}
