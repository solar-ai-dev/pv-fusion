import { getDefectSourceLabel, getDefectTaxonomyLabel } from '../defectTaxonomy'
import type { ActionCandidate, DetectedDefect, SeverityLevel } from '../types'
import { EmptyState } from '../../../shared/components/state/EmptyState'
import { StatusBadge } from '../../../shared/components/state/StatusBadge'

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
                      title={!isKnown && defect.defectType ? `원본 값 ${defect.defectType}` : undefined}
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
      )}
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
