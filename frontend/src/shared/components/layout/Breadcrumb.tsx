import { Link, useLocation } from 'react-router-dom'
const labels: Record<string, string> = {
  dashboard: '대시보드',
  assets: '발전소',
  plants: '발전소',
  zones: '발전소',
  inspections: '점검·결과',
  results: '점검·결과',
  tracking: '점검·결과',
  admin: '관리자',
  login: '로그인',
  pending: '승인 대기',
  forbidden: '권한 없음',
}

export function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <Link to="/dashboard">대시보드</Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join('/')}`
        const isLast = index === segments.length - 1
        const label = labels[segment] ?? segment

        return (
          <span key={href} className="breadcrumb-item">
            <span>/</span>
            {isLast ? <strong>{label}</strong> : <Link to={href}>{label}</Link>}
          </span>
        )
      })}
    </nav>
  )
}
