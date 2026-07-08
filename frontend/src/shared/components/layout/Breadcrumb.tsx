import { Link, useLocation } from 'react-router-dom'

const segmentLabels: Record<string, string> = {
  dashboard: '대시보드',
  assets: '발전소',
  plants: '발전소',
  zones: '발전소',
  inspections: '점검',
  results: '결과',
  tracking: '변화 추적',
  admin: '관리자',
  login: '로그인',
  pending: '승인 대기',
  forbidden: '권한 없음',
}

const idSegmentLabels: Record<string, (id: string) => string> = {
  inspections: (id) => `점검 상세 #${id}`,
  results: (id) => `분석 결과 #${id}`,
  plants: (id) => `발전소 상세 #${id}`,
  zones: (id) => `구역 상세 #${id}`,
}

function isNumericId(segment: string) {
  return /^\d+$/.test(segment)
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
        const parentSegment = index > 0 ? segments[index - 1] : null

        let label: string
        if (isNumericId(segment) && parentSegment && idSegmentLabels[parentSegment]) {
          label = idSegmentLabels[parentSegment](segment)
        } else {
          label = segmentLabels[segment] ?? segment
        }

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
