import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../features/auth/hooks/useAuth'
import { useToast } from '../../hooks/useToast'

export function TopNavbar() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pushToast = useToast().push
  const user = useAuth((state) => state.user)
  const isLoggingOut = useAuth((state) => state.isLoggingOut)
  const logout = useAuth((state) => state.logout)

  const handleLogout = async () => {
    const result = await logout()

    if (!result.success) {
      pushToast(result.message ?? '로그아웃 처리 중 문제가 발생했습니다.')
      return
    }

    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <header className="top-navbar">
      <div className="min-w-0">
        <span className="eyebrow">PV Fusion</span>
        <h1 className="text-lg font-semibold text-slate-900">태양광 점검 운영 화면</h1>
      </div>
      <div className="top-navbar-actions flex flex-wrap items-center gap-3">
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 whitespace-nowrap">
          {user ? `${user.name} / ${user.role}` : '사용자 정보를 확인하는 중'}
        </div>
        <button
          className="btn btn-secondary"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          type="button"
        >
          {isLoggingOut ? '로그아웃 처리 중' : '로그아웃'}
        </button>
      </div>
    </header>
  )
}
