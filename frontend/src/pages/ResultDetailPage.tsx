import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getAnalysisInputTypeLabel,
  getAnalysisModelTypeLabel,
} from '../features/analysisJobs/types'
import {
  ACTION_CANDIDATE_OPTIONS,
  REVIEW_STATUS_OPTIONS,
  VISUALIZATION_TYPE_OPTIONS,
  getActionCandidateLabel,
  getDefectSourceLabel,
  getDefectTypeLabel,
  getPriorityLevelLabel,
  getResultStatusLabel,
  getResultStatusTone,
  getReviewStatusLabel,
  getReviewStatusTone,
  getSeverityLevelLabel,
  getSeverityLevelTone,
  getVisualizationTypeLabel,
  type ResultVisualizationType,
} from '../features/results/types'
import {
  useResult,
  useResultVisualization,
  useUpdateActionCandidate,
  useUpdateReviewStatus,
} from '../features/results/hooks/useResults'
import { getTargetTypeLabel } from '../features/images/types'
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
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

export function ResultDetailPage() {
  const params = useParams()
  const toast = useToast()
  const resultId = parsePositiveNumber(params.resultId)
  const [visualizationType, setVisualizationType] =
    useState<ResultVisualizationType>('bbox')
  const [nextActionCandidate, setNextActionCandidate] = useState('')
  const [actionMemo, setActionMemo] = useState('')
  const [nextReviewStatus, setNextReviewStatus] = useState('')
  const [reviewActionCandidate, setReviewActionCandidate] = useState('')
  const [reviewMemo, setReviewMemo] = useState('')
  const [isActionConfirmOpen, setIsActionConfirmOpen] = useState(false)
  const [isReviewConfirmOpen, setIsReviewConfirmOpen] = useState(false)

  const resultQuery = useResult(resultId ?? 0)
  const visualizationQuery = useResultVisualization(
    resultId ?? 0,
    visualizationType,
    Boolean(resultId),
  )
  const updateActionMutation = useUpdateActionCandidate(resultId ?? 0)
  const updateReviewMutation = useUpdateReviewStatus(resultId ?? 0)

  useEffect(() => {
    if (!resultQuery.data) {
      return
    }

    setNextActionCandidate(resultQuery.data.data.actionCandidate ?? ACTION_CANDIDATE_OPTIONS[0])
    setReviewActionCandidate(
      resultQuery.data.data.actionCandidate ?? ACTION_CANDIDATE_OPTIONS[0],
    )
    setNextReviewStatus(resultQuery.data.data.reviewStatus ?? REVIEW_STATUS_OPTIONS[0])
  }, [resultQuery.data])

  if (!resultId) {
    return (
      <ErrorState
        title="잘못된 결과 ID입니다."
        description="URL의 resultId가 올바른 숫자인지 확인해 주세요."
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
        actionCandidate: nextActionCandidate as (typeof ACTION_CANDIDATE_OPTIONS)[number],
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
        reviewStatus: nextReviewStatus as (typeof REVIEW_STATUS_OPTIONS)[number],
        actionCandidate: reviewActionCandidate
          ? (reviewActionCandidate as (typeof ACTION_CANDIDATE_OPTIONS)[number])
          : null,
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
        description="결과 요약, 결함 후보, 시각화, 조치 후보와 검토 상태를 실제 backend API 계약 기준으로 확인합니다."
        actions={
          <>
            <Link className="btn btn-secondary" to={result.inspectionId ? `/results?inspectionId=${result.inspectionId}` : '/results'}>
              목록으로
            </Link>
            {result.inspectionId ? (
              <Link className="btn btn-secondary" to={`/inspections/${result.inspectionId}`}>
                점검 상세
              </Link>
            ) : null}
          </>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">{`Result #${result.resultId}`}</h2>
            <p className="panel-description">{`Job #${result.jobId} · 분석 시각 ${formatDateTime(result.analyzedAt)}`}</p>
          </div>
          <div className="inline-actions">
            <StatusBadge
              label={getResultStatusLabel(result.resultStatus)}
              tone={getResultStatusTone(result.resultStatus)}
            />
            <StatusBadge
              label={getReviewStatusLabel(result.reviewStatus)}
              tone={getReviewStatusTone(result.reviewStatus)}
            />
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label="Plant ID" value={String(result.plantId ?? '-')} />
          <DetailItem label="Zone ID" value={String(result.zoneId ?? '-')} />
          <DetailItem label="Inspection ID" value={String(result.inspectionId ?? '-')} />
          <DetailItem label="Target" value={result.targetType ? getTargetTypeLabel(result.targetType) : '-'} />
          <DetailItem label="Equipment ID" value={String(result.equipmentId ?? '-')} />
          <DetailItem label="Input Type" value={result.inputType ? getAnalysisInputTypeLabel(result.inputType) : '-'} />
          <DetailItem label="Model Type" value={getAnalysisModelTypeLabel(result.modelType)} />
          <DetailItem label="이상 수" value={String(result.anomalyCount ?? 0)} />
          <DetailItem label="최대 신뢰도" value={result.maxConfidence ?? '-'} />
          <DetailItem label="면적 비율" value={result.areaRatio ?? '-'} />
          <DetailItem label="심각도 점수" value={result.severityScore ?? '-'} />
          <DetailItem label="우선순위" value={getPriorityLevelLabel(result.priorityLevel)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">원본 / 결과 비교</h2>
            <p className="panel-description">
              현재 backend 공개 API에는 원본 이미지 URL이 직접 포함되지 않아, 결과 시각화 이미지를 중심으로 비교 영역을 제공합니다.
            </p>
          </div>
          <ImageCompareViewer
            leftLabel="원본 이미지"
            leftDescription="원본 이미지 조회용 public endpoint는 현재 결과 API에 포함되지 않았습니다."
            rightLabel={`${getVisualizationTypeLabel(visualizationType)} 시각화`}
            rightImageUrl={visualizationQuery.data?.data.url}
            rightDescription={
              visualizationQuery.data?.data.expiresAt
                ? `만료 ${formatDateTime(visualizationQuery.data.data.expiresAt)}`
                : '권한 검증 후 발급된 URL 또는 backend가 보관한 fileUrl을 사용합니다.'
            }
          />
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">시각화 뷰어</h2>
            <p className="panel-description">
              실제 backend는 `bbox`, `heatmap`, `mask`를 개별 `type` 파라미터로 조회합니다.
            </p>
          </div>
          <VisualizationOverlayViewer
            activeType={visualizationType}
            availableTypes={VISUALIZATION_TYPE_OPTIONS}
            imageUrl={visualizationQuery.data?.data.url}
            isLoading={visualizationQuery.isLoading}
            error={
              visualizationQuery.isError
                ? getApiErrorMessage(
                    visualizationQuery.error,
                    '선택한 시각화 이미지를 불러오지 못했습니다.',
                  )
                : null
            }
            onTypeChange={setVisualizationType}
          />
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">결함 후보 목록</h2>
            <p className="panel-description">
              결과 상세 응답의 `detections`를 그대로 표시합니다.
            </p>
          </div>
          <DataTable
            columns={[
              {
                key: 'defect',
                header: '결함',
                render: (row) => (
                  <div className="stack-sm">
                    <span className="font-semibold text-slate-900">{getDefectTypeLabel(row.defectType)}</span>
                    <span className="text-xs text-slate-500">{`#${row.defectId} · ${getDefectSourceLabel(row.defectSource)}`}</span>
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
                header: 'BBox',
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
                    <StatusBadge
                      label={getSeverityLevelLabel(row.severityLevel)}
                      tone={getSeverityLevelTone(row.severityLevel)}
                    />
                    <span className="text-xs text-slate-500">{row.severityScore ?? '-'}</span>
                  </div>
                ),
              },
              {
                key: 'action',
                header: '조치 후보',
                render: (row) => getActionCandidateLabel(row.actionCandidate),
              },
              {
                key: 'createdAt',
                header: '생성 시각',
                render: (row) => formatDateTime(row.createdAt),
              },
            ]}
            rows={result.detections}
            rowKey={(row) => row.defectId}
            emptyTitle="결함 후보가 없습니다."
            emptyDescription="현재 결과 응답에 감지된 defect 목록이 비어 있습니다."
          />
        </section>

        <section className="stack-md">
          <section className="panel stack-md">
            <div>
              <h2 className="panel-title">조치 후보</h2>
              <p className="panel-description">
                실제 backend는 `PATCH /analysis-results/{resultId}`로 조치 후보를 변경합니다.
              </p>
            </div>
            <FormField label="현재 조치 후보">
              <div className="detail-item">{getActionCandidateLabel(result.actionCandidate)}</div>
            </FormField>
            <FormField label="새 조치 후보">
              <select
                className="input-field"
                value={nextActionCandidate}
                onChange={(event) => setNextActionCandidate(event.target.value)}
              >
                {ACTION_CANDIDATE_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {getActionCandidateLabel(action)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="메모">
              <textarea
                className="input-field textarea-field"
                value={actionMemo}
                onChange={(event) => setActionMemo(event.target.value)}
              />
            </FormField>
            <div className="flex justify-end">
              <button className="btn btn-primary" type="button" onClick={() => setIsActionConfirmOpen(true)}>
                조치 후보 저장
              </button>
            </div>
          </section>

          <section className="panel stack-md">
            <div>
              <h2 className="panel-title">검토 상태</h2>
              <p className="panel-description">
                실제 backend는 `PATCH /analysis-results/{resultId}/review`로 검토 상태를 변경합니다.
              </p>
            </div>
            <FormField label="현재 검토 상태">
              <div className="detail-item">{getReviewStatusLabel(result.reviewStatus)}</div>
            </FormField>
            <FormField label="새 검토 상태">
              <select
                className="input-field"
                value={nextReviewStatus}
                onChange={(event) => setNextReviewStatus(event.target.value)}
              >
                {REVIEW_STATUS_OPTIONS.map((reviewStatus) => (
                  <option key={reviewStatus} value={reviewStatus}>
                    {getReviewStatusLabel(reviewStatus)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="함께 저장할 조치 후보">
              <select
                className="input-field"
                value={reviewActionCandidate}
                onChange={(event) => setReviewActionCandidate(event.target.value)}
              >
                {ACTION_CANDIDATE_OPTIONS.map((action) => (
                  <option key={action} value={action}>
                    {getActionCandidateLabel(action)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="메모">
              <textarea
                className="input-field textarea-field"
                value={reviewMemo}
                onChange={(event) => setReviewMemo(event.target.value)}
              />
            </FormField>
            <div className="flex justify-end">
              <button className="btn btn-primary" type="button" onClick={() => setIsReviewConfirmOpen(true)}>
                검토 상태 저장
              </button>
            </div>
          </section>
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">모델 정보</h2>
            <p className="panel-description">
              결과 상세 응답의 `modelInfo`를 그대로 표시합니다.
            </p>
          </div>
          {result.modelInfo ? (
            <div className="detail-grid">
              <DetailItem label="모델명" value={result.modelInfo.modelName} />
              <DetailItem label="버전" value={result.modelInfo.modelVersion} />
              <DetailItem label="포맷" value={result.modelInfo.modelFormat} />
              <DetailItem label="런타임" value={result.modelInfo.runtime} />
              <DetailItem label="입력 크기" value={String(result.modelInfo.inputSize)} />
              <DetailItem label="Threshold" value={result.modelInfo.threshold} />
            </div>
          ) : (
            <EmptyState
              title="모델 정보가 없습니다."
              description="현재 결과 응답에 modelInfo가 비어 있습니다."
            />
          )}
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">검토 이력</h2>
            <p className="panel-description">
              review/action 변경 이력을 결과 상세 응답의 `reviewHistories`에서 확인합니다.
            </p>
          </div>
          <DataTable
            columns={[
              {
                key: 'reviewer',
                header: '검토자',
                render: (row) => `User ${row.reviewerUserId}`,
              },
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
                  `${getActionCandidateLabel(row.previousActionCandidate)} → ${getActionCandidateLabel(row.newActionCandidate)}`,
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
            emptyDescription="아직 review/action 변경 이력이 기록되지 않았습니다."
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
