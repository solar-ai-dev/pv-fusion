import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import type {
  ActionCandidate,
  DefectType,
  ReviewStatus,
  SeverityLevel,
} from '../features/results/types'
import { getDefectTaxonomyLabel, getInputTypeShortLabel } from '../features/results/defectTaxonomy'
import {
  ACTION_CANDIDATE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
} from '../features/results/types'
import {
  useResult,
  useUpdateActionCandidate,
  useUpdateReviewStatus,
} from '../features/results/hooks/useResults'
import { ResultDefectPanel } from '../features/results/components/ResultDefectPanel'
import { ResultImageViewer } from '../features/results/components/ResultImageViewer'
import {
  getDefaultVisualizationType,
  type ImageViewMode,
} from '../features/results/resultViewerUtils'
import type { ResultVisualizationType } from '../features/results/types'
import type { AnalysisInputType, AnalysisModelType } from '../features/analysisJobs/types'
import { useTrackingCompare } from '../features/tracking/hooks/useTracking'
import type { TargetType } from '../features/images/types'
import { FormField } from '../shared/components/form/FormField'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { useToast } from '../shared/hooks/useToast'
import {
  formatTableDateTime,
  formatDecimal,
  formatRatioPercent,
  getApiErrorMessage,
  parsePositiveNumber,
} from '../shared/utils'

