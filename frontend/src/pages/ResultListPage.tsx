import { PageScaffold } from './PageScaffold'

export function ResultListPage() {
  return (
    <PageScaffold
      title="점검 결과"
      description="분석 결과 목록과 필터링을 위한 기본 화면입니다."
      highlights={[
        '결과 목록 테이블',
        '리뷰 상태 필터',
        '상세 결과 페이지 진입',
      ]}
    />
  )
}
