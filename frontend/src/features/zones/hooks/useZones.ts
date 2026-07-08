import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { plantQueryKeys } from '../../plants/hooks/usePlants'
import { zoneApi } from '../api/zoneApi'
import type { CreateZoneRequest, UpdateZoneRequest } from '../types'

export const zoneQueryKeys = {
  all: ['zones'] as const,
  byPlant: (plantId: number) => [...zoneQueryKeys.all, 'plant', plantId] as const,
  details: () => [...zoneQueryKeys.all, 'detail'] as const,
  detail: (zoneId: number) => [...zoneQueryKeys.details(), zoneId] as const,
}

export function useZonesByPlantId(plantId: number) {
  return useQuery({
    queryKey: zoneQueryKeys.byPlant(plantId),
    queryFn: () => zoneApi.fetchZonesByPlantId(plantId),
    enabled: Number.isInteger(plantId) && plantId > 0,
  })
}

export function useZone(zoneId: number) {
  return useQuery({
    queryKey: zoneQueryKeys.detail(zoneId),
    queryFn: () => zoneApi.fetchZone(zoneId),
    enabled: Number.isInteger(zoneId) && zoneId > 0,
  })
}

export function useZoneDeleteImpact(zoneId: number, enabled = true) {
  return useQuery({
    queryKey: [...zoneQueryKeys.detail(zoneId), 'delete-impact'] as const,
    queryFn: () => zoneApi.fetchDeleteImpact(zoneId),
    enabled: enabled && Number.isInteger(zoneId) && zoneId > 0,
  })
}

export function useCreateZone(plantId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateZoneRequest) => zoneApi.createZone(plantId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.byPlant(plantId) })
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.detail(plantId) })
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.lists() })
    },
  })
}

export function useUpdateZone(zoneId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateZoneRequest) => zoneApi.updateZone(zoneId, payload),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.detail(zoneId) })
      void queryClient.invalidateQueries({
        queryKey: zoneQueryKeys.byPlant(response.data.plantId),
      })
      void queryClient.invalidateQueries({
        queryKey: plantQueryKeys.detail(response.data.plantId),
      })
    },
  })
}

export function useDeactivateZone(zoneId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => zoneApi.deactivateZone(zoneId),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.detail(zoneId) })
      void queryClient.invalidateQueries({
        queryKey: zoneQueryKeys.byPlant(response.data.plantId),
      })
      void queryClient.invalidateQueries({
        queryKey: plantQueryKeys.detail(response.data.plantId),
      })
    },
  })
}

export function useDeleteZone(zoneId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => zoneApi.deleteZone(zoneId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.detail(zoneId) })
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.all })
      void queryClient.invalidateQueries({ queryKey: plantQueryKeys.all })
    },
  })
}
