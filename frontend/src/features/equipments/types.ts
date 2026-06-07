import type { ResourceStatus } from '../plants/types'

export type EquipmentType = 'ARRAY' | 'PANEL' | 'MODULE'

export type Equipment = {
  equipmentId: number
  zoneId: number
  parentEquipmentId: number | null
  equipmentType: EquipmentType
  name: string
  positionCode: string | null
  status: ResourceStatus
  createdByUserId: number
  createdAt: string
  updatedAt: string
}

export type EquipmentTreeNode = {
  equipmentId: number
  zoneId: number
  parentEquipmentId: number | null
  equipmentType: EquipmentType
  name: string
  positionCode: string | null
  status: ResourceStatus
  children: EquipmentTreeNode[]
}

export type EquipmentListParams = {
  equipmentType?: EquipmentType
  status?: ResourceStatus
}

export type CreateEquipmentRequest = {
  parentEquipmentId?: number | null
  equipmentType: EquipmentType
  name: string
  positionCode?: string | null
}

export type UpdateEquipmentRequest = CreateEquipmentRequest

export const EQUIPMENT_TYPE_OPTIONS = ['ARRAY', 'PANEL', 'MODULE'] as const

export function getEquipmentTypeLabel(type: EquipmentType) {
  if (type === 'ARRAY') {
    return 'Array'
  }

  if (type === 'PANEL') {
    return 'Panel'
  }

  return 'Module'
}

export function flattenEquipmentTree(
  nodes: EquipmentTreeNode[],
): Array<EquipmentTreeNode & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth: 0 },
    ...flattenEquipmentTree(node.children).map((child) => ({
      ...child,
      depth: child.depth + 1,
    })),
  ])
}
