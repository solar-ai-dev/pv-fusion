import { ButtonHTMLAttributes } from 'react'
import { authApi } from '../features/auth/api/authApi'

function ActionButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className="btn btn-primary w-full justify-center" {...props} />
}

export function LoginPage() {
  const handleLogin = () => {
    authApi.redirectToGoogleLogin()
  }

  return (
    <section className="mx-auto max-w-md space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-xl shadow-slate-200/60">
      <div className="space-y-2 text-center">
        <span className="eyebrow">PV Fusion</span>
        <h1 className="text-3xl font-semibold text-slate-900">로그인</h1>
        <p className="text-sm text-slate-600">
          Google OAuth 로그인 진입 화면 플레이스홀더입니다.
        </p>
      </div>
      <ActionButton onClick={handleLogin}>Google로 로그인</ActionButton>
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        실제 인증 방식은 Session/JWT 최종 결정 후 연결합니다.
      </div>
    </section>
  )
}
