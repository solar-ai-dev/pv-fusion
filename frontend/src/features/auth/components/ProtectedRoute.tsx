import { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ErrorState } from '../../../shared/components/state/ErrorState'
import { LoadingState } from '../../../shared/components/state/LoadingState'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation()
  const hasInitialized = useAuth((state) => state.hasInitialized)
  const resolution = useAuth((state) => state.resolution)
  const user = useAuth((state) => state.user)
  const error = useAuth((state) => state.error)

  if (!hasInitialized || resolution === 'loading') {
    return <LoadingState message="인증 상태를 확인하는 중입니다." />
  }

  if (resolution === 'error') {
    return (
      <ErrorState
        title="인증 서버에 연결할 수 없습니다."
        description={error?.detail ?? error?.message ?? '잠시 후 다시 시도해 주세요.'}
      />
    )
  }

  if (resolution === 'unauthenticated' || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (resolution === 'forbidden') {
    return <Navigate to="/forbidden" replace />
  }

  if (user.accountStatus === 'PENDING') {
    return <Navigate to="/pending" replace />
  }

  if (user.accountStatus === 'INACTIVE') {
    return <Navigate to="/forbidden" replace />
  }

  if (user.accountStatus !== 'APPROVED') {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
