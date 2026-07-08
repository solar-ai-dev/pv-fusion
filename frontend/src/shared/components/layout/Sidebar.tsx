import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../../features/auth/hooks/useAuth'

const primaryMenus = [
  {
    to: '/dashboard',
    label: '대시보드',
    match: (pathname: string) => pathname === '/dashboard' || pathname === '/',
  },
  {
    to: '/plants',
    label: '발전소',
    match: (pathname: string) =>
      pathname.startsWith('/plants') || pathname.startsWith('/zones'),
  },
  {
    to: '/inspections',
    label: '점검',
    match: (pathname: string) => pathname.startsWith('/inspections'),
  },
  {
    to: '/results',
    label: '결과',
    match: (pathname: string) => pathname.startsWith('/results'),
  },
] as const

export function Sidebar() {
  const location = useLocation()
  const role = useAuth((state) => state.user?.role)

  const isTrackingActive = location.pathname.startsWith('/tracking')

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-eyebrow">운영 콘솔</span>
        <h2 className="sidebar-title">PV-Insight</h2>
        <p className="sidebar-description">태양광 점검·분석 운영 플랫폼</p>
      </div>
      <nav className="sidebar-nav">
        {primaryMenus.map((menu) => (
          <Link
            key={menu.to}
            to={menu.to}
            className={`sidebar-link ${menu.match(location.pathname) ? 'sidebar-link-active' : ''}`}
          >
            {menu.label}
          </Link>
        ))}
        {/* 변화 추적: 결과 하위 보조 메뉴 — 항상 표시 */}
        <Link
          to="/tracking"
          className={`sidebar-link sidebar-sublink ${isTrackingActive ? 'sidebar-link-active' : ''}`}
        >
          └ 변화 추적
        </Link>
        {role === 'ADMIN' ? (
          <Link
            to="/admin"
            className={`sidebar-link ${location.pathname.startsWith('/admin') ? 'sidebar-link-active' : ''}`}
          >
            관리자
          </Link>
        ) : null}
      </nav>
    </aside>
  )
}
