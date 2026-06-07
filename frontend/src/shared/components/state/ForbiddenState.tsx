import { Link } from 'react-router-dom'

export function ForbiddenState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <section className="panel max-w-xl text-center">
        <span className="eyebrow">403</span>
        <h1 className="panel-title mt-3">권한이 없습니다.</h1>
        <p className="panel-description">
          관리자 전용이거나 승인 대기 상태에서는 접근할 수 없는 화면입니다.
        </p>
        <div className="mt-6 flex justify-center">
          <Link to="/dashboard" className="btn btn-primary">
            대시보드로 이동
          </Link>
        </div>
      </section>
    </main>
  )
}
