import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <section className="panel max-w-xl text-center">
        <span className="eyebrow">404</span>
        <h1 className="panel-title mt-3">페이지를 찾을 수 없습니다.</h1>
        <p className="panel-description">
          잘못된 경로이거나 아직 구현되지 않은 화면입니다.
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
