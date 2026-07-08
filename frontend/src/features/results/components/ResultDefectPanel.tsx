import { getDefectTaxonomyLabel, getDefectSourceLabel } from '../defectTaxonomy'
import { defectHasBbox } from '../resultViewerUtils'
import type { ActionCandidate, DetectedDefect, SeverityLevel } from '../types'
import { EmptyState } from '../../../shared/components/state/EmptyState'
import { StatusBadge } from '../../../shared/components/state/StatusBadge'
import { formatRatioPercent, formatTableDateTime } from '../../../shared/utils'

type ResultDefectPanelProps = {
  defects: DetectedDefect[]
  selectedDefectId: number | null
  onSelectDefect: (defect: DetectedDefect) => void
}

export function ResultDefectPanel({
  defects,
  onSelectDefect,
  selectedDefectId,
}: ResultDefectPanelProps) {
  const selectedDefect =
    defects.find((defect) => defect.defectId === selectedDefectId) ?? null

  return (
    <div className="result-defect-panel panel">
      <div className="result-defect-header-row">
        <div className="result-defect-header">결함 후보 목록</div>
        <span className="result-defect-count">{defects.length}건</span>
      </div>

      {defects.length === 0 ? (
        <EmptyState
          title="결함 후보가 없습니다."
          description="이번 결과에는 기록된 결함 후보가 없습니다."
        />
      ) : (
        <>
          <div className="result-defect-list">
            {defects.map((defect) => {
              const { label, isKnown } = getDefectTaxonomyLabel(defect.defectType)
              const isSelected = defect.defectId === selectedDefectId
              return (
                <button
                  key={defect.defectId}
                  type="button"
                  className={`result-defect-row ${isSelected ? 'result-defect-row-selected' : ''}`}
                  onClick={() => onSelectDefect(defect)}
                >
                  <div className="result-defect-row-main">
                    <div className="result-defect-row-top">
                      <strong
                        className={isKnown ? 'text-slate-900' : 'text-slate-500'}
                        title={!isKnown && defect.defectType ? `원본 값: ${defect.defectType}` : undefined}
                      >
                        {label}
                      </strong>
                      <StatusBadge
                        label={getSeverityLabel(defect.severityLevel)}
                        tone={getSeverityTone(defect.severityLevel)}
                      />
                    </div>
                    <div className="result-defect-row-meta">
                      <span>{getDefectSourceLabel(defect.defectSource)}</span>
                      <span>신뢰도 {defect.confidence ?? '-'}</span>
                      <span>{getActionLabel(defect.actionCandidate)}</span>
                    </div>
                  </div>
                  <span className="result-defect-row-action">
                    {isSelected ? '선택됨' : '확인'}
                  </span>
                </button>
              )
            })}
          </div>

          {selectedDefect ? (
            <div className="result-defect-detail">
              <div className="result-defect-detail-title">선택된 결함 후보</div>
              <div className="result-defect-detail-grid">
                <DetailField
                  label="결함 유형"
                  value={getDefectTaxonomyLabel(selectedDefect.defectType).label}
                />
                <DetailField label="신뢰도" value={selectedDefect.confidence ?? '-'} />
                <DetailField
                  label="심각도"
                  value={getSeverityLabel(selectedDefect.severityLevel)}
                />
                <DetailField
                  label="조치 후보"
                  value={getActionLabel(selectedDefect.actionCandidate)}
                />
                <DetailField
                  label="면적 비율"
                  value={formatRatioPercent(selectedDefect.areaRatio)}
                />
                <DetailField
                  label="영역 좌표"
                  value={
                    defectHasBbox(selectedDefect)
                      ? `x:${selectedDefect.bboxX} y:${selectedDefect.bboxY} ${selectedDefect.bboxWidth}×${selectedDefect.bboxHeight}`
                      : '좌표 없음'
                  }
                />
                <DetailField
                  label="기록 시각"
                  value={formatTableDateTime(selectedDefect.createdAt)}
                />
              </div>
            </div>
          ) : (
            <p className="result-defect-guide">
              결함 후보를 선택하면 이미지에서 확인할 영역과 상세 정보가 표시됩니다.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="result-defect-detail-field">
      <span className="result-defect-detail-label">{label}</span>
      <span className="result-defect-detail-value">{value}</span>
    </div>
  )
}

function getActionLabel(value?: ActionCandidate | null) {
  switch (value) {
    case 'CLEANING':
      return '청소 후보'
    case 'RETAKE':
      return '재촬영 후보'
    case 'FIELD_INSPECTION':
      return '현장 점검 후보'
    case 'REPLACEMENT_REVIEW':
      return '교체 검토 후보'
    default:
      return '-'
  }
}

function getSeverityLabel(value?: SeverityLevel | null) {
  switch (value) {
    case 'LOW':
      return '낮음'
    case 'MEDIUM':
      return '보통'
    case 'HIGH':
      return '높음'
    case 'CRITICAL':
      return '치명적'
    default:
      return '-'
  }
}

function getSeverityTone(value?: SeverityLevel | null): 'default' | 'warning' | 'danger' {
  switch (value) {
    case 'LOW':
      return 'default'
    case 'MEDIUM':
      return 'warning'
    case 'HIGH':
    case 'CRITICAL':
      return 'danger'
    default:
      return 'default'
  }
}
