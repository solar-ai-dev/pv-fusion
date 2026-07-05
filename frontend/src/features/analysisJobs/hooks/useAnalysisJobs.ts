import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { analysisJobApi } from '../api/analysisJobApi'
import type {
  AnalysisJobListParams,
  CreateAnalysisJobRequest,
  RetryAnalysisJobRequest,
} from '../types'

export const analysisJobQueryKeys = {
  all: ['analysis-jobs'] as const,
  lists: () => [...analysisJobQueryKeys.all, 'list'] as const,
  list: (params: AnalysisJobListParams) =>
    [...analysisJobQueryKeys.lists(), params] as const,
  details: () => [...analysisJobQueryKeys.all, 'detail'] as const,
  detail: (jobId: number) => [...analysisJobQueryKeys.details(), jobId] as const,
}

export function useAnalysisJobs(params: AnalysisJobListParams, enabled = true) {
  return useQuery({
    queryKey: analysisJobQueryKeys.list(params),
    queryFn: () => analysisJobApi.fetchAnalysisJobs(params),
    enabled:
      enabled &&
      (params.inspectionId != null || params.plantId != null || params.zoneId != null),
  })
}

export function useAnalysisJob(jobId: number, enabled = true) {
  return useQuery({
    queryKey: analysisJobQueryKeys.detail(jobId),
    queryFn: () => analysisJobApi.fetchAnalysisJob(jobId),
    enabled: enabled && Number.isInteger(jobId) && jobId > 0,
  })
}

export function useCreateAnalysisJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateAnalysisJobRequest) =>
      analysisJobApi.createAnalysisJob(payload),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: analysisJobQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: analysisJobQueryKeys.detail(response.data.jobId),
      })
    },
  })
}

export function useRetryAnalysisJob(jobId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload?: RetryAnalysisJobRequest) =>
      analysisJobApi.retryAnalysisJob(jobId, payload),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: analysisJobQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: analysisJobQueryKeys.detail(response.data.jobId),
      })
      void queryClient.invalidateQueries({
        queryKey: analysisJobQueryKeys.detail(jobId),
      })
    },
  })
}
