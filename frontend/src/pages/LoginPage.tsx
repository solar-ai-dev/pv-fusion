import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../features/auth/api/authApi'
import { useAuth } from '../features/auth/hooks/useAuth'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'

export function LoginPage() {
  const navigate = useNavigate()
  const hasInitialized = useAuth((state) => state.hasInitialized)
  const resolution = useAuth((state) => state.resolution)
  const user = useAuth((state) => state.user)
  const error = useAuth((state) => state.error)

  useEffect(() => {
    if (!hasInitialized || resolution !== 'authenticated' || !user) {
      return
    }

    if (user.accountStatus === 'PENDING') {
      navigate('/pending', { replace: true })
      return
    }

    if (user.accountStatus === 'APPROVED') {
      navigate('/dashboard', { replace: true })
      return
    }

    navigate('/forbidden', { replace: true })
  }, [hasInitialized, navigate, resolution, user])

  if (!hasInitialized || resolution === 'loading') {
    return <LoadingState message="인증 상태를 확인하는 중입니다." />
  }

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60">
      <div className="space-y-2 text-center">
        <span className="eyebrow">PV Fusion</span>
        <h1 className="text-3xl font-semibold text-slate-900">로그인</h1>
        <p className="text-sm text-slate-600">
          Google OAuth2를 통해 시스템에 로그인합니다.
        </p>
      </div>

      <button
        className="btn btn-primary w-full justify-center"
        onClick={() => authApi.redirectToGoogleLogin()}
        type="button"
      >
        Google로 로그인
      </button>

      {resolution === 'error' ? (
        <ErrorState
          title="인증 서버에 연결하지 못했습니다."
          description={
            error?.detail ??
            error?.message ??
            'backend가 내려가 있어도 로그인 화면 자체는 접근할 수 있어야 합니다.'
          }
        />
      ) : null}

      {resolution === 'forbidden' ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {error?.message ?? '현재 계정 상태로는 로그인 이후 접근이 제한됩니다.'}
        </div>
      ) : null}
    </section>
  )
}
