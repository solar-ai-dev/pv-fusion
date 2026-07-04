import { NavLink } from 'react-router-dom'

const menus = [
  { to: '/dashboard', label: '홈' },
  { to: '/inspections', label: '점검' },
  { to: '/results', label: '결과' },
  { to: '/assets', label: '현장' },
  { to: '/admin', label: '관리자' },
]

export function Sidebar() {
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
          <NavLink
            key={menu.to}
            to={menu.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            {menu.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
