import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'

export function ForbiddenPage() {
  const navigate = useNavigate()
  const user = useAuth((state) => state.user)
  const error = useAuth((state) => state.error)
  const isLoggingOut = useAuth((state) => state.isLoggingOut)
  const logout = useAuth((state) => state.logout)

  const description =
    error?.code === 'USER_DEACTIVATED'
      ? '비활성화된 사용자입니다. 관리자에게 계정 상태를 문의해 주세요.'
      : error?.code === 'APPROVAL_REQUIRED'
        ? '승인 대기 상태에서는 이 화면에 접근할 수 없습니다.'
        : user?.role !== 'ADMIN'
          ? '관리자 권한이 필요한 화면입니다.'
          : '현재 계정 상태로는 이 화면에 접근할 수 없습니다.'

  const handleLogout = async () => {
    const result = await logout()

    if (result.success) {
      navigate('/login', { replace: true })
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <section className="panel max-w-xl text-center">
        <span className="eyebrow">403</span>
        <h1 className="panel-title mt-3">권한이 없습니다.</h1>
        <p className="panel-description">{description}</p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
            type="button"
          >
            대시보드로 이동
          </button>
          <button
            className="btn btn-secondary"
            disabled={isLoggingOut}
            onClick={() => void handleLogout()}
            type="button"
          >
            {isLoggingOut ? '로그아웃 처리 중' : '로그인으로 이동'}
          </button>
        </div>
      </section>
    </main>
  )
}
