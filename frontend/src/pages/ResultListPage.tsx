
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import type { AnalysisInputType, AnalysisJobStatus } from '../features/analysisJobs/types'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useResults } from '../features/results/hooks/useResults'
import type {
  ActionCandidate,
  AnalysisResultSummary,
  AnalysisResultStatus,
  ReviewStatus,
  ResultListParams,
  SeverityLevel,
} from '../features/results/types'
import { useZone, useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { Pagination } from '../shared/components/table/Pagination'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

const PAGE_SIZE = 20
const ACTION_OPTIONS: ActionCandidate[] = [
  'CLEANING',
  'RETAKE',
  'FIELD_INSPECTION',
  'REPLACEMENT_REVIEW',
]
const REVIEW_OPTIONS: ReviewStatus[] = [
  'UNCHECKED',
  'CONFIRMED',
  'RECHECK_REQUIRED',
  'ACTION_COMPLETED',
]
const RESULT_STATUS_OPTIONS: AnalysisResultStatus[] = ['NORMAL', 'ANOMALY', 'LOW_CONFIDENCE']
const SEVERITY_OPTIONS: SeverityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const INPUT_TYPE_OPTIONS: AnalysisInputType[] = ['RGB_SINGLE', 'THERMAL_SINGLE']
const JOB_STATUS_OPTIONS: AnalysisJobStatus[] = ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED']

export function ResultListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)
  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [fromInput, setFromInput] = useState(searchParams.get('from') ?? '')
  const [toInput, setToInput] = useState(searchParams.get('to') ?? '')

  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const params = useMemo<ResultListParams>(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
      inspectionId: parsePositiveNumber(searchParams.get('inspectionId') ?? undefined) ?? undefined,
      equipmentId: parsePositiveNumber(searchParams.get('equipmentId') ?? undefined) ?? undefined,
      inputType: (searchParams.get('inputType') as AnalysisInputType | null) ?? undefined,
      jobStatus: (searchParams.get('jobStatus') as AnalysisJobStatus | null) ?? undefined,
      resultStatus: (searchParams.get('resultStatus') as AnalysisResultStatus | null) ?? undefined,
      actionCandidate: (searchParams.get('actionCandidate') as ActionCandidate | null) ?? undefined,
      severityLevel: (searchParams.get('severityLevel') as SeverityLevel | null) ?? undefined,
      reviewStatus: (searchParams.get('reviewStatus') as ReviewStatus | null) ?? undefined,
      page: page - 1,
      size: PAGE_SIZE,
    }),
    [page, searchParams],
  )

  const selectedPlantId = parsePositiveNumber(plantIdInput) ?? 0
  const selectedZoneId = parsePositiveNumber(zoneIdInput) ?? 0
  const hasScopedFilter = Boolean(params.plantId || params.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(selectedPlantId)
  const selectedZoneQuery = useZone(selectedZoneId)
  const resultsQuery = useResults(params, canQuery)

  const plantOptions = plantsQuery.data?.data.content ?? []
  const zoneOptions = zonesQuery.data?.data ?? []
  const selectedPlant = plantOptions.find((plant) => plant.plantId === params.plantId) ?? null
  const selectedZone = zoneOptions.find((zone) => zone.zoneId === params.zoneId) ?? selectedZoneQuery.data?.data ?? null
  const selectedPlantFromZone = plantOptions.find((plant) => plant.plantId === selectedZone?.plantId) ?? null
  const rows = resultsQuery.data?.data.content ?? []
  const hasAnyFilter = Boolean(
    params.plantId ||
      params.zoneId ||
      params.actionCandidate ||
      params.reviewStatus ||
      params.severityLevel ||
      params.resultStatus ||
      params.inputType ||
      params.jobStatus ||
      searchParams.get('from') ||
      searchParams.get('to'),
  )
  const selectedScopeText = [
    selectedPlant?.name ?? selectedPlantFromZone?.name,
    selectedZone?.name,
  ].filter(Boolean).join(' · ') || '선택한 범위'

  const handleApplyFilters = () => {
    const next = new URLSearchParams()
    if (plantIdInput.trim()) next.set('plantId', plantIdInput.trim())
    if (zoneIdInput.trim()) next.set('zoneId', zoneIdInput.trim())
    if (fromInput.trim()) next.set('from', fromInput.trim())
    if (toInput.trim()) next.set('to', toInput.trim())
    setIfPresent(next, 'actionCandidate', searchParams.get('actionCandidate'))
    setIfPresent(next, 'reviewStatus', searchParams.get('reviewStatus'))
    setIfPresent(next, 'inputType', searchParams.get('inputType'))
    setIfPresent(next, 'jobStatus', searchParams.get('jobStatus'))
    setIfPresent(next, 'resultStatus', searchParams.get('resultStatus'))
    setIfPresent(next, 'severityLevel', searchParams.get('severityLevel'))
    setIfPresent(next, 'inspectionId', searchParams.get('inspectionId'))
    setIfPresent(next, 'equipmentId', searchParams.get('equipmentId'))
    next.set('page', '1')
    setSearchParams(next)
  }

  const handleSelectFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.set('page', '1')
    setSearchParams(next)
  }

  const handleResetFilters = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setFromInput('')
    setToInput('')
    setSearchParams({})
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="분석 결과"
        description="분석이 완료된 결과를 확인하고 조치 후보와 검토 상태를 관리하세요."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-secondary" type="button" onClick={() => handleSelectFilter('reviewStatus', 'UNCHECKED')}>
              검토 대기 결과
            </button>
            <Link className="btn btn-secondary" to="/inspections">점검 목록</Link>
            <Link className="btn btn-primary" to="/inspections">새 점검 시작</Link>
          </div>
        }
      />

      <section className="panel space-y-5">
        <div>
          <h2 className="panel-title">조회 조건</h2>
          <p className="panel-description">발전소, 점검 영역, 기간, 조치 후보, 검토 상태를 기준으로 필요한 분석 결과를 찾으세요.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <FormField label="발전소">
            <select className="input-field" value={plantIdInput} onChange={(event) => { setPlantIdInput(event.target.value); setZoneIdInput('') }}>
              <option value="">전체</option>
              {plantOptions.map((plant) => <option key={plant.plantId} value={plant.plantId}>{plant.name}</option>)}
            </select>
          </FormField>
          <FormField label="점검 영역">
            <select className="input-field" value={zoneIdInput} onChange={(event) => setZoneIdInput(event.target.value)} disabled={!plantIdInput}>
              <option value="">{plantIdInput ? '전체' : '발전소를 먼저 선택하세요.'}</option>
              {zoneOptions.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>)}
            </select>
          </FormField>
          <FormField label="시작일"><input className="input-field" type="date" value={fromInput} onChange={(event) => setFromInput(event.target.value)} /></FormField>
          <FormField label="종료일"><input className="input-field" type="date" value={toInput} onChange={(event) => setToInput(event.target.value)} /></FormField>
          <FormField label="조치 후보">
            <select className="input-field" value={searchParams.get('actionCandidate') ?? ''} onChange={(event) => handleSelectFilter('actionCandidate', event.target.value)}>
              <option value="">전체</option>
              {ACTION_OPTIONS.map((option) => <option key={option} value={option}>{getActionLabel(option)}</option>)}
            </select>
          </FormField>
          <FormField label="검토 상태">
            <select className="input-field" value={searchParams.get('reviewStatus') ?? ''} onChange={(event) => handleSelectFilter('reviewStatus', event.target.value)}>
              <option value="">전체</option>
              {REVIEW_OPTIONS.map((option) => <option key={option} value={option}>{getReviewLabel(option)}</option>)}
            </select>
          </FormField>
        </div>
        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">상세 필터</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FormField label="입력 유형">
              <select className="input-field" value={searchParams.get('inputType') ?? ''} onChange={(event) => handleSelectFilter('inputType', event.target.value)}>
                <option value="">전체</option>
                {INPUT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{getInputTypeLabel(option)}</option>)}
              </select>
            </FormField>
            <FormField label="분석 상태">
              <select className="input-field" value={searchParams.get('jobStatus') ?? ''} onChange={(event) => handleSelectFilter('jobStatus', event.target.value)}>
                <option value="">전체</option>
                {JOB_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{getJobStatusLabel(option)}</option>)}
              </select>
            </FormField>
            <FormField label="결과 상태">
              <select className="input-field" value={searchParams.get('resultStatus') ?? ''} onChange={(event) => handleSelectFilter('resultStatus', event.target.value)}>
                <option value="">전체</option>
                {RESULT_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{getResultStatusLabel(option)}</option>)}
              </select>
            </FormField>
            <FormField label="심각도">
              <select className="input-field" value={searchParams.get('severityLevel') ?? ''} onChange={(event) => handleSelectFilter('severityLevel', event.target.value)}>
                <option value="">전체</option>
                {SEVERITY_OPTIONS.map((option) => <option key={option} value={option}>{getSeverityLabel(option)}</option>)}
              </select>
            </FormField>
          </div>
        </details>
        <div className="inline-actions">
          <button className="btn btn-primary" type="button" onClick={handleApplyFilters}>적용하기</button>
          <button className="btn btn-secondary" type="button" onClick={handleResetFilters}>필터 초기화</button>
        </div>
      </section>

      {!canQuery ? <CompactEmptyState title="먼저 발전소 또는 점검 영역을 선택하세요." description="범위를 선택하면 분석 결과를 우선순위 중심으로 확인할 수 있습니다." action={<div className="flex flex-wrap gap-3"><Link className="btn btn-secondary" to="/plants">발전소 보기</Link><Link className="btn btn-secondary" to="/inspections">점검 목록</Link></div>} /> : null}
      {canQuery && resultsQuery.isLoading && !resultsQuery.data ? <LoadingState message="분석 결과를 불러오는 중입니다." /> : null}
      {canQuery && resultsQuery.isError ? <ErrorState title="분석 결과를 불러오지 못했습니다." description={getApiErrorMessage(resultsQuery.error)} /> : null}

      {canQuery && resultsQuery.data ? (
        <section className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="검토 대기" value={`${rows.filter((row) => row.reviewStatus === 'UNCHECKED').length}건`} tone={rows.some((row) => row.reviewStatus === 'UNCHECKED') ? 'warning' : 'default'} />
            <SummaryCard label="높은 우선순위" value={`${rows.filter((row) => row.priorityLevel === 'HIGH' || row.priorityLevel === 'URGENT').length}건`} tone={rows.some((row) => row.priorityLevel === 'HIGH' || row.priorityLevel === 'URGENT') ? 'danger' : 'default'} />
            <SummaryCard label="신뢰도 낮음" value={`${rows.filter((row) => row.resultStatus === 'LOW_CONFIDENCE').length}건`} tone={rows.some((row) => row.resultStatus === 'LOW_CONFIDENCE') ? 'warning' : 'default'} />
            <SummaryCard label="현재 범위" value={selectedScopeText} />
          </div>

          <section className="panel space-y-5">
            <div>
              <h2 className="panel-title">분석 결과 목록</h2>
              <p className="panel-description">조치 후보, 심각도, 검토 상태를 기준으로 먼저 확인할 결과를 정리했습니다.</p>
            </div>
            {rows.length > 0 ? (
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <ResultCard
                    key={row.resultId}
                    row={row}
                    rank={index + 1 + (page - 1) * PAGE_SIZE}
                    plantName={selectedPlant?.name ?? selectedPlantFromZone?.name ?? '선택한 발전소'}
                    zoneName={selectedZone?.name ?? '선택한 점검 영역'}
                  />
                ))}
              </div>
            ) : hasAnyFilter ? (
              <CompactEmptyState title="조건에 맞는 분석 결과가 없습니다." description="필터를 조정하거나 다른 점검 영역을 선택해 보세요." action={<button className="btn btn-secondary" type="button" onClick={handleResetFilters}>필터 초기화</button>} />
            ) : (
              <CompactEmptyState title="아직 분석 결과가 없습니다." description="점검 상세에서 이미지를 업로드하고 분석을 요청하면 결과가 표시됩니다." action={<div className="flex flex-wrap gap-3"><Link className="btn btn-secondary" to="/inspections">점검 목록 보기</Link><Link className="btn btn-primary" to="/inspections">새 점검 시작</Link></div>} />
            )}
            <Pagination page={(resultsQuery.data.data.page ?? 0) + 1} totalPages={resultsQuery.data.data.totalPages} totalElements={resultsQuery.data.data.totalElements} onPageChange={(nextPage) => { const next = new URLSearchParams(searchParams); next.set('page', String(nextPage)); setSearchParams(next) }} />
          </section>
        </section>
      ) : null}
    </section>
  )
}

