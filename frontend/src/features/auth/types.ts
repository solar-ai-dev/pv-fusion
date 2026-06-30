export type UserRole = 'USER' | 'ADMIN'
export type AccountStatus = 'PENDING' | 'APPROVED' | 'INACTIVE'

export type AuthUser = {
  userId: number
  email: string
  name: string
  provider: string
  providerUserId: string
  role: UserRole
  accountStatus: AccountStatus
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
  plantMembers: unknown[]
}

export type AuthResolution =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'forbidden'
  | 'error'
