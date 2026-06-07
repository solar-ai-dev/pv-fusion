export type UserRole = 'USER' | 'ADMIN'
export type AccountStatus = 'PENDING' | 'APPROVED' | 'INACTIVE'

export type AuthUser = {
  id: number
  name: string
  email: string
  role: UserRole
  status: AccountStatus
}
