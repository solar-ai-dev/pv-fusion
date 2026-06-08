import { useQuery } from '@tanstack/react-query'
import { trackingApi } from '../api/trackingApi'
import type { TrackingCompareParams, TrackingListParams } from '../types'

export const trackingQueryKeys = {
  all: ['tracking'] as const,
  list: (params: TrackingListParams) => [...trackingQueryKeys.all, 'list', params] as const,
  compare: (params: TrackingCompareParams) =>
    [...trackingQueryKeys.all, 'compare', params] as const,
}

export function useTracking(params: TrackingListParams, enabled = true) {
  return useQuery({
    queryKey: trackingQueryKeys.list(params),
    queryFn: () => trackingApi.fetchTracking(params),
    enabled,
  })
}

export function useTrackingCompare(params: TrackingCompareParams, enabled = true) {
  return useQuery({
    queryKey: trackingQueryKeys.compare(params),
    queryFn: () => trackingApi.fetchTrackingCompare(params),
    enabled: enabled && Number.isInteger(params.currentResultId) && params.currentResultId > 0,
    retry: false,
  })
}
