import { useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export function AuthBootstrap() {
  const initialize = useAuth((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return null
}
