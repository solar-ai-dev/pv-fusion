import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { zoneQueryKeys } from '../../zones/hooks/useZones'
import { equipmentApi } from '../api/equipmentApi'
import type {
  CreateEquipmentRequest,
  EquipmentListParams,
  UpdateEquipmentRequest,
} from '../types'

export const equipmentQueryKeys = {
  all: ['equipments'] as const,
  byZone: (zoneId: number, params: EquipmentListParams) =>
    [...equipmentQueryKeys.all, 'zone', zoneId, params] as const,
  details: () => [...equipmentQueryKeys.all, 'detail'] as const,
  detail: (equipmentId: number) =>
    [...equipmentQueryKeys.details(), equipmentId] as const,
}

export function useEquipments(zoneId: number, params: EquipmentListParams) {
  return useQuery({
    queryKey: equipmentQueryKeys.byZone(zoneId, params),
    queryFn: () => equipmentApi.fetchEquipments(zoneId, params),
    enabled: Number.isInteger(zoneId) && zoneId > 0,
  })
}

export function useEquipment(equipmentId: number) {
  return useQuery({
    queryKey: equipmentQueryKeys.detail(equipmentId),
    queryFn: () => equipmentApi.fetchEquipment(equipmentId),
    enabled: Number.isInteger(equipmentId) && equipmentId > 0,
  })
}

export function useCreateEquipment(zoneId: number, params: EquipmentListParams) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateEquipmentRequest) =>
      equipmentApi.createEquipment(zoneId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: equipmentQueryKeys.byZone(zoneId, params),
      })
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.detail(zoneId) })
    },
  })
}

export function useUpdateEquipment(zoneId: number, params: EquipmentListParams) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      equipmentId,
      payload,
    }: {
      equipmentId: number
      payload: UpdateEquipmentRequest
    }) => equipmentApi.updateEquipment(equipmentId, payload),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: equipmentQueryKeys.byZone(zoneId, params),
      })
      void queryClient.invalidateQueries({
        queryKey: equipmentQueryKeys.detail(response.data.equipmentId),
      })
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.detail(zoneId) })
    },
  })
}

export function useDeactivateEquipment(
  zoneId: number,
  params: EquipmentListParams,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (equipmentId: number) => equipmentApi.deactivateEquipment(equipmentId),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({
        queryKey: equipmentQueryKeys.byZone(zoneId, params),
      })
      void queryClient.invalidateQueries({
        queryKey: equipmentQueryKeys.detail(response.data.equipmentId),
      })
      void queryClient.invalidateQueries({ queryKey: zoneQueryKeys.detail(zoneId) })
    },
  })
}
