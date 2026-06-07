import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import {
  ANALYSIS_INPUT_TYPE_OPTIONS,
  getAnalysisInputTypeLabel,
  getAnalysisModelTypeLabel,
} from '../features/analysisJobs/types'
import { getTargetTypeLabel, TARGET_TYPE_OPTIONS } from '../features/images/types'
import {
  getActionCandidateLabel,
  getDefectTypeLabel,
  getPriorityLevelLabel,
  getSeverityLevelLabel,
  getSeverityLevelTone,
  SEVERITY_LEVEL_OPTIONS,
  type ActionCandidate,
  type DefectType,
  type PriorityLevel,
} from '../features/results/types'
import { useTracking, useTrackingCompare } from '../features/tracking/hooks/useTracking'
import type { TrackingCompareParams, TrackingListParams, TrackingSummary } from '../features/tracking/types'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import {
  formatCount,
  formatDateTime,
  formatDecimal,
  formatRatioPercent,
  getApiErrorMessage,
  getApiErrorStatus,
  parsePositiveNumber,
} from '../shared/utils'

const ACTION_CANDIDATE_OPTIONS: ActionCandidate[] = [
  'CLEANING',
  'RETAKE',
  'FIELD_INSPECTION',
  'REPLACEMENT_REVIEW',
]

const PRIORITY_LEVEL_OPTIONS: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const MODEL_TYPE_OPTIONS = ['RGB_ONLY', 'THERMAL_ONLY', 'FUSION'] as const

