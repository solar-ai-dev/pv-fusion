import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'

export function PendingApprovalPage() {
  const navigate = useNavigate()
  const hasInitialized = useAuth((state) => state.hasInitialized)
  const resolution = useAuth((state) => state.resolution)
  const user = useAuth((state) => state.user)
  const error = useAuth((state) => state.error)
  const isLoggingOut = useAuth((state) => state.isLoggingOut)
  const refreshMe = useAuth((state) => state.refreshMe)
  const logout = useAuth((state) => state.logout)

  useEffect(() => {
    if (!hasInitialized) {
      return
    }

    if (resolution === 'unauthenticated') {
      navigate('/login', { replace: true })
      return
    }

    if (resolution === 'forbidden') {
      navigate('/forbidden', { replace: true })
      return
    }

    if (resolution === 'authenticated' && user?.accountStatus === 'APPROVED') {
      navigate('/dashboard', { replace: true })
    }
  }, [hasInitialized, navigate, resolution, user])

  if (!hasInitialized || resolution === 'loading') {
    return <LoadingState message="계정 상태를 확인하는 중입니다." />
  }

  if (resolution === 'error') {
    return (
      <ErrorState
        title="승인 상태를 확인할 수 없습니다."
        description={error?.detail ?? error?.message ?? '잠시 후 다시 시도해 주세요.'}
      />
    )
  }

  const handleLogout = async () => {
    const result = await logout()

    if (result.success) {
      navigate('/login', { replace: true })
    }
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60">
      <div className="space-y-2">
        <span className="eyebrow">Pending</span>
        <h1 className="text-3xl font-semibold text-slate-900">승인 대기</h1>
        <p className="text-sm text-slate-600">
          관리자 승인 전까지 주요 기능 화면에는 접근할 수 없습니다.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <p>이름: {user?.name ?? '-'}</p>
        <p>이메일: {user?.email ?? '-'}</p>
        <p>계정 상태: {user?.accountStatus ?? 'PENDING'}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="btn btn-primary"
          onClick={() => void refreshMe()}
          type="button"
        >
          상태 다시 확인
        </button>
        <button
          className="btn btn-secondary"
          disabled={isLoggingOut}
          onClick={() => void handleLogout()}
          type="button"
        >
          {isLoggingOut ? '로그아웃 처리 중' : '로그아웃'}
        </button>
      </div>
    </section>
  )
}