function ResultCard({ row, rank, plantName, zoneName }: { row: ResultRow; rank: number; plantName: string; zoneName: string }) {
  const needsAttention = row.reviewStatus === 'UNCHECKED' || row.priorityLevel === 'HIGH' || row.priorityLevel === 'URGENT' || row.resultStatus === 'LOW_CONFIDENCE'
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">우선순위 {rank}</div>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">분석 결과</h3>
          <p className="mt-1 text-sm text-slate-600">{plantName} · {zoneName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {needsAttention ? <StatusBadge label="먼저 확인" tone="danger" /> : null}
          <StatusBadge label={getResultStatusLabel(row.resultStatus)} tone={getResultStatusTone(row.resultStatus)} />
          <StatusBadge label={getReviewLabel(row.reviewStatus)} tone={getReviewTone(row.reviewStatus)} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label="입력 유형" value={getInputTypeLabel(row.inputType)} />
        <InfoBlock label="조치 후보" value={getActionLabel(row.actionCandidate)} />
        <InfoBlock label="심각도" value={getSeverityLabel(row.severityLevel)} />
        <InfoBlock label="분석 시각" value={formatDateTime(row.analyzedAt)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link className="btn btn-primary" to={`/results/${row.resultId}`}>결과 보기</Link>
        <Link className="btn btn-secondary" to={`/results/${row.resultId}`}>검토하기</Link>
        {row.inspectionId ? <Link className="btn btn-secondary" to={`/inspections/${row.inspectionId}`}>점검 보기</Link> : null}
      </div>
    </article>
  )
}

type ResultRow = AnalysisResultSummary

function SummaryCard({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'warning' | 'danger' }) {
  return <article className={`kpi-card kpi-card-${tone}`}><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div></article>
}

function CompactEmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <section className="panel"><div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><div className="text-base font-semibold text-slate-900">{title}</div><p className="mt-2 text-sm text-slate-600">{description}</p>{action ? <div className="mt-4">{action}</div> : null}</div></section>
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div><div className="mt-1 text-sm text-slate-900">{value}</div></div>
}

