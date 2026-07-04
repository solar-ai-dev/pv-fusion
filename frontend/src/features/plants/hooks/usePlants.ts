import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { plantApi } from '../api/plantApi'
import type {
  CreatePlantRequest,
  PlantListParams,
  UpdatePlantRequest,
} from '../types'

export const plantQueryKeys = {
  all: ['plants'] as const,
  lists: () => [...plantQueryKeys.all, 'list'] as const,
  list: (params: PlantListParams) => [...plantQueryKeys.lists(), params] as const,
  details: () => [...plantQueryKeys.all, 'detail'] as const,
  detail: (plantId: number) => [...plantQueryKeys.details(), plantId] as const,
}

export function usePlants(params: PlantListParams) {
  return useQuery({
    queryKey: plantQueryKeys.list(params),
    queryFn: () => plantApi.fetchPlants(params),
  })
}

export function usePlant(plantId: number) {
  return useQuery({
    queryKey: plantQueryKeys.detail(plantId),
    queryFn: () => plantApi.fetchPlant(plantId),
    enabled: Number.isInteger(plantId) && plantId > 0,
  })
}

export function usePlantDeleteImpact(plantId: number, enabled = true) {
  return useQuery({
    queryKey: [...plantQueryKeys.detail(plantId), 'delete-impact'] as const,
    queryFn: () => plantApi.fetchDeleteImpact(plantId),
    enabled: enabled && Number.isInteger(plantId) && plantId > 0,
  })
}

export function useCreatePlant() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreatePlantRequest) => plantApi.createPlant(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.lists() })
    },
  })
}

export function useUpdatePlant(plantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdatePlantRequest) =>
      plantApi.updatePlant(plantId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.detail(plantId) })
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.lists() })
    },
  })
}

export function useDeactivatePlant(plantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => plantApi.deactivatePlant(plantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.detail(plantId) })
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.lists() })
    },
  })
}

export function useDeletePlant(plantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => plantApi.deletePlant(plantId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.lists() })
    },
  })
}
