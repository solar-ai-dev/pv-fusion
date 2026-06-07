import { PageScaffold } from './PageScaffold'

export function InspectionDetailPage() {
  return (
    <PageScaffold
      title="점검 상세"
      description="이미지 업로드, Pair 연결, 분석 요청 상태를 확인하는 기본 화면입니다."
      highlights={[
        'RGB / Thermal 업로드 동선',
        'Pair 후보 조회 및 연결',
        '분석 요청과 상태 확인',
      ]}
    />
  )
}
