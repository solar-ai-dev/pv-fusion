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
        <span className="eyebrow">PV INSIGHT</span>
        <h1 className="text-3xl font-semibold text-slate-900">로그인</h1>
        <p className="text-sm text-slate-600">
          Google 계정으로 로그인한 뒤 서비스를 이용할 수 있습니다.
        </p>
      </div>

      <button
        className="btn btn-primary w-full justify-center"
        onClick={() => authApi.redirectToGoogleLogin()}
        type="button"
      >
        Google 계정으로 로그인
      </button>

      {resolution === 'error' ? (
        <ErrorState
          title="인증 서버에 연결할 수 없습니다."
          description={
            error?.detail ??
            error?.message ??
            '잠시 후 다시 시도하거나 로컬 서버 상태를 확인하세요.'
          }
        />
      ) : null}

      {resolution === 'forbidden' ? (
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {error?.message ?? '현재 계정 상태로는 로그인 후 화면에 접근할 수 없습니다.'}
        </div>
      ) : null}
    </section>
  )
}
