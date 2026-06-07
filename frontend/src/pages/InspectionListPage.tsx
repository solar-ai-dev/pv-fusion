import { PageScaffold } from './PageScaffold'

export function InspectionListPage() {
  return (
    <PageScaffold
      title="점검 관리"
      description="점검 목록, 필터, 등록 진입을 위한 기본 화면입니다."
      highlights={[
        '점검 목록 테이블',
        '상태와 기간 필터',
        '점검 상세 페이지 이동',
      ]}
    />
  )
}
