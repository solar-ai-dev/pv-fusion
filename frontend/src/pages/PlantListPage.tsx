import { PageScaffold } from './PageScaffold'

export function PlantListPage() {
  return (
    <PageScaffold
      title="발전소 관리"
      description="발전소 목록 조회, 검색, 등록 진입을 위한 기본 화면입니다."
      highlights={[
        '발전소 목록 테이블',
        '검색 및 상태 필터',
        '상세 페이지 진입 동선',
      ]}
    />
  )
}
