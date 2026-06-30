import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboardApi'
import type {
  DashboardQueryParams,
  DashboardTrendQueryParams,
} from '../types'

export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  summary: (params: DashboardQueryParams) => [...dashboardQueryKeys.all, 'summary', params] as const,
  actionStats: (params: DashboardQueryParams) =>
    [...dashboardQueryKeys.all, 'action-stats', params] as const,
  severityStats: (params: DashboardQueryParams) =>
    [...dashboardQueryKeys.all, 'severity-stats', params] as const,
  trends: (params: DashboardTrendQueryParams) =>
    [...dashboardQueryKeys.all, 'trends', params] as const,
}

export function useDashboardSummary(params: DashboardQueryParams, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.summary(params),
    queryFn: () => dashboardApi.fetchDashboard(params),
    enabled,
  })
}

export function useDashboardActionStats(params: DashboardQueryParams, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.actionStats(params),
    queryFn: () => dashboardApi.fetchActionStats(params),
    enabled,
  })
}

export function useDashboardSeverityStats(params: DashboardQueryParams, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.severityStats(params),
    queryFn: () => dashboardApi.fetchSeverityStats(params),
    enabled,
  })
}

export function useDashboardTrends(params: DashboardTrendQueryParams, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.trends(params),
    queryFn: () => dashboardApi.fetchTrends(params),
    enabled,
  })
}
