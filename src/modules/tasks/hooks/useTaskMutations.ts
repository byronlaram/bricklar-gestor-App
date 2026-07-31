import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  changeTaskStatus,
} from '../services/tasksService'
import type {
  CreateTaskPayload,
  UpdateTaskPayload,
  AssignCourierPayload,
  ChangeStatusPayload,
} from '../types/task.types'

export function useTaskMutations() {
  const queryClient = useQueryClient()

  const invalidateTaskQueries = (taskId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] })
    if (taskId) {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task-history', taskId] })
      queryClient.invalidateQueries({ queryKey: ['task-assignments', taskId] })
    }
  }

  const createTaskMutation = useMutation({
    mutationFn: (payload: CreateTaskPayload) => createTask(payload),
    onSuccess: () => invalidateTaskQueries(),
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      updateTask(id, payload),
    onSuccess: (data) => invalidateTaskQueries(data.id),
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: (_, id) => invalidateTaskQueries(id),
  })

  const assignTaskMutation = useMutation({
    mutationFn: (payload: AssignCourierPayload) => assignTask(payload),
    onSuccess: (data) => invalidateTaskQueries(data.id),
  })

  const changeStatusMutation = useMutation({
    mutationFn: (payload: ChangeStatusPayload) => changeTaskStatus(payload),
    onSuccess: (data) => invalidateTaskQueries(data.id),
  })

  return {
    createTask: createTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
    createError: createTaskMutation.error,

    updateTask: updateTaskMutation.mutateAsync,
    isUpdating: updateTaskMutation.isPending,
    updateError: updateTaskMutation.error,

    deleteTask: deleteTaskMutation.mutateAsync,
    isDeleting: deleteTaskMutation.isPending,

    assignTask: assignTaskMutation.mutateAsync,
    isAssigning: assignTaskMutation.isPending,
    assignError: assignTaskMutation.error,

    changeStatus: changeStatusMutation.mutateAsync,
    isChangingStatus: changeStatusMutation.isPending,
    statusError: changeStatusMutation.error,
  }
}
