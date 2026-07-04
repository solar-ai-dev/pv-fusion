import { NavLink } from 'react-router-dom'
import { Link, useLocation } from 'react-router-dom'

const menus = [
  {
    to: '/dashboard',
    label: '대시보드',
    match: (pathname: string) => pathname === '/dashboard' || pathname === '/',
  },
  {
    to: '/inspections',
    label: '점검·결과',
    match: (pathname: string) =>
      pathname.startsWith('/inspections') ||
      pathname.startsWith('/results') ||
      pathname.startsWith('/tracking'),
  },
  {
    to: '/plants',
    label: '발전소',
    match: (pathname: string) =>
      pathname.startsWith('/assets') ||
      pathname.startsWith('/plants') ||
      pathname.startsWith('/zones'),
  },
  {
    to: '/admin',
    label: '관리자',
    match: (pathname: string) => pathname.startsWith('/admin'),
  },
] as const

export function Sidebar() {
  const location = useLocation()
  const LegacyNavLink = NavLink
  void LegacyNavLink

  return (
    <aside className="sidebar">
      <div className="sidebar-brand space-y-2">
        <span className="eyebrow">Workspace</span>
        <h2 className="sidebar-title text-2xl font-semibold text-white">PV Fusion</h2>
        <p className="sidebar-description text-sm text-slate-300">
          점검과 분석 결과를 한 흐름으로 확인하는 운영 화면입니다.
        </p>
      </div>
      <nav className="sidebar-nav mt-6 space-y-2">
        {menus.map((menu) => (
          <Link
            key={menu.to}
            to={menu.to}
            className={`sidebar-link ${menu.match(location.pathname) ? 'sidebar-link-active' : ''}`}
          >
            {menu.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
