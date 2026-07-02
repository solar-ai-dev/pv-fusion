import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import type {
  ActionCandidate,
  DefectSource,
  DefectType,
  PriorityLevel,
  ResultVisualizationType,
  ReviewStatus,
  SeverityLevel,
} from '../features/results/types'
import {
  ACTION_CANDIDATE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  VISUALIZATION_TYPE_OPTIONS,
} from '../features/results/types'
import {
  useResult,
  useResultVisualization,
  useUpdateActionCandidate,
  useUpdateReviewStatus,
} from '../features/results/hooks/useResults'
import type { AnalysisInputType, AnalysisModelType } from '../features/analysisJobs/types'
import { useTrackingCompare } from '../features/tracking/hooks/useTracking'
import type { TargetType } from '../features/images/types'
import { FormField } from '../shared/components/form/FormField'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { ImageCompareViewer } from '../shared/components/image/ImageCompareViewer'
import { VisualizationOverlayViewer } from '../shared/components/image/VisualizationOverlayViewer'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { useToast } from '../shared/hooks/useToast'
import {
  formatDateTime,
  formatDecimal,
  formatRatioPercent,
  getApiErrorMessage,
  parsePositiveNumber,
} from '../shared/utils'

export function ResultDetailPage() {
  const params = useParams()
  const toast = useToast()
  const resultId = parsePositiveNumber(params.resultId)
  const [visualizationType, setVisualizationType] = useState<ResultVisualizationType>('bbox')
  const [nextActionCandidate, setNextActionCandidate] = useState<ActionCandidate>('CLEANING')
  const [actionMemo, setActionMemo] = useState('')
  const [nextReviewStatus, setNextReviewStatus] = useState<ReviewStatus>('UNCHECKED')
  const [reviewActionCandidate, setReviewActionCandidate] = useState<ActionCandidate>('CLEANING')
  const [reviewMemo, setReviewMemo] = useState('')
  const [isActionConfirmOpen, setIsActionConfirmOpen] = useState(false)
  const [isReviewConfirmOpen, setIsReviewConfirmOpen] = useState(false)

  const resultQuery = useResult(resultId ?? 0)
  const visualizationQuery = useResultVisualization(resultId ?? 0, visualizationType, Boolean(resultId))
  const updateActionMutation = useUpdateActionCandidate(resultId ?? 0)
  const updateReviewMutation = useUpdateReviewStatus(resultId ?? 0)
  const compareQuery = useTrackingCompare({ currentResultId: resultId ?? 0 }, Boolean(resultId))

  useEffect(() => {
    if (!resultQuery.data) {
      return
    }

    const result = resultQuery.data.data
    setNextActionCandidate(result.actionCandidate ?? ACTION_CANDIDATE_OPTIONS[0])
    setReviewActionCandidate(result.actionCandidate ?? ACTION_CANDIDATE_OPTIONS[0])
    setNextReviewStatus(result.reviewStatus ?? REVIEW_STATUS_OPTIONS[0])
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

  const handleSaveActionCandidate = async () => {
    try {
      const response = await updateActionMutation.mutateAsync({
        actionCandidate: nextActionCandidate,
        memo: actionMemo.trim() || null,
      })
      toast.push(response.message || '조치 후보를 저장했습니다.')
      setIsActionConfirmOpen(false)
      setActionMemo('')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '조치 후보 저장에 실패했습니다.'))
    }
  }

  const handleSaveReviewStatus = async () => {
    try {
      const response = await updateReviewMutation.mutateAsync({
        reviewStatus: nextReviewStatus,
        actionCandidate: reviewActionCandidate || null,
        memo: reviewMemo.trim() || null,
      })
      toast.push(response.message || '검토 상태를 저장했습니다.')
      setIsReviewConfirmOpen(false)
      setReviewMemo('')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '검토 상태 저장에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="분석 결과 상세"
        description="결과 요약, 시각화, 변화 비교, 조치 후보와 검토 상태를 한 화면에서 확인하세요."
        actions={
          <>
            <Link className="btn btn-secondary" to={result.inspectionId ? `/results?inspectionId=${result.inspectionId}` : '/results'}>
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

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">결과 요약</h2>
            <p className="panel-description">분석 시각 {formatDateTime(result.analyzedAt)}</p>
          </div>
          <div className="inline-actions">
            <StatusBadge label={getResultStatusLabel(result.resultStatus)} tone={getResultStatusTone(result.resultStatus)} />
            <StatusBadge label={getReviewStatusLabel(result.reviewStatus)} tone={getReviewStatusTone(result.reviewStatus)} />
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label="대상" value={getTargetLabel(result.targetType)} />
          <DetailItem label="입력 유형" value={getInputTypeLabel(result.inputType)} />
          <DetailItem label="분석 방식" value={getModelTypeLabel(result.modelType)} />
          <DetailItem label="이상 수" value={String(result.anomalyCount ?? 0)} />
          <DetailItem label="최대 신뢰도" value={result.maxConfidence ?? '-'} />
          <DetailItem label="면적 비율" value={formatRatioPercent(result.areaRatio)} />
          <DetailItem label="심각도 점수" value={formatDecimal(result.severityScore)} />
          <DetailItem label="심각도" value={getSeverityLabel(result.severityLevel)} />
          <DetailItem label="우선순위" value={getPriorityLabel(result.priorityLevel)} />
          <DetailItem label="현재 조치 후보" value={getActionLabel(result.actionCandidate)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">원본과 결과 비교</h2>
            <p className="panel-description">원본 이미지는 이 화면에서 제공되지 않아 결과 시각화 중심으로 비교합니다.</p>
          </div>
          <ImageCompareViewer
            leftLabel="원본 이미지"
            leftDescription="원본 이미지는 점검 상세의 업로드 목록에서 확인할 수 있습니다."
            rightLabel={`${getVisualizationLabel(visualizationType)} 시각화`}
            rightImageUrl={visualizationQuery.data?.data.url}
            rightDescription={visualizationQuery.data?.data.expiresAt ? `만료 ${formatDateTime(visualizationQuery.data.data.expiresAt)}` : '시각화 이미지가 준비되면 이 영역에 표시됩니다.'}
          />
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">시각화 보기</h2>
            <p className="panel-description">필요한 보기 방식을 바꿔가며 결과를 확인하세요.</p>
          </div>
          <VisualizationOverlayViewer
            activeType={visualizationType}
            availableTypes={VISUALIZATION_TYPE_OPTIONS}
            imageUrl={visualizationQuery.data?.data.url}
            isLoading={visualizationQuery.isLoading}
            error={visualizationQuery.isError ? getApiErrorMessage(visualizationQuery.error, '시각화 이미지를 불러오지 못했습니다.') : null}
            onTypeChange={setVisualizationType}
          />
        </section>
      </section>

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">이전 점검 비교</h2>
          <p className="panel-description">이전 결과와 비교해 반복 이상과 악화 여부를 확인합니다.</p>
        </div>
        {compareQuery.isLoading ? <LoadingState message="이전 점검 비교를 불러오는 중입니다." /> : null}
        {compareQuery.isError ? (
          axios.isAxiosError(compareQuery.error) && compareQuery.error.response?.status === 404 ? (
            <EmptyState
              title="비교할 이전 점검 결과가 없습니다."
              description="같은 점검 영역의 결과가 더 쌓이면 변화 추적을 확인할 수 있습니다."
            />
          ) : (
            <ErrorState
              title="이전 점검 비교를 불러오지 못했습니다."
              description={getApiErrorMessage(compareQuery.error)}
            />
          )
        ) : null}
        {compareQuery.data ? (
          <>
            <div className="detail-grid">
              <DetailItem label="반복 이상" value={compareQuery.data.data.repeatedAnomaly ? '예' : '아니오'} />
              <DetailItem label="악화 여부" value={compareQuery.data.data.worsened ? '악화 의심' : '유지 또는 완화'} />
              <DetailItem label="면적 변화" value={formatRatioPercent(compareQuery.data.data.areaChange.areaRatioDiff)} />
              <DetailItem label="심각도 점수 변화" value={formatDecimal(compareQuery.data.data.severityChange.severityScoreDiff)} />
              <DetailItem label="결함 수 변화" value={String(compareQuery.data.data.defectChange.defectCountDiff ?? '-')} />
              <DetailItem label="우선 관리 사유" value={getPriorityReasonText(compareQuery.data.data.priorityReason)} />
            </div>
            <div className="detail-grid">
              <DetailItem label="새로 보인 결함" value={joinDefects(compareQuery.data.data.defectChange.newDefectTypes)} />
              <DetailItem label="해소된 결함" value={joinDefects(compareQuery.data.data.defectChange.resolvedDefectTypes)} />
              <DetailItem label="지속된 결함" value={joinDefects(compareQuery.data.data.defectChange.persistentDefectTypes)} />
            </div>
          </>
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">결함 후보 목록</h2>
            <p className="panel-description">이번 결과에서 탐지된 결함 후보를 확인합니다.</p>
          </div>
          <DataTable
            columns={[
              {
                key: 'defect',
                header: '결함',
                render: (row) => (
                  <div className="stack-sm">
                    <span className="font-semibold text-slate-900">{getDefectLabel(row.defectType)}</span>
                    <span className="text-xs text-slate-500">{getDefectSourceLabel(row.defectSource)}</span>
                  </div>
                ),
              },
              {
                key: 'confidence',
                header: '신뢰도',
                render: (row) => row.confidence ?? '-',
              },
              {
                key: 'bbox',
                header: '위치 정보',
                render: (row) =>
                  row.bboxX != null
                    ? `${row.bboxX}, ${row.bboxY}, ${row.bboxWidth}, ${row.bboxHeight}`
                    : '-',
              },
              {
                key: 'severity',
                header: '심각도',
                render: (row) => (
                  <div className="stack-sm">
                    <StatusBadge label={getSeverityLabel(row.severityLevel)} tone={getSeverityTone(row.severityLevel)} />
                    <span className="text-xs text-slate-500">{row.severityScore ?? '-'}</span>
                  </div>
                ),
              },
              {
                key: 'action',
                header: '조치 후보',
                render: (row) => getActionLabel(row.actionCandidate),
              },
              {
                key: 'createdAt',
                header: '기록 시각',
                render: (row) => formatDateTime(row.createdAt),
              },
            ]}
            rows={result.detections}
            rowKey={(row) => row.defectId}
            emptyTitle="결함 후보가 없습니다."
            emptyDescription="현재 결과에는 별도 결함 후보가 기록되지 않았습니다."
          />
        </section>

        <section className="stack-md">
          <section className="panel stack-md">
            <div>
              <h2 className="panel-title">조치 후보</h2>
              <p className="panel-description">현재 판단을 검토해 조치 후보를 조정할 수 있습니다.</p>
            </div>
            <FormField label="현재 조치 후보">
              <div className="detail-item">{getActionLabel(result.actionCandidate)}</div>
            </FormField>
            <FormField label="새 조치 후보">
              <select className="input-field" value={nextActionCandidate} onChange={(event) => setNextActionCandidate(event.target.value as ActionCandidate)}>
                {ACTION_CANDIDATE_OPTIONS.map((action) => (
                  <option key={action} value={action}>{getActionLabel(action)}</option>
                ))}
              </select>
            </FormField>
            <FormField label="메모">
              <textarea className="input-field textarea-field" value={actionMemo} onChange={(event) => setActionMemo(event.target.value)} />
            </FormField>
            <div className="flex justify-end">
              <button className="btn btn-primary" type="button" onClick={() => setIsActionConfirmOpen(true)}>조치 후보 저장</button>
            </div>
          </section>

          <section className="panel stack-md">
            <div>
              <h2 className="panel-title">검토 상태</h2>
              <p className="panel-description">확인 여부와 후속 조치 상태를 함께 관리합니다.</p>
            </div>
            <FormField label="현재 검토 상태">
              <div className="detail-item">{getReviewStatusLabel(result.reviewStatus)}</div>
            </FormField>
            <FormField label="새 검토 상태">
              <select className="input-field" value={nextReviewStatus} onChange={(event) => setNextReviewStatus(event.target.value as ReviewStatus)}>
                {REVIEW_STATUS_OPTIONS.map((reviewStatus) => (
                  <option key={reviewStatus} value={reviewStatus}>{getReviewStatusLabel(reviewStatus)}</option>
                ))}
              </select>
            </FormField>
            <FormField label="함께 저장할 조치 후보">
              <select className="input-field" value={reviewActionCandidate} onChange={(event) => setReviewActionCandidate(event.target.value as ActionCandidate)}>
                {ACTION_CANDIDATE_OPTIONS.map((action) => (
                  <option key={action} value={action}>{getActionLabel(action)}</option>
                ))}
              </select>
            </FormField>
            <FormField label="메모">
              <textarea className="input-field textarea-field" value={reviewMemo} onChange={(event) => setReviewMemo(event.target.value)} />
            </FormField>
            <div className="flex justify-end">
              <button className="btn btn-primary" type="button" onClick={() => setIsReviewConfirmOpen(true)}>검토 상태 저장</button>
            </div>
          </section>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">모델 정보</h2>
            <p className="panel-description">이번 결과를 생성한 모델 정보를 확인합니다.</p>
          </div>
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
            <EmptyState
              title="모델 정보가 없습니다."
              description="현재 결과에는 모델 세부 정보가 함께 제공되지 않았습니다."
            />
          )}
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">검토 이력</h2>
            <p className="panel-description">검토 상태와 조치 후보 변경 이력을 확인합니다.</p>
          </div>
          <DataTable
            columns={[
              {
                key: 'reviewer',
                header: '구분',
                render: () => '검토 기록',
              },
              {
                key: 'status',
                header: '검토 상태 변경',
                render: (row) => `${getReviewStatusLabel(row.previousReviewStatus)} -> ${getReviewStatusLabel(row.newReviewStatus)}`,
              },
              {
                key: 'action',
                header: '조치 후보 변경',
                render: (row) => `${getActionLabel(row.previousActionCandidate)} -> ${getActionLabel(row.newActionCandidate)}`,
              },
              {
                key: 'memo',
                header: '메모',
                render: (row) => row.memo ?? '-',
              },
              {
                key: 'createdAt',
                header: '기록 시각',
                render: (row) => formatDateTime(row.createdAt),
              },
            ]}
            rows={result.reviewHistories}
            rowKey={(row) => row.reviewHistoryId}
            emptyTitle="검토 이력이 없습니다."
            emptyDescription="검토 상태나 조치 후보가 변경되면 이력이 여기에 표시됩니다."
          />
        </section>
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

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function getTargetLabel(value?: TargetType | null) {
  switch (value) {
    case 'ZONE':
      return '점검 영역'
    case 'ARRAY':
      return '어레이'
    case 'PANEL':
      return '패널'
    case 'MODULE':
      return '모듈'
    default:
      return '-'
  }
}

function getInputTypeLabel(value?: AnalysisInputType | null) {
  switch (value) {
    case 'RGB_SINGLE':
      return 'RGB 단건'
    case 'THERMAL_SINGLE':
      return '열화상 단건'
    default:
      return '-'
  }
}

function getModelTypeLabel(value?: AnalysisModelType | null) {
  switch (value) {
    case 'RGB_ONLY':
      return 'RGB 분석'
    case 'THERMAL_ONLY':
      return '열화상 분석'
    default:
      return '-'
  }
}

function getResultStatusLabel(value?: string | null) {
  switch (value) {
    case 'NORMAL':
      return '정상'
    case 'ANOMALY':
      return '이상 후보 있음'
    case 'LOW_CONFIDENCE':
      return '신뢰도 낮음'
    default:
      return '-'
  }
}

function getResultStatusTone(value?: string | null) {
  switch (value) {
    case 'NORMAL':
      return 'success'
    case 'ANOMALY':
      return 'danger'
    case 'LOW_CONFIDENCE':
      return 'warning'
    default:
      return 'default'
  }
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

function getReviewStatusLabel(value?: ReviewStatus | null) {
  switch (value) {
    case 'UNCHECKED':
      return '미확인'
    case 'CONFIRMED':
      return '확인 완료'
    case 'RECHECK_REQUIRED':
      return '재점검 필요'
    case 'ACTION_COMPLETED':
      return '조치 완료'
    default:
      return '-'
  }
}

function getReviewStatusTone(value?: ReviewStatus | null) {
  switch (value) {
    case 'CONFIRMED':
    case 'ACTION_COMPLETED':
      return 'success'
    case 'RECHECK_REQUIRED':
      return 'danger'
    case 'UNCHECKED':
      return 'warning'
    default:
      return 'default'
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

function getSeverityTone(value?: SeverityLevel | null) {
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

function getPriorityLabel(value?: PriorityLevel | null) {
  switch (value) {
    case 'LOW':
      return '낮음'
    case 'MEDIUM':
      return '보통'
    case 'HIGH':
      return '높음'
    case 'URGENT':
      return '긴급'
    default:
      return '-'
  }
}

function getDefectLabel(value?: DefectType | null) {
  switch (value) {
    case 'CONTAMINATION':
      return '오염'
    case 'DUST':
      return '먼지'
    case 'LEAF':
      return '낙엽'
    case 'BIRD_DROPPING':
      return '조류 배설물'
    case 'SHADING':
      return '음영'
    case 'VEGETATION':
      return '식생'
    case 'APPEARANCE_DAMAGE':
      return '외관 손상'
    case 'HOTSPOT':
      return '핫스팟'
    case 'OVERHEATING':
      return '과열'
    case 'ABNORMAL_HEAT':
      return '이상 발열'
    case 'UNKNOWN':
      return '분류 필요'
    default:
      return '-'
  }
}

function getDefectSourceLabel(value?: DefectSource | null) {
  switch (value) {
    case 'RGB':
      return 'RGB'
    case 'THERMAL':
      return '열화상'
    default:
      return '-'
  }
}

function getVisualizationLabel(value: ResultVisualizationType) {
  switch (value) {
    case 'bbox':
      return '경계 상자'
    case 'heatmap':
      return '히트맵'
    case 'mask':
      return '마스크'
  }
}

function getPriorityReasonText(value?: string | null) {
  if (!value) return '-'
  if (value === 'worsened and repeated anomaly') return '반복 이상이면서 악화된 대상입니다.'
  if (value === 'worsened tracking result') return '이전 점검보다 악화된 대상입니다.'
  if (value === 'repeated anomaly') return '반복적으로 나타난 이상입니다.'
  if (value === 'tracked anomaly') return '지속 추적 중인 이상입니다.'
  if (value === 'severity level increased') return '심각도 단계가 높아졌습니다.'
  if (value === 'severity score increased') return '심각도 점수가 높아졌습니다.'
  if (value === 'anomaly count increased') return '이상 수가 늘어났습니다.'
  if (value === 'new high severity defect detected') return '높은 심각도의 결함이 새로 확인되었습니다.'
  if (value === 'no priority escalation') return '우선순위 상승 사유는 없습니다.'
  return value
}

function joinDefects(values: DefectType[]) {
  if (values.length === 0) {
    return '-'
  }

  return values.map(getDefectLabel).join(', ')
}