export function ResultDetailPage() {
  const params = useParams()
  const toast = useToast()
  const resultId = parsePositiveNumber(params.resultId)

  const [viewMode, setViewMode] = useState<ImageViewMode>('split')
  const [visualizationType, setVisualizationType] = useState<ResultVisualizationType>('bbox')
  const [selectedDefectId, setSelectedDefectId] = useState<number | null>(null)
  const [nextActionCandidate, setNextActionCandidate] = useState<ActionCandidate>('CLEANING')
  const [actionMemo, setActionMemo] = useState('')
  const [nextReviewStatus, setNextReviewStatus] = useState<ReviewStatus>('UNCHECKED')
  const [reviewActionCandidate, setReviewActionCandidate] = useState<ActionCandidate>('CLEANING')
  const [reviewMemo, setReviewMemo] = useState('')
  const [isActionConfirmOpen, setIsActionConfirmOpen] = useState(false)
  const [isReviewConfirmOpen, setIsReviewConfirmOpen] = useState(false)
  const [origActionCandidate, setOrigActionCandidate] = useState<ActionCandidate>('CLEANING')
  const [origReviewStatus, setOrigReviewStatus] = useState<ReviewStatus>('UNCHECKED')
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isTechInfoOpen, setIsTechInfoOpen] = useState(false)
  const [isCompareExpanded, setIsCompareExpanded] = useState(false)

  const resultQuery = useResult(resultId ?? 0)
  const updateActionMutation = useUpdateActionCandidate(resultId ?? 0)
  const updateReviewMutation = useUpdateReviewStatus(resultId ?? 0)
  const compareQuery = useTrackingCompare({ currentResultId: resultId ?? 0 }, Boolean(resultId))

  useEffect(() => {
    if (!resultQuery.data) return
    const result = resultQuery.data.data
    const ac = result.actionCandidate ?? ACTION_CANDIDATE_OPTIONS[0]
    const rs = result.reviewStatus ?? REVIEW_STATUS_OPTIONS[0]
    setNextActionCandidate(ac)
    setReviewActionCandidate(ac)
    setNextReviewStatus(rs)
    setOrigActionCandidate(ac)
    setOrigReviewStatus(rs)
    setVisualizationType(getDefaultVisualizationType(result))
    setSelectedDefectId((current) => {
      if (current && result.detections.some((defect) => defect.defectId === current)) {
        return current
      }
      return result.detections[0]?.defectId ?? null
    })
  }, [resultQuery.data])

  if (!resultId) {
    return (
      <ErrorState
        title="잘못된 결과 주소입니다."
        description="결과 목록에서 다시 선택해 주세요."
      />
    )
  }
  if (resultQuery.isLoading && !resultQuery.data) {
    return <LoadingState message="결과 상세를 불러오는 중입니다." />
  }
  if (resultQuery.isError || !resultQuery.data) {
    return (
      <ErrorState
        title="결과 상세를 불러오지 못했습니다."
        description={getApiErrorMessage(resultQuery.error)}
      />
    )
  }

  const result = resultQuery.data.data
  const selectedDefect =
    result.detections.find((defect) => defect.defectId === selectedDefectId) ?? null

  const handleSaveActionCandidate = async () => {
    try {
      const res = await updateActionMutation.mutateAsync({
        actionCandidate: nextActionCandidate,
        memo: actionMemo.trim() || null,
      })
      toast.push(res.message || '조치 후보를 저장했습니다.')
      setIsActionConfirmOpen(false)
      setActionMemo('')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '조치 후보 저장에 실패했습니다.'))
    }
  }

  const handleSaveReviewStatus = async () => {
    try {
      const res = await updateReviewMutation.mutateAsync({
        reviewStatus: nextReviewStatus,
        actionCandidate: reviewActionCandidate || null,
        memo: reviewMemo.trim() || null,
      })
      toast.push(res.message || '검토 상태를 저장했습니다.')
      setIsReviewConfirmOpen(false)
      setReviewMemo('')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '검토 상태 저장에 실패했습니다.'))
    }
  }

  const compareData = compareQuery.data?.data

  return (
    <section className="result-detail-shell">

      {/* ── 헤더 ── */}
      <PageHeader
        title="분석 결과 상세"
        actions={
          <>
            <Link
              className="btn btn-secondary"
              to={result.inspectionId ? `/results?inspectionId=${result.inspectionId}` : '/results'}
            >
              결과 목록
            </Link>
            {result.inspectionId ? (
              <Link className="btn btn-secondary" to={`/inspections/${result.inspectionId}`}>
                점검 보기
              </Link>
            ) : null}
          </>
        }
      />

      {/* ── 1. 결과 요약 compact bar ── */}
      <div className="result-summary-bar">
        <div className="result-summary-badges">
          <StatusBadge
            label={getResultStatusLabel(result.resultStatus)}
            tone={getResultStatusTone(result.resultStatus)}
          />
          <span className="result-summary-sep">·</span>
          <span className="result-summary-meta">{getInputTypeShortLabel(result.inputType)}</span>
          <span className="result-summary-sep">·</span>
          <span className="result-summary-meta">
            이상 {result.anomalyCount != null ? `${result.anomalyCount}건` : '-'}
          </span>
          <span className="result-summary-sep">·</span>
          <StatusBadge
            label={getSeverityLabel(result.severityLevel)}
            tone={getSeverityTone(result.severityLevel)}
          />
          <span className="result-summary-sep">·</span>
          <span className="result-summary-meta">{getActionLabel(result.actionCandidate)}</span>
          <span className="result-summary-sep">·</span>
          <StatusBadge
            label={getReviewStatusLabel(result.reviewStatus)}
            tone={getReviewStatusTone(result.reviewStatus)}
          />
        </div>
        <span className="result-summary-time">분석 {formatTableDateTime(result.analyzedAt)}</span>
      </div>

      {/* ── 2. 2컬럼 workspace ── */}
      <div className="result-detail-workspace">

        {/* 좌측: 시각화 + 결함 목록 */}
        <div className="result-main-column">
          <ResultImageViewer
            result={result}
            resultId={resultId}
            selectedDefect={selectedDefect}
            viewMode={viewMode}
            visualizationType={visualizationType}
            onViewModeChange={setViewMode}
            onVisualizationTypeChange={setVisualizationType}
          />

          <ResultDefectPanel
            defects={result.detections}
            selectedDefectId={selectedDefectId}
            onSelectDefect={(defect) => setSelectedDefectId(defect.defectId)}
          />
        </div>

        {/* 우측: 조치·검토 sticky + 이전 점검 비교 */}
        <div className="result-side-column">
          <div className="result-action-sticky panel">
            {selectedDefect ? (
              <div className="result-selected-defect-summary">
                <div className="result-compare-title">검토 참고 · 선택 결함</div>
                <div className="result-selected-defect-summary-body">
                  <strong>{getDefectTaxonomyLabel(selectedDefect.defectType).label}</strong>
                  <span>
                    {getSeverityLabel(selectedDefect.severityLevel)} ·{' '}
                    {getActionLabel(selectedDefect.actionCandidate)} · 신뢰도{' '}
                    {selectedDefect.confidence ?? '-'}
                  </span>
                </div>
              </div>
            ) : null}

            {/* 조치 후보 */}
            <div className="result-action-section">
              <div className="result-compare-title">조치 후보</div>
              <div className="result-action-current">
                현재: <strong>{getActionLabel(result.actionCandidate)}</strong>
              </div>
              <FormField label="변경">
                <select
                  className="input-field"
                  value={nextActionCandidate}
                  onChange={(e) => setNextActionCandidate(e.target.value as ActionCandidate)}
                >
                  {ACTION_CANDIDATE_OPTIONS.map((a) => (
                    <option key={a} value={a}>{getActionLabel(a)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="메모">
                <textarea
                  className="input-field textarea-field"
                  value={actionMemo}
                  rows={2}
                  onChange={(e) => setActionMemo(e.target.value)}
                />
              </FormField>
              <div className="result-action-save-row">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={updateActionMutation.isPending || (nextActionCandidate === origActionCandidate && !actionMemo.trim())}
                  onClick={() => setIsActionConfirmOpen(true)}
                >
                  {updateActionMutation.isPending ? '저장 중...' : '조치 후보 저장'}
                </button>
              </div>
            </div>

            <hr className="result-action-divider" />

            {/* 검토 상태 */}
            <div className="result-action-section">
              <div className="result-compare-title">검토 상태</div>
              <div className="result-review-status-row">
                <StatusBadge
                  label={getReviewStatusLabel(result.reviewStatus)}
                  tone={getReviewStatusTone(result.reviewStatus)}
                />
                <span className="result-action-current">
                  현재 상태 · 다음 변경: <strong>{getReviewStatusLabel(nextReviewStatus)}</strong>
                </span>
              </div>
              <FormField label="변경">
                <select
                  className="input-field"
                  value={nextReviewStatus}
                  onChange={(e) => setNextReviewStatus(e.target.value as ReviewStatus)}
                >
                  {REVIEW_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{getReviewStatusLabel(s)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="함께 저장할 조치 후보">
                <select
                  className="input-field"
                  value={reviewActionCandidate}
                  onChange={(e) => setReviewActionCandidate(e.target.value as ActionCandidate)}
                >
                  {ACTION_CANDIDATE_OPTIONS.map((a) => (
                    <option key={a} value={a}>{getActionLabel(a)}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="메모">
                <textarea
                  className="input-field textarea-field"
                  value={reviewMemo}
                  rows={2}
                  onChange={(e) => setReviewMemo(e.target.value)}
                />
              </FormField>
              <div className="result-action-save-row">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={updateReviewMutation.isPending || (nextReviewStatus === origReviewStatus && reviewActionCandidate === origActionCandidate && !reviewMemo.trim())}
                  onClick={() => setIsReviewConfirmOpen(true)}
                >
                  {updateReviewMutation.isPending ? '저장 중...' : '검토 상태 저장'}
                </button>
              </div>
            </div>

            {/* 이전 점검 비교 compact summary */}
            {(compareQuery.isLoading || compareData || compareQuery.isError) ? (
              <>
                <hr className="result-action-divider" />
                <div className="result-compare-compact">
                  <div className="result-compare-title">이전 점검 비교</div>
                  {compareQuery.isLoading ? (
                    <span className="text-xs text-slate-400">불러오는 중...</span>
                  ) : compareQuery.isError ? (
                    axios.isAxiosError(compareQuery.error) && compareQuery.error.response?.status === 404 ? (
                      <span className="text-xs text-slate-400">비교할 이전 결과가 없습니다.</span>
                    ) : (
                      <span className="text-xs text-rose-500">비교 데이터를 불러오지 못했습니다.</span>
                    )
                  ) : compareData ? (
                    <>
                      <div className="result-compare-grid">
                        <CompareItem
                          label="반복 이상"
                          value={compareData.repeatedAnomaly ? '예 ⚠' : '없음'}
                          warn={compareData.repeatedAnomaly}
                        />
                        <CompareItem
                          label="악화 여부"
                          value={compareData.worsened ? '악화 의심 ⚠' : '유지/완화'}
                          warn={compareData.worsened}
                        />
                        <CompareItem
                          label="결함 수 변화"
                          value={compareData.defectChange.defectCountDiff != null
                            ? `${compareData.defectChange.defectCountDiff > 0 ? '+' : ''}${compareData.defectChange.defectCountDiff}`
                            : '-'}
                          warn={(compareData.defectChange.defectCountDiff ?? 0) > 0}
                        />
                        <CompareItem
                          label="우선 관리 사유"
                          value={getPriorityReasonShort(compareData.priorityReason)}
                          warn={false}
                        />
                      </div>
                      {/* 상세 펼치기 */}
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-slate-600 text-left mt-0.5"
                        onClick={() => setIsCompareExpanded((v) => !v)}
                      >
                        {isCompareExpanded ? '접기' : '상세 보기 ▾'}
                      </button>
                      {isCompareExpanded ? (
                        <div className="result-compare-grid mt-1">
                          <CompareItem label="면적 변화" value={formatRatioPercent(compareData.areaChange.areaRatioDiff)} warn={false} />
                          <CompareItem label="심각도 점수 변화" value={formatDecimal(compareData.severityChange.severityScoreDiff)} warn={false} />
                          <CompareItem label="새로 보인 결함" value={joinDefects(compareData.defectChange.newDefectTypes)} warn={false} />
                          <CompareItem label="해소된 결함" value={joinDefects(compareData.defectChange.resolvedDefectTypes)} warn={false} />
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </>
            ) : null}

          </div>
        </div>
      </div>

      {/* ── 3. 검토 이력 (기본 접힘) ── */}
      <section className="result-accordion panel">
        <button
          type="button"
          className="result-accordion-toggle"
          onClick={() => setIsHistoryOpen((v) => !v)}
        >
          <span className="result-accordion-label">검토 이력</span>
          <span className="result-accordion-hint">
            {isHistoryOpen
              ? '접기'
              : result.reviewHistories.length > 0
                ? `${result.reviewHistories.length}건`
                : '기록 없음'}
          </span>
        </button>
        {isHistoryOpen ? (
          <div className="result-accordion-body">
            <DataTable
              columns={[
                {
                  key: 'status',
                  header: '검토 상태 변경',
                  render: (row) =>
                    `${getReviewStatusLabel(row.previousReviewStatus)} → ${getReviewStatusLabel(row.newReviewStatus)}`,
                },
                {
                  key: 'action',
                  header: '조치 후보 변경',
                  render: (row) =>
                    `${getActionLabel(row.previousActionCandidate)} → ${getActionLabel(row.newActionCandidate)}`,
                },
                {
                  key: 'memo',
                  header: '메모',
                  render: (row) => row.memo ?? '-',
                },
                {
                  key: 'createdAt',
                  header: '기록 시각',
                  render: (row) => formatTableDateTime(row.createdAt),
                },
              ]}
              rows={result.reviewHistories}
              rowKey={(row) => row.reviewHistoryId}
              emptyTitle="검토 이력이 없습니다."
              emptyDescription="검토 상태나 조치 후보가 변경되면 이력이 여기에 표시됩니다."
            />
          </div>
        ) : null}
      </section>

      {/* ── 4. 기술 정보 (기본 접힘) ── */}
      <section className="result-accordion panel">
        <button
          type="button"
          className="result-accordion-toggle"
          onClick={() => setIsTechInfoOpen((v) => !v)}
        >
          <span className="result-accordion-label">기술 정보</span>
          <span className="result-accordion-hint">
            {isTechInfoOpen ? '접기' : '모델 정보 · 분석 작업 참조값 (기본 비공개)'}
          </span>
        </button>
        {isTechInfoOpen ? (
          <div className="result-accordion-body">
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">모델 정보</div>
                {result.modelInfo ? (
                  <div className="detail-grid">
                    <DetailItem label="모델명" value={result.modelInfo.modelName} />
                    <DetailItem label="버전" value={result.modelInfo.modelVersion} />
                    <DetailItem label="형식" value={result.modelInfo.modelFormat} />
                    <DetailItem label="실행 환경" value={result.modelInfo.runtime} />
                    <DetailItem label="입력 크기" value={String(result.modelInfo.inputSize)} />
                    <DetailItem label="임계값" value={result.modelInfo.threshold} />
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">모델 세부 정보가 없습니다.</p>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">분석 작업 참조</div>
                <div className="detail-grid">
                  <DetailItem label="대상 유형" value={getTargetLabel(result.targetType)} />
                  <DetailItem label="입력 유형" value={getInputTypeLabel(result.inputType)} />
                  <DetailItem label="분석 방식" value={getModelTypeLabel(result.modelType)} />
                  <DetailItem label="최대 신뢰도" value={result.maxConfidence ?? '-'} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <ConfirmModal
        isOpen={isActionConfirmOpen}
        title="조치 후보 저장"
        description="선택한 조치 후보와 메모를 저장합니다."
        confirmText="저장"
        cancelText="취소"
        isConfirming={updateActionMutation.isPending}
        onConfirm={handleSaveActionCandidate}
        onCancel={() => setIsActionConfirmOpen(false)}
      />

      <ConfirmModal
        isOpen={isReviewConfirmOpen}
        title="검토 상태 저장"
        description="선택한 검토 상태와 조치 후보를 함께 저장합니다."
        confirmText="저장"
        cancelText="취소"
        isConfirming={updateReviewMutation.isPending}
        onConfirm={handleSaveReviewStatus}
        onCancel={() => setIsReviewConfirmOpen(false)}
      />
    </section>
  )
}

/* ── Helper components ── */

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function CompareItem({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn: boolean
}) {
  return (
    <div className="result-compare-item">
      <span className="result-compare-item-label">{label}</span>
      <span className={`result-compare-item-value ${warn ? 'text-rose-600' : ''}`}>{value}</span>
    </div>
  )
}

/* ── Pure helper functions ── */

function getTargetLabel(value?: TargetType | null) {
  switch (value) {
    case 'ZONE': return '점검 영역'
    case 'ARRAY': return '어레이'
    case 'PANEL': return '패널'
    case 'MODULE': return '모듈'
    default: return '-'
  }
}

function getInputTypeLabel(value?: AnalysisInputType | null) {
  switch (value) {
    case 'RGB_SINGLE': return 'RGB 단건'
    case 'THERMAL_SINGLE': return '열화상 단건'
    default: return '-'
  }
}

function getModelTypeLabel(value?: AnalysisModelType | null) {
  switch (value) {
    case 'RGB_ONLY': return 'RGB 분석'
    case 'THERMAL_ONLY': return '열화상 분석'
    default: return '-'
  }
}

function getResultStatusLabel(value?: string | null) {
  switch (value) {
    case 'NORMAL': return '정상'
    case 'ANOMALY': return '이상 후보 있음'
    case 'LOW_CONFIDENCE': return '신뢰도 낮음'
    default: return '-'
  }
}

function getResultStatusTone(value?: string | null): 'success' | 'danger' | 'warning' | 'default' {
  switch (value) {
    case 'NORMAL': return 'success'
    case 'ANOMALY': return 'danger'
    case 'LOW_CONFIDENCE': return 'warning'
    default: return 'default'
  }
}

function getActionLabel(value?: ActionCandidate | null) {
  switch (value) {
    case 'CLEANING': return '청소 후보'
    case 'RETAKE': return '재촬영 후보'
    case 'FIELD_INSPECTION': return '현장 점검 후보'
    case 'REPLACEMENT_REVIEW': return '교체 검토 후보'
    default: return '-'
  }
}

function getReviewStatusLabel(value?: ReviewStatus | null) {
  switch (value) {
    case 'UNCHECKED': return '미확인'
    case 'CONFIRMED': return '확인 완료'
    case 'RECHECK_REQUIRED': return '재점검 필요'
    case 'ACTION_COMPLETED': return '조치 완료'
    default: return '-'
  }
}

function getReviewStatusTone(value?: ReviewStatus | null): 'success' | 'danger' | 'warning' | 'default' {
  switch (value) {
    case 'CONFIRMED':
    case 'ACTION_COMPLETED': return 'success'
    case 'RECHECK_REQUIRED': return 'danger'
    case 'UNCHECKED': return 'warning'
    default: return 'default'
  }
}

function getSeverityLabel(value?: SeverityLevel | null) {
  switch (value) {
    case 'LOW': return '낮음'
    case 'MEDIUM': return '보통'
    case 'HIGH': return '높음'
    case 'CRITICAL': return '치명적'
    default: return '-'
  }
}

function getSeverityTone(value?: SeverityLevel | null): 'default' | 'warning' | 'danger' {
  switch (value) {
    case 'LOW': return 'default'
    case 'MEDIUM': return 'warning'
    case 'HIGH':
    case 'CRITICAL': return 'danger'
    default: return 'default'
  }
}

function getDefectLabel(value?: DefectType | null) {
  return getDefectTaxonomyLabel(value).label
}

function getPriorityReasonShort(value?: string | null) {
  if (!value || value === 'no priority escalation') return '없음'
  if (value === 'worsened and repeated anomaly') return '반복+악화'
  if (value === 'worsened tracking result') return '악화'
  if (value === 'repeated anomaly') return '반복 이상'
  if (value === 'tracked anomaly') return '추적 중'
  if (value === 'severity level increased') return '심각도 상승'
  if (value === 'severity score increased') return '점수 상승'
  if (value === 'anomaly count increased') return '이상 수 증가'
  if (value === 'new high severity defect detected') return '신규 고위험'
  return value
}

function joinDefects(values: DefectType[]) {
  if (values.length === 0) return '-'
  return values.map(getDefectLabel).join(', ')
}

