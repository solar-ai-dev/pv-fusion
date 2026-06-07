import { PageScaffold } from './PageScaffold'

export function InspectionDetailPage() {
  return (
    <PageScaffold
      title="점검 상세"
      description="이미지 업로드, RGB-Thermal Pair 연결, AI 분석 요청, 분석 상태 확인 영역"
      highlights={[
        'RGB / Thermal 업로드 패널',
        'Pair 후보 조회 및 생성',
        '분석 요청과 재시도, 상태 조회',
      ]}
    />
  )
}
