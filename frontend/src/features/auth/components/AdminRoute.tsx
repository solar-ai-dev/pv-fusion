import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { LoadingState } from '../../../shared/components/state/LoadingState'
import { useAuth } from '../hooks/useAuth'

export function AdminRoute({ children }: PropsWithChildren) {
  const hasInitialized = useAuth((state) => state.hasInitialized)
  const resolution = useAuth((state) => state.resolution)
  const user = useAuth((state) => state.user)

  if (!hasInitialized || resolution === 'loading') {
    return <LoadingState message="권한 상태를 확인하는 중입니다." />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (user.role !== 'ADMIN') {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