function setIfPresent(next: URLSearchParams, key: string, value: string | null) {
  if (value && value.trim()) next.set(key, value.trim())
}

function getInputTypeLabel(value?: AnalysisInputType | null) {
  switch (value) {
    case 'RGB_SINGLE': return 'RGB'
    case 'THERMAL_SINGLE': return '열화상'
    default: return '-'
  }
}

function getJobStatusLabel(value?: AnalysisJobStatus | null) {
  switch (value) {
    case 'QUEUED': return '대기 중'
    case 'RUNNING': return '분석 중'
    case 'SUCCEEDED': return '완료'
    case 'FAILED': return '분석 실패'
    default: return '-'
  }
}

function getResultStatusLabel(value?: AnalysisResultStatus | null) {
  switch (value) {
    case 'NORMAL': return '정상'
    case 'ANOMALY': return '이상 후보 있음'
    case 'LOW_CONFIDENCE': return '신뢰도 낮음'
    default: return '-'
  }
}

function getResultStatusTone(value?: AnalysisResultStatus | null) {
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

function getReviewLabel(value?: ReviewStatus | null) {
  switch (value) {
    case 'UNCHECKED': return '미확인'
    case 'CONFIRMED': return '확인 완료'
    case 'RECHECK_REQUIRED': return '재점검 필요'
    case 'ACTION_COMPLETED': return '조치 완료'
    default: return '-'
  }
}

function getReviewTone(value?: ReviewStatus | null) {
  switch (value) {
    case 'UNCHECKED': return 'warning'
    case 'RECHECK_REQUIRED': return 'danger'
    case 'CONFIRMED':
    case 'ACTION_COMPLETED':
      return 'success'
    default:
      return 'default'
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
