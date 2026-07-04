import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { inspectionQueryKeys } from '../../inspections/hooks/useInspections'
import { imageApi } from '../api/imageApi'
import type { ImageListParams, UploadImageRequest } from '../types'

export const imageQueryKeys = {
  all: ['images'] as const,
  lists: () => [...imageQueryKeys.all, 'list'] as const,
  list: (params: ImageListParams) => [...imageQueryKeys.lists(), params] as const,
  details: () => [...imageQueryKeys.all, 'detail'] as const,
  detail: (imageId: number) => [...imageQueryKeys.details(), imageId] as const,
  previews: () => [...imageQueryKeys.all, 'preview'] as const,
  preview: (imageId: number) => [...imageQueryKeys.previews(), imageId] as const,
}

export function useImages(params: ImageListParams) {
  return useQuery({
    queryKey: imageQueryKeys.list(params),
    queryFn: () => imageApi.fetchImages(params),
  })
}

export function useImagePreview(imageId: number, enabled = true) {
  return useQuery({
    queryKey: imageQueryKeys.preview(imageId),
    queryFn: () => imageApi.fetchImagePreview(imageId),
    enabled: enabled && Number.isInteger(imageId) && imageId > 0,
  })
}

export function useImageDeleteImpact(imageId: number, enabled = true) {
  return useQuery({
    queryKey: [...imageQueryKeys.detail(imageId), 'delete-impact'] as const,
    queryFn: () => imageApi.fetchDeleteImpact(imageId),
    enabled: enabled && Number.isInteger(imageId) && imageId > 0,
  })
}

export function useUploadImage(inspectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UploadImageRequest) => imageApi.uploadImage(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: imageQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: inspectionQueryKeys.detail(inspectionId),
      })
    },
  })
}

export function useDeactivateImage(inspectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (imageId: number) => imageApi.deactivateImage(imageId),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: imageQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: imageQueryKeys.detail(response.data.imageId),
      })
      void queryClient.invalidateQueries({
        queryKey: inspectionQueryKeys.detail(inspectionId),
      })
    },
  })
}

export function useDeleteImage(inspectionId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (imageId: number) => imageApi.deleteImage(imageId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: imageQueryKeys.lists() })
      void queryClient.invalidateQueries({
        queryKey: inspectionQueryKeys.detail(inspectionId),
      })
    },
  })
}
