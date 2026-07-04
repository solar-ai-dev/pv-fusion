import type { DeleteImpact } from '../../api/types'

const IMPACT_FIELDS: Array<{ key: keyof DeleteImpact; label: string }> = [
  { key: 'plantCount', label: '발전소' },
  { key: 'plantMemberCount', label: '접근 권한' },
  { key: 'zoneCount', label: '구역' },
  { key: 'equipmentCount', label: '설비 위치' },
  { key: 'inspectionCount', label: '점검' },
  { key: 'imageCount', label: '이미지' },
  { key: 'analysisJobCount', label: '분석 작업' },
  { key: 'analysisResultCount', label: '분석 결과' },
  { key: 'detectedDefectCount', label: '이상 후보' },
  { key: 'reviewHistoryCount', label: '검토 이력' },
  { key: 'operationLogCount', label: '운영 로그' },
  { key: 'storageFileCount', label: '저장소 파일' },
]

export function DeleteImpactSummary({ impact }: { impact: DeleteImpact }) {
  const rows = IMPACT_FIELDS.filter(({ key }) => Number(impact[key] ?? 0) > 0)

  return (
    <div className="delete-impact-list">
      <div className="delete-impact-warning">
        연결된 데이터도 함께 삭제됩니다. 삭제 후에는 되돌릴 수 없습니다.
      </div>
      {rows.length > 0 ? (
        <ul>
          {rows.map(({ key, label }) => (
            <li key={String(key)}>
              <span>{label}</span>
              <strong>{impact[key]}건</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="panel-description">함께 삭제되는 연결 데이터는 확인되지 않았습니다.</p>
      )}
    </div>
  )
}
