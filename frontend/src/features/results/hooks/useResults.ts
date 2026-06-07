import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { resultApi } from '../api/resultApi'
import type {
  ResultListParams,
  ResultVisualizationType,
  UpdateActionCandidateRequest,
  UpdateReviewStatusRequest,
} from '../types'

export const resultQueryKeys = {
  all: ['analysis-results'] as const,
  lists: () => [...resultQueryKeys.all, 'list'] as const,
  list: (params: ResultListParams) => [...resultQueryKeys.lists(), params] as const,
  details: () => [...resultQueryKeys.all, 'detail'] as const,
  detail: (resultId: number) => [...resultQueryKeys.details(), resultId] as const,
  visualizations: () => [...resultQueryKeys.all, 'visualization'] as const,
  visualization: (resultId: number, type: ResultVisualizationType) =>
    [...resultQueryKeys.visualizations(), resultId, type] as const,
}

export function useResults(params: ResultListParams, enabled = true) {
  return useQuery({
    queryKey: resultQueryKeys.list(params),
    queryFn: () => resultApi.fetchResults(params),
    enabled,
  })
}

export function useResult(resultId: number) {
  return useQuery({
    queryKey: resultQueryKeys.detail(resultId),
    queryFn: () => resultApi.fetchResult(resultId),
    enabled: Number.isInteger(resultId) && resultId > 0,
  })
}

export function useResultVisualization(
  resultId: number,
  type: ResultVisualizationType,
  enabled = true,
) {
  return useQuery({
    queryKey: resultQueryKeys.visualization(resultId, type),
    queryFn: () => resultApi.fetchResultVisualization(resultId, { type }),
    enabled: enabled && Number.isInteger(resultId) && resultId > 0,
    retry: false,
  })
}

export function useUpdateReviewStatus(resultId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateReviewStatusRequest) =>
      resultApi.updateReviewStatus(resultId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resultQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: resultQueryKeys.detail(resultId) })
    },
  })
}

export function useUpdateActionCandidate(resultId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateActionCandidateRequest) =>
      resultApi.updateActionCandidate(resultId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resultQueryKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: resultQueryKeys.detail(resultId) })
    },
  })
}
