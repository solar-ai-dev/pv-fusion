import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { zoneQueryKeys } from '../../zones/hooks/useZones'
import { inspectionApi } from '../api/inspectionApi'
import type {
  CreateInspectionRequest,
  InspectionListParams,
  UpdateInspectionRequest,
} from '../types'

export const inspectionQueryKeys = {
  all: ['inspections'] as const,
  lists: () => [...inspectionQueryKeys.all, 'list'] as const,
  list: (params: InspectionListParams) =>
    [...inspectionQueryKeys.lists(), params] as const,
  details: () => [...inspectionQueryKeys.all, 'detail'] as const,
  detail: (inspectionId: number) =>
    [...inspectionQueryKeys.details(), inspectionId] as const,
}

export function useInspections(params: InspectionListParams) {
  return useQuery({
    queryKey: inspectionQueryKeys.list(params),
    queryFn: () => inspectionApi.fetchInspections(params),
  })
}

export function useInspection(inspectionId: number) {
  return useQuery({
    queryKey: inspectionQueryKeys.detail(inspectionId),
    queryFn: () => inspectionApi.fetchInspection(inspectionId),
    enabled: Number.isInteger(inspectionId) && inspectionId > 0,
  })
}

export function useCreateInspection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateInspectionRequest) =>
      inspectionApi.createInspection(payload),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: inspectionQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: zoneQueryKeys.detail(response.data.zoneId),
      })
    },
  })
}

export function useUpdateInspection(inspectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateInspectionRequest) =>
      inspectionApi.updateInspection(inspectionId, payload),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: inspectionQueryKeys.detail(inspectionId),
      })
      void queryClient.invalidateQueries({ queryKey: inspectionQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: zoneQueryKeys.detail(response.data.zoneId),
      })
    },
  })
}
