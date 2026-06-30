import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <main className="auth-shell">
      <div className="auth-backdrop" />
      <div className="auth-panel">
        <Outlet />
      </div>
    </main>
  )
}
