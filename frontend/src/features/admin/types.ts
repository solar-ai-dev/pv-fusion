import type { AccountStatus, UserRole } from '../auth/types'

export type PlantMemberRole = 'OWNER' | 'MANAGER' | 'VIEWER'
export type ResourceStatus = 'ACTIVE' | 'INACTIVE'

export type AdminUserSummary = {
  userId: number
  email: string
  name: string
  role: UserRole
  accountStatus: AccountStatus
  lastLoginAt: string | null
}

export type AdminPlantMember = {
  plantMemberId: number
  plantId: number
  userId: number
  memberRole: PlantMemberRole
  status: ResourceStatus
  createdAt: string
  updatedAt: string
}

export type AdminUser = AdminUserSummary & {
  provider: string
  providerUserId: string
  createdAt: string
  updatedAt: string
  plantMembers: AdminPlantMember[]
}

export type AdminUserListParams = {
  keyword?: string
  role?: UserRole
  accountStatus?: AccountStatus
  page: number
  size: number
}

export type ChangeUserRoleRequest = {
  role: UserRole
}

export type OperationEventCategory =
  | 'AUTH'
  | 'IMAGE'
  | 'ANALYSIS'
  | 'RESULT'
  | 'ADMIN'

export type OperationEventType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'USER_APPROVED'
  | 'USER_ROLE_CHANGED'
  | 'USER_DEACTIVATED'
  | 'PLANT_CREATED'
  | 'PLANT_UPDATED'
  | 'PLANT_DEACTIVATED'
  | 'PLANT_ACCESS_GRANTED'
  | 'PLANT_MEMBER_ROLE_CHANGED'
  | 'PLANT_MEMBER_DEACTIVATED'
  | 'ZONE_CREATED'
  | 'ZONE_UPDATED'
  | 'ZONE_DEACTIVATED'
  | 'EQUIPMENT_CREATED'
  | 'EQUIPMENT_UPDATED'
  | 'EQUIPMENT_DEACTIVATED'
  | 'IMAGE_UPLOADED'
  | 'ANALYSIS_REQUESTED'
  | 'RESULT_REVIEW_STATUS_CHANGED'
  | 'RESULT_ACTION_CANDIDATE_CHANGED'
  | 'SYSTEM_ERROR'

export type OperationLogSummary = {
  operationLogId: number
  actorUserId: number | null
  actorEmail: string | null
  actorRole: string | null
  eventCategory: OperationEventCategory
  eventType: OperationEventType
  targetTable: string | null
  targetId: number | null
  message: string | null
  createdAt: string
}

export type OperationLogListParams = {
  actorUserId?: number
  eventCategory?: OperationEventCategory
  eventType?: OperationEventType
  plantId?: number
  zoneId?: number
  inspectionId?: number
  imageId?: number
  imagePairId?: number
  analysisJobId?: number
  analysisResultId?: number
  from?: string
  to?: string
  keyword?: string
  page: number
  size: number
  sort?: string
}

export const USER_ROLE_OPTIONS: UserRole[] = ['USER', 'ADMIN']
export const ACCOUNT_STATUS_OPTIONS: AccountStatus[] = ['PENDING', 'APPROVED', 'INACTIVE']
export const OPERATION_EVENT_CATEGORY_OPTIONS: OperationEventCategory[] = [
  'AUTH',
  'IMAGE',
  'ANALYSIS',
  'RESULT',
  'ADMIN',
]
export const OPERATION_EVENT_TYPE_OPTIONS: OperationEventType[] = [
  'LOGIN',
  'LOGOUT',
  'USER_APPROVED',
  'USER_ROLE_CHANGED',
  'USER_DEACTIVATED',
  'PLANT_CREATED',
  'PLANT_UPDATED',
  'PLANT_DEACTIVATED',
  'PLANT_ACCESS_GRANTED',
  'PLANT_MEMBER_ROLE_CHANGED',
  'PLANT_MEMBER_DEACTIVATED',
  'ZONE_CREATED',
  'ZONE_UPDATED',
  'ZONE_DEACTIVATED',
  'EQUIPMENT_CREATED',
  'EQUIPMENT_UPDATED',
  'EQUIPMENT_DEACTIVATED',
  'IMAGE_UPLOADED',
  'ANALYSIS_REQUESTED',
  'RESULT_REVIEW_STATUS_CHANGED',
  'RESULT_ACTION_CANDIDATE_CHANGED',
  'SYSTEM_ERROR',
]

