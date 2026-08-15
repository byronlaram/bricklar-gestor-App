import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createTask,
  updateTask,
  deleteTask,
  assignTask,
  changeTaskStatus,
  updateTaskRouteOrders,
  approveTask,
  rejectTask,
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

  const approveTaskMutation = useMutation({
    mutationFn: ({ taskId, notes }: { taskId: string; notes?: string }) =>
      approveTask(taskId, notes),
    onSuccess: (data) => invalidateTaskQueries(data.id),
  })

  const rejectTaskMutation = useMutation({
    mutationFn: ({ taskId, reason }: { taskId: string; reason: string }) =>
      rejectTask(taskId, reason),
    onSuccess: (data) => invalidateTaskQueries(data.id),
  })

  const reorderTasksMutation = useMutation({
    mutationFn: (items: { id: string; route_order: number }[]) => updateTaskRouteOrders(items),
    onMutate: async (newOrders) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousQueriesData = queryClient.getQueriesData({ queryKey: ['tasks'] })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (oldData: any) => {
        if (!oldData || !oldData.data) return oldData
        const orderMap = new Map(newOrders.map((item) => [item.id, item.route_order]))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedList = oldData.data.map((task: any) => {
          if (orderMap.has(task.id)) {
            return { ...task, route_order: orderMap.get(task.id) }
          }
          return task
        })
        return {
          ...oldData,
          data: updatedList,
        }
      })

      return { previousQueriesData }
    },
    onError: (err, _newOrders, context) => {
      console.error('[Tasks] reorderTasks mutation error:', err)
      if (context?.previousQueriesData) {
        context.previousQueriesData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
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

    approveTask: approveTaskMutation.mutateAsync,
    isApproving: approveTaskMutation.isPending,
    approveError: approveTaskMutation.error,

    rejectTask: rejectTaskMutation.mutateAsync,
    isRejecting: rejectTaskMutation.isPending,
    rejectError: rejectTaskMutation.error,

    reorderTasks: reorderTasksMutation.mutateAsync,
    isReordering: reorderTasksMutation.isPending,
    reorderError: reorderTasksMutation.error,
  }
}
