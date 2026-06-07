import { authApi } from '../../../features/auth/api/authApi'
import { useAuth } from '../../../features/auth/hooks/useAuth'

export function TopNavbar() {
  const user = useAuth((state) => state.user)

  return (
    <header className="top-navbar">
      <div>
        <span className="eyebrow">PV Fusion</span>
        <h1 className="text-lg font-semibold text-slate-900">
          태양광 점검 운영 콘솔
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
          {user?.name ?? '사용자 메뉴'} / {user?.role ?? 'ADMIN'}
        </div>
        <button className="btn btn-secondary" onClick={() => authApi.logout()}>
          로그아웃
        </button>
      </div>
    </header>
  )
}
