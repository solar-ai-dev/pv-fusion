import { NavLink } from 'react-router-dom'

const menus = [
  { to: '/dashboard', label: '대시보드' },
  { to: '/plants', label: '발전소 관리' },
  { to: '/inspections', label: '점검 관리' },
  { to: '/results', label: '점검 결과' },
  { to: '/tracking', label: '변경 추적' },
  { to: '/admin', label: '관리자' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="space-y-2">
        <span className="eyebrow">Workspace</span>
        <h2 className="text-2xl font-semibold text-white">PV Fusion</h2>
        <p className="text-sm text-slate-300">
          발전소, 점검, 분석 결과를 한 흐름으로 확인하는 운영 UI 골격입니다.
        </p>
      </div>
      <nav className="mt-8 space-y-2">
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
