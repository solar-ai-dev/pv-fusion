import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { analysisJobQueryKeys } from '../../analysisJobs/hooks/useAnalysisJobs'
import { inspectionQueryKeys } from '../../inspections/hooks/useInspections'
import { imageQueryKeys } from '../../images/hooks/useImages'
import { imagePairApi } from '../api/imagePairApi'
import type {
  CreateImagePairRequest,
  ImagePairCandidateParams,
  UpdateImagePairRequest,
} from '../types'

export const imagePairQueryKeys = {
  all: ['image-pairs'] as const,
  candidates: () => [...imagePairQueryKeys.all, 'candidates'] as const,
  candidate: (params: ImagePairCandidateParams) =>
    [...imagePairQueryKeys.candidates(), params] as const,
  details: () => [...imagePairQueryKeys.all, 'detail'] as const,
  detail: (imagePairId: number) =>
    [...imagePairQueryKeys.details(), imagePairId] as const,
}

export function useImagePairCandidates(
  params: ImagePairCandidateParams,
  enabled = true,
) {
  return useQuery({
    queryKey: imagePairQueryKeys.candidate(params),
    queryFn: () => imagePairApi.fetchImagePairCandidates(params),
    enabled:
      enabled &&
      Number.isInteger(params.inspectionId) &&
      params.inspectionId > 0 &&
      (params.targetType === 'ZONE'
        ? params.equipmentId == null
        : Number.isInteger(params.equipmentId) && Number(params.equipmentId) > 0),
  })
}

export function useImagePair(imagePairId: number, enabled = true) {
  return useQuery({
    queryKey: imagePairQueryKeys.detail(imagePairId),
    queryFn: () => imagePairApi.fetchImagePair(imagePairId),
    enabled: enabled && Number.isInteger(imagePairId) && imagePairId > 0,
  })
}

export function useCreateImagePair(inspectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateImagePairRequest) => imagePairApi.createImagePair(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: imagePairQueryKeys.candidates() })
      void queryClient.invalidateQueries({ queryKey: imagePairQueryKeys.details() })
      void queryClient.invalidateQueries({ queryKey: imageQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: inspectionQueryKeys.detail(inspectionId),
      })
      void queryClient.invalidateQueries({ queryKey: analysisJobQueryKeys.lists() })
    },
  })
}

export function useUpdateImagePair(inspectionId: number, imagePairId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateImagePairRequest) =>
      imagePairApi.updateImagePair(imagePairId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: imagePairQueryKeys.candidates() })
      void queryClient.invalidateQueries({
        queryKey: imagePairQueryKeys.detail(imagePairId),
      })
      void queryClient.invalidateQueries({
        queryKey: inspectionQueryKeys.detail(inspectionId),
      })
      void queryClient.invalidateQueries({ queryKey: analysisJobQueryKeys.lists() })
    },
  })
}

export function useDeactivateImagePair(inspectionId: number, imagePairId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => imagePairApi.deactivateImagePair(imagePairId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: imagePairQueryKeys.candidates() })
      void queryClient.invalidateQueries({
        queryKey: imagePairQueryKeys.detail(imagePairId),
      })
      void queryClient.invalidateQueries({
        queryKey: inspectionQueryKeys.detail(inspectionId),
      })
      void queryClient.invalidateQueries({ queryKey: analysisJobQueryKeys.lists() })
    },
  })
}