export function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)

  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [equipmentIdInput, setEquipmentIdInput] = useState(
    searchParams.get('equipmentId') ?? '',
  )
  const [fromInput, setFromInput] = useState(searchParams.get('from') ?? '')
  const [toInput, setToInput] = useState(searchParams.get('to') ?? '')

  const params = useMemo<TrackingListParams>(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
      equipmentId:
        parsePositiveNumber(searchParams.get('equipmentId') ?? undefined) ?? undefined,
      targetType:
        (searchParams.get('targetType') as TrackingListParams['targetType']) ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      inputType:
        (searchParams.get('inputType') as TrackingListParams['inputType']) ?? undefined,
      modelType:
        (searchParams.get('modelType') as TrackingListParams['modelType']) ?? undefined,
      actionCandidate:
        (searchParams.get('actionCandidate') as TrackingListParams['actionCandidate']) ??
        undefined,
      priorityLevel:
        (searchParams.get('priorityLevel') as TrackingListParams['priorityLevel']) ??
        undefined,
      severityLevel:
        (searchParams.get('severityLevel') as TrackingListParams['severityLevel']) ??
        undefined,
    }),
    [searchParams],
  )

  const [compareParams, setCompareParams] = useState<TrackingCompareParams | null>(null)
  const hasScopedFilter = Boolean(params.plantId || params.zoneId || params.equipmentId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const trackingQuery = useTracking(params, canQuery)
  const compareQuery = useTrackingCompare(compareParams ?? { currentResultId: 0 }, Boolean(compareParams))

  const items = trackingQuery.data?.data.items ?? []
  const repeatedItems = items.filter((item) => item.repeated)
  const worsenedItems = items.filter((item) => item.worsened)
  const latestTracked = [...items]
    .filter((item) => item.analyzedAt)
    .sort((left, right) => String(right.analyzedAt).localeCompare(String(left.analyzedAt)))[0]

  const summary = {
    total: items.length,
    repeated: repeatedItems.length,
    worsened: worsenedItems.length,
    urgent: items.filter((item) => item.priorityLevel === 'URGENT').length,
  }

  const handleSearch = (formData: FormData) => {
    const next = new URLSearchParams()
    const setIfPresent = (key: string, value: FormDataEntryValue | null) => {
      if (typeof value === 'string' && value.trim()) {
        next.set(key, value.trim())
      }
    }

    setIfPresent('plantId', formData.get('plantId'))
    setIfPresent('zoneId', formData.get('zoneId'))
    setIfPresent('equipmentId', formData.get('equipmentId'))
    setIfPresent('targetType', formData.get('targetType'))
    setIfPresent('from', formData.get('from'))
    setIfPresent('to', formData.get('to'))
    setIfPresent('inputType', formData.get('inputType'))
    setIfPresent('modelType', formData.get('modelType'))
    setIfPresent('actionCandidate', formData.get('actionCandidate'))
    setIfPresent('priorityLevel', formData.get('priorityLevel'))
    setIfPresent('severityLevel', formData.get('severityLevel'))
    setSearchParams(next)
  }

  const handleReset = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setEquipmentIdInput('')
    setFromInput('')
    setToInput('')
    setCompareParams(null)
    setSearchParams({})
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="변화 추적"
        description="실제 tracking 목록과 이전 점검 비교 응답을 기준으로 반복 이상, 악화, 비교 결과를 확인합니다."
        actions={
          <>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                void trackingQuery.refetch()
                if (compareParams) {
                  void compareQuery.refetch()
                }
              }}
            >
              새로고침
            </button>
            <Link className="btn btn-secondary" to="/dashboard">
              대시보드
            </Link>
          </>
        }
      />

      <section className="panel stack-md">
        <div>
          <h2 className="panel-title">조회 필터</h2>
          <p className="panel-description">
            일반 사용자는 발전소, 구역, 장비 중 하나 이상의 범위를 지정해야 tracking 조회가 가능합니다.
          </p>
        </div>
        <form
          className="stack-md"
          onSubmit={(event) => {
            event.preventDefault()
            handleSearch(new FormData(event.currentTarget))
          }}
        >
          <div className="filter-grid">
            <FormField label="발전소 ID">
              <input
                className="input-field"
                name="plantId"
                value={plantIdInput}
                onChange={(event) => setPlantIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="구역 ID">
              <input
                className="input-field"
                name="zoneId"
                value={zoneIdInput}
                onChange={(event) => setZoneIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="장비 ID">
              <input
                className="input-field"
                name="equipmentId"
                value={equipmentIdInput}
                onChange={(event) => setEquipmentIdInput(event.target.value)}
              />
            </FormField>
            <FormField label="대상 유형">
              <select
                className="input-field"
                name="targetType"
                defaultValue={searchParams.get('targetType') ?? ''}
              >
                <option value="">전체</option>
                {TARGET_TYPE_OPTIONS.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {getTargetTypeLabel(targetType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="조회 시작일">
              <input
                className="input-field"
                type="date"
                name="from"
                value={fromInput}
                onChange={(event) => setFromInput(event.target.value)}
              />
            </FormField>
            <FormField label="조회 종료일">
              <input
                className="input-field"
                type="date"
                name="to"
                value={toInput}
                onChange={(event) => setToInput(event.target.value)}
              />
            </FormField>
            <FormField label="입력 유형">
              <select
                className="input-field"
                name="inputType"
                defaultValue={searchParams.get('inputType') ?? ''}
              >
                <option value="">전체</option>
                {ANALYSIS_INPUT_TYPE_OPTIONS.map((inputType) => (
                  <option key={inputType} value={inputType}>
                    {getAnalysisInputTypeLabel(inputType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="모델 유형">
              <select
                className="input-field"
                name="modelType"
                defaultValue={searchParams.get('modelType') ?? ''}
              >
                <option value="">전체</option>
                {MODEL_TYPE_OPTIONS.map((modelType) => (
                  <option key={modelType} value={modelType}>
                    {getAnalysisModelTypeLabel(modelType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="조치 후보">
              <select
                className="input-field"
                name="actionCandidate"
                defaultValue={searchParams.get('actionCandidate') ?? ''}
              >
                <option value="">전체</option>
                {ACTION_CANDIDATE_OPTIONS.map((actionCandidate) => (
                  <option key={actionCandidate} value={actionCandidate}>
                    {getActionCandidateLabel(actionCandidate)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="우선순위">
              <select
                className="input-field"
                name="priorityLevel"
                defaultValue={searchParams.get('priorityLevel') ?? ''}
              >
                <option value="">전체</option>
                {PRIORITY_LEVEL_OPTIONS.map((priorityLevel) => (
                  <option key={priorityLevel} value={priorityLevel}>
                    {getPriorityLevelLabel(priorityLevel)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="심각도">
              <select
                className="input-field"
                name="severityLevel"
                defaultValue={searchParams.get('severityLevel') ?? ''}
              >
                <option value="">전체</option>
                {SEVERITY_LEVEL_OPTIONS.map((severityLevel) => (
                  <option key={severityLevel} value={severityLevel}>
                    {getSeverityLevelLabel(severityLevel)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="inline-actions">
            <button className="btn btn-primary" type="submit">
              조회
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleReset}>
              초기화
            </button>
          </div>
        </form>
      </section>

      {!canQuery ? (
        <EmptyState
          title="먼저 범위를 지정해 주세요."
          description="현재 backend 구현은 일반 사용자 tracking 조회에 plantId, zoneId, equipmentId 중 하나를 요구합니다."
        />
      ) : null}

      {canQuery && trackingQuery.isLoading && items.length === 0 ? (
        <LoadingState message="변화 추적 목록을 불러오는 중입니다." />
      ) : null}

      {canQuery && trackingQuery.isError ? (
        <ErrorState
          title="변화 추적 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(trackingQuery.error)}
        />
      ) : null}

      {canQuery && items.length > 0 ? (
        <>
          <section className="kpi-grid">
            <StatCard label="추적 대상" value={`${formatCount(summary.total)}건`} />
            <StatCard label="반복 이상" value={`${formatCount(summary.repeated)}건`} />
            <StatCard label="악화 대상" value={`${formatCount(summary.worsened)}건`} />
            <StatCard label="긴급 우선순위" value={`${formatCount(summary.urgent)}건`} />
          </section>

          <section className="dashboard-split">
            <section className="panel stack-md">
              <div>
                <h2 className="panel-title">추적 요약</h2>
                <p className="panel-description">
                  `/tracking` 목록 응답을 기준으로 현재 범위의 반복 이상과 악화 상태를 요약합니다.
                </p>
              </div>
              <div className="detail-grid">
                <SummaryItem label="최근 분석 시각" value={formatDateTime(latestTracked?.analyzedAt)} />
                <SummaryItem label="반복 이상 개수" value={`${formatCount(summary.repeated)}건`} />
                <SummaryItem label="악화 대상 개수" value={`${formatCount(summary.worsened)}건`} />
                <SummaryItem
                  label="범위"
                  value={
                    params.equipmentId
                      ? `장비 ${params.equipmentId}`
                      : params.zoneId
                        ? `구역 ${params.zoneId}`
                        : params.plantId
                          ? `발전소 ${params.plantId}`
                          : '전체'
                  }
                />
              </div>
            </section>

            <section className="panel stack-md">
              <div>
                <h2 className="panel-title">비교 패널</h2>
                <p className="panel-description">
                  비교할 항목을 선택하면 `/tracking/compare` 응답으로 이전 점검 대비 변화량을 보여줍니다.
                </p>
              </div>
              {compareParams && compareQuery.isLoading ? (
                <LoadingState message="이전 점검 비교를 불러오는 중입니다." />
              ) : null}
              {compareParams && compareQuery.isError ? (
                getApiErrorStatus(compareQuery.error) === 404 ? (
                  <EmptyState
                    title="비교 가능한 이전 결과가 없습니다."
                    description="현재 결과에 연결된 이전 점검 결과를 찾지 못했습니다."
                  />
                ) : (
                  <ErrorState
                    title="이전 점검 비교를 불러오지 못했습니다."
                    description={getApiErrorMessage(compareQuery.error)}
                  />
                )
              ) : null}
              {compareQuery.data ? (
                <TrackingComparePanel
                  currentResultId={compareQuery.data.data.currentResultId}
                  previousResultId={compareQuery.data.data.previousResultId}
                  repeatedAnomaly={compareQuery.data.data.repeatedAnomaly}
                  worsened={compareQuery.data.data.worsened}
                  priorityReason={compareQuery.data.data.priorityReason}
                  areaDiff={compareQuery.data.data.areaChange.areaRatioDiff}
                  severityDiff={compareQuery.data.data.severityChange.severityScoreDiff}
                  defectCountDiff={compareQuery.data.data.defectChange.defectCountDiff}
                  newDefects={compareQuery.data.data.defectChange.newDefectTypes}
                  persistentDefects={compareQuery.data.data.defectChange.persistentDefectTypes}
                />
              ) : null}
              {!compareParams ? (
                <EmptyState
                  title="비교할 항목을 선택해 주세요."
                  description="아래 반복 이상 또는 악화 대상 목록에서 비교 보기를 누르면 이전 점검 비교가 표시됩니다."
                />
              ) : null}
            </section>
          </section>

          <section className="dashboard-split">
            <section className="panel stack-md">
              <div>
                <h2 className="panel-title">반복 이상 목록</h2>
                <p className="panel-description">
                  `repeated=true` 항목만 추려 반복 이상 대상을 보여줍니다.
                </p>
              </div>
              <TrackingTable
                rows={repeatedItems}
                emptyTitle="반복 이상이 없습니다."
                emptyDescription="현재 범위에서 반복으로 분류된 이상 항목이 없습니다."
                onSelectCompare={(row) =>
                  setCompareParams({
                    currentResultId: row.currentResultId ?? 0,
                    previousResultId: row.previousResultId ?? undefined,
                  })
                }
              />
            </section>

            <section className="panel stack-md">
              <div>
                <h2 className="panel-title">악화 대상 목록</h2>
                <p className="panel-description">
                  `worsened=true` 항목만 추려 우선 확인 대상을 보여줍니다.
                </p>
              </div>
              <TrackingTable
                rows={worsenedItems}
                emptyTitle="악화 대상이 없습니다."
                emptyDescription="현재 범위에서 악화로 판정된 항목이 없습니다."
                onSelectCompare={(row) =>
                  setCompareParams({
                    currentResultId: row.currentResultId ?? 0,
                    previousResultId: row.previousResultId ?? undefined,
                  })
                }
              />
            </section>
          </section>
        </>
      ) : null}
    </section>
  )
}

function TrackingTable({
  rows,
  emptyTitle,
  emptyDescription,
  onSelectCompare,
}: {
  rows: TrackingSummary[]
  emptyTitle: string
  emptyDescription: string
  onSelectCompare: (row: TrackingSummary) => void
}) {
  return (
    <DataTable
      columns={[
        {
          key: 'target',
          header: '대상',
          render: (row) => (
            <div className="stack-sm">
              <span className="font-semibold text-slate-900">
                {getTargetTypeLabel(row.targetType ?? 'ZONE')}
              </span>
              <span className="text-xs text-slate-500">
                {`구역 ${row.zoneId ?? '-'} · 장비 ${row.equipmentId ?? '-'} · 결과 ${row.currentResultId ?? '-'}`}
              </span>
            </div>
          ),
        },
        {
          key: 'status',
          header: '상태',
          render: (row) => (
            <div className="stack-sm">
              <StatusBadge
                label={getSeverityLevelLabel(row.severityLevel)}
                tone={getSeverityLevelTone(row.severityLevel)}
              />
              <StatusBadge label={getPriorityLevelLabel(row.priorityLevel)} />
            </div>
          ),
        },
        {
          key: 'metrics',
          header: '변화',
          render: (row) => (
            <div className="stack-sm text-sm">
              <span>{`이상 ${formatCount(row.anomalyCount)}건`}</span>
              <span>{`반복 ${formatCount(row.repeatedAnomalyCount)}건`}</span>
              <span>{`면적 ${formatRatioPercent(row.currentAreaRatio)}`}</span>
            </div>
          ),
        },
        {
          key: 'action',
          header: '조치 후보',
          render: (row) => getActionCandidateLabel(row.actionCandidate),
        },
        {
          key: 'time',
          header: '분석 시각',
          render: (row) => formatDateTime(row.analyzedAt),
        },
        {
          key: 'move',
          header: '이동',
          render: (row) => (
            <div className="inline-actions">
              <button
                className="text-button"
                type="button"
                disabled={!row.currentResultId}
                onClick={() => onSelectCompare(row)}
              >
                이전 비교
              </button>
              {row.currentResultId ? (
                <Link className="text-button" to={`/results/${row.currentResultId}`}>
                  결과 상세
                </Link>
              ) : null}
              {row.zoneId ? (
                <Link className="text-button" to={`/zones/${row.zoneId}`}>
                  구역 상세
                </Link>
              ) : null}
            </div>
          ),
        },
      ]}
      rows={rows}
      rowKey={(row, index) => row.currentResultId ?? `tracking-${index}`}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
    />
  )
}

function TrackingComparePanel({
  currentResultId,
  previousResultId,
  repeatedAnomaly,
  worsened,
  priorityReason,
  areaDiff,
  severityDiff,
  defectCountDiff,
  newDefects,
  persistentDefects,
}: {
  currentResultId: number
  previousResultId: number | null
  repeatedAnomaly: boolean
  worsened: boolean
  priorityReason: string | null
  areaDiff: string | null
  severityDiff: string | null
  defectCountDiff: number | null
  newDefects: DefectType[]
  persistentDefects: DefectType[]
}) {
  return (
    <div className="stack-md">
      <div className="inline-actions">
        <StatusBadge label={repeatedAnomaly ? '반복 이상' : '반복 아님'} />
        <StatusBadge label={worsened ? '악화됨' : '악화 아님'} tone={worsened ? 'danger' : 'default'} />
      </div>
      <div className="detail-grid">
        <SummaryItem label="현재 결과 ID" value={String(currentResultId)} />
        <SummaryItem label="이전 결과 ID" value={String(previousResultId ?? '-')} />
        <SummaryItem label="면적 변화" value={formatRatioPercent(areaDiff)} />
        <SummaryItem label="심각도 변화" value={formatDecimal(severityDiff)} />
        <SummaryItem label="결함 개수 변화" value={formatCount(defectCountDiff)} />
        <SummaryItem label="판단 사유" value={priorityReason ?? '-'} />
      </div>
      <div className="detail-grid">
        <SummaryItem
          label="새 결함 유형"
          value={newDefects.length > 0 ? newDefects.map((item) => getDefectTypeLabel(item as never)).join(', ') : '-'}
        />
        <SummaryItem
          label="지속 결함 유형"
          value={
            persistentDefects.length > 0
              ? persistentDefects.map((item) => getDefectTypeLabel(item as never)).join(', ')
              : '-'
          }
        />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="kpi-card kpi-card-default">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </article>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}
