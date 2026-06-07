import { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const location = useLocation()
  const isAuthenticated = useAuth((state) => state.isAuthenticated)
  const user = useAuth((state) => state.user)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (user?.status === 'PENDING') {
    return <Navigate to="/pending" replace />
  }

  if (user?.status === 'INACTIVE') {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
