import { PropsWithChildren } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AdminRoute({ children }: PropsWithChildren) {
  const user = useAuth((state) => state.user)

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/forbidden" replace />
  }

  return <>{children}</>
}
