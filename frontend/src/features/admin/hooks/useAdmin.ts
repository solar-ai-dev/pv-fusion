import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { adminApi } from '../api/adminApi'
import type {
  AdminUserListParams,
  ChangeUserRoleRequest,
  OperationLogListParams,
} from '../types'

export const adminQueryKeys = {
  all: ['admin'] as const,
  pendingUsers: (params: Pick<AdminUserListParams, 'page' | 'size'>) =>
    [...adminQueryKeys.all, 'pending-users', params] as const,
  users: (params: AdminUserListParams) => [...adminQueryKeys.all, 'users', params] as const,
  user: (userId: number) => [...adminQueryKeys.all, 'user', userId] as const,
  operationLogs: (params: OperationLogListParams) =>
    [...adminQueryKeys.all, 'operation-logs', params] as const,
}

export function usePendingAdminUsers(params: Pick<AdminUserListParams, 'page' | 'size'>) {
  return useQuery({
    queryKey: adminQueryKeys.pendingUsers(params),
    queryFn: () => adminApi.fetchPendingUsers(params),
  })
}

export function useAdminUsers(params: AdminUserListParams) {
  return useQuery({
    queryKey: adminQueryKeys.users(params),
    queryFn: () => adminApi.fetchUsers(params),
  })
}

export function useAdminUser(userId: number) {
  return useQuery({
    queryKey: adminQueryKeys.user(userId),
    queryFn: () => adminApi.fetchUser(userId),
    enabled: Number.isInteger(userId) && userId > 0,
  })
}

export function useOperationLogs(params: OperationLogListParams) {
  return useQuery({
    queryKey: adminQueryKeys.operationLogs(params),
    queryFn: () => adminApi.fetchOperationLogs(params),
  })
}

export function useApproveAdminUser(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => adminApi.approveUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'pending-users'] })
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'users'] })
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'operation-logs'] })
    },
  })
}

export function useChangeAdminUserRole(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: ChangeUserRoleRequest) => adminApi.updateUserRole(userId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'users'] })
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'operation-logs'] })
    },
  })
}

export function useDeactivateAdminUser(userId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => adminApi.deactivateUser(userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'pending-users'] })
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'users'] })
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) })
      void queryClient.invalidateQueries({ queryKey: [...adminQueryKeys.all, 'operation-logs'] })
    },
  })
}