export function getUserRoleLabel(role: UserRole) {
  switch (role) {
    case 'USER':
      return '사용자'
    case 'ADMIN':
      return '관리자'
  }
}

export function getUserRoleTone(role: UserRole) {
  switch (role) {
    case 'USER':
      return 'default' as const
    case 'ADMIN':
      return 'warning' as const
  }
}

export function getAccountStatusLabel(status: AccountStatus) {
  switch (status) {
    case 'PENDING':
      return '승인 대기'
    case 'APPROVED':
      return '승인 완료'
    case 'INACTIVE':
      return '비활성'
  }
}

export function getAccountStatusTone(status: AccountStatus) {
  switch (status) {
    case 'PENDING':
      return 'warning' as const
    case 'APPROVED':
      return 'success' as const
    case 'INACTIVE':
      return 'danger' as const
  }
}

export function getPlantMemberRoleLabel(role: PlantMemberRole) {
  switch (role) {
    case 'OWNER':
      return '소유자'
    case 'MANAGER':
      return '관리자'
    case 'VIEWER':
      return '조회 전용'
  }
}

export function getResourceStatusLabel(status: ResourceStatus) {
  switch (status) {
    case 'ACTIVE':
      return '활성'
    case 'INACTIVE':
      return '비활성'
  }
}

export function getOperationEventCategoryLabel(category: OperationEventCategory) {
  switch (category) {
    case 'AUTH':
      return '인증'
    case 'IMAGE':
      return '이미지'
    case 'ANALYSIS':
      return '분석'
    case 'RESULT':
      return '결과'
    case 'ADMIN':
      return '관리'
  }
}

export function getOperationEventTypeLabel(type: OperationEventType) {
  switch (type) {
    case 'LOGIN':
      return '로그인'
    case 'LOGOUT':
      return '로그아웃'
    case 'USER_APPROVED':
      return '사용자 승인'
    case 'USER_ROLE_CHANGED':
      return '권한 변경'
    case 'USER_DEACTIVATED':
      return '사용자 비활성화'
    case 'PLANT_CREATED':
      return '발전소 등록'
    case 'PLANT_UPDATED':
      return '발전소 수정'
    case 'PLANT_DEACTIVATED':
      return '발전소 비활성화'
    case 'PLANT_ACCESS_GRANTED':
      return '발전소 접근 권한 부여'
    case 'PLANT_MEMBER_ROLE_CHANGED':
      return '발전소 멤버 권한 변경'
    case 'PLANT_MEMBER_DEACTIVATED':
      return '발전소 멤버 비활성화'
    case 'ZONE_CREATED':
      return '점검 영역 등록'
    case 'ZONE_UPDATED':
      return '점검 영역 수정'
    case 'ZONE_DEACTIVATED':
      return '점검 영역 비활성화'
    case 'EQUIPMENT_CREATED':
      return '설비 등록'
    case 'EQUIPMENT_UPDATED':
      return '설비 수정'
    case 'EQUIPMENT_DEACTIVATED':
      return '설비 비활성화'
    case 'IMAGE_UPLOADED':
      return '이미지 업로드'
    case 'ANALYSIS_REQUESTED':
      return '분석 요청'
    case 'RESULT_REVIEW_STATUS_CHANGED':
      return '결과 검토 상태 변경'
    case 'RESULT_ACTION_CANDIDATE_CHANGED':
      return '조치 후보 변경'
    case 'SYSTEM_ERROR':
      return '시스템 오류'
  }
}
