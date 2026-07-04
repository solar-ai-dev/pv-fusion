import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useResults } from '../features/results/hooks/useResults'
import {
  getActionCandidateLabel,
  getPriorityLevelLabel,
  getResultStatusLabel,
  getResultStatusTone,
  getReviewStatusLabel,
  getReviewStatusTone,
  getSeverityLevelLabel,
  getSeverityLevelTone,
  type AnalysisResultSummary,
  type ResultListParams,
} from '../features/results/types'
import { useTracking, useTrackingCompare } from '../features/tracking/hooks/useTracking'
import type { InspectionCompare, TrackingCompareParams, TrackingListParams, TrackingSummary } from '../features/tracking/types'
import { useZone, useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { Pagination } from '../shared/components/table/Pagination'
import {
  formatCount,
  formatDateTime,
  formatRatioPercent,
  getApiErrorMessage,
  getApiErrorStatus,
  parsePositiveNumber,
} from '../shared/utils'

type ResultsTab = 'all' | 'review' | 'priority' | 'recheck' | 'tracking'

const PAGE_SIZE = 20
const RESULTS_TABS: Array<{ id: ResultsTab; label: string }> = [
  { id: 'all', label: '전체 결과' },
  { id: 'review', label: '검토 대기' },
  { id: 'priority', label: '높은 우선순위' },
  { id: 'recheck', label: '실패/재확인' },
  { id: 'tracking', label: '변화 추적' },
]

type ResultsWorkspacePageProps = {
  defaultTab?: ResultsTab
}

export function ResultsWorkspacePage({ defaultTab = 'all' }: ResultsWorkspacePageProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)
  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [fromInput, setFromInput] = useState(searchParams.get('from') ?? '')
  const [toInput, setToInput] = useState(searchParams.get('to') ?? '')
  const [compareParams, setCompareParams] = useState<TrackingCompareParams | null>(null)

  const activeTab = toResultsTab(searchParams.get('tab'), defaultTab)
  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const selectedPlantIdForFilter = parsePositiveNumber(plantIdInput) ?? 0
  const selectedZoneIdForFilter = parsePositiveNumber(zoneIdInput) ?? 0
  const baseScope = useMemo(
    () => ({
      plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
      zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
    }),
    [searchParams],
  )
  const hasScopedFilter = Boolean(baseScope.plantId || baseScope.zoneId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(selectedPlantIdForFilter)
  const selectedZoneQuery = useZone(selectedZoneIdForFilter)
  const resultsParams = useMemo<ResultListParams>(
    () => ({
      plantId: baseScope.plantId,
      zoneId: baseScope.zoneId,
      page: page - 1,
      size: PAGE_SIZE,
    }),
    [baseScope.plantId, baseScope.zoneId, page],
  )
  const trackingParams = useMemo<TrackingListParams>(
    () => ({
      plantId: baseScope.plantId,
      zoneId: baseScope.zoneId,
      from: baseScope.from,
      to: baseScope.to,
    }),
    [baseScope.from, baseScope.plantId, baseScope.to, baseScope.zoneId],
  )

  const resultsQuery = useResults(resultsParams, canQuery && activeTab !== 'tracking')
  const trackingQuery = useTracking(trackingParams, canQuery && activeTab === 'tracking')
  const compareQuery = useTrackingCompare(compareParams ?? { currentResultId: 0 }, Boolean(compareParams))

  const plantOptions = plantsQuery.data?.data.content ?? []
  const zoneOptions = zonesQuery.data?.data ?? []
  const selectedPlant = plantOptions.find((plant) => plant.plantId === baseScope.plantId) ?? null
  const selectedZone = zoneOptions.find((zone) => zone.zoneId === baseScope.zoneId) ?? selectedZoneQuery.data?.data ?? null
  const resultRows = resultsQuery.data?.data.content ?? []
  const filteredResultRows = filterResultsByTab(resultRows, activeTab)
  const trackingRows = trackingQuery.data?.data.items ?? []
  const repeatedCount = trackingRows.filter((item) => item.repeated).length
  const worsenedCount = trackingRows.filter((item) => item.worsened).length
  const priorityCount = trackingRows.filter((item) => item.priorityLevel === 'HIGH' || item.priorityLevel === 'URGENT').length

  const handleApplyFilters = () => {
    const next = new URLSearchParams()
    if (plantIdInput.trim()) next.set('plantId', plantIdInput.trim())
    if (zoneIdInput.trim()) next.set('zoneId', zoneIdInput.trim())
    if (fromInput.trim()) next.set('from', fromInput.trim())
    if (toInput.trim()) next.set('to', toInput.trim())
    if (activeTab !== 'all') next.set('tab', activeTab)
    setSearchParams(next)
  }

  const handleResetFilters = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setFromInput('')
    setToInput('')
    setCompareParams(null)
    setSearchParams(activeTab === 'all' ? {} : { tab: activeTab })
  }

  const handleSelectTab = (tab: ResultsTab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'all') next.delete('tab')
    else next.set('tab', tab)
    next.delete('page')
    setSearchParams(next)
    setCompareParams(null)
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="결과"
        description="분석 결과와 변화 추적을 한 화면에서 확인합니다."
        actions={
          <div className="page-actions">
            <Link className="text-button" to="/inspections">
              점검으로 이동
            </Link>
          </div>
        }
      />

      <section className="panel stack-md">
        <div className="section-header">
          <div>
            <h2 className="panel-title">조회 범위</h2>
            <p className="panel-description">발전소와 구역을 선택하면 결과와 변화 추적을 같은 화면에서 확인할 수 있습니다.</p>
          </div>
        </div>
        <div className="filter-grid">
          <FormField label="발전소">
            <select
              className="input-field"
              value={plantIdInput}
              onChange={(event) => {
                setPlantIdInput(event.target.value)
                setZoneIdInput('')
              }}
            >
              <option value="">전체</option>
              {plantOptions.map((plant) => (
                <option key={plant.plantId} value={plant.plantId}>
                  {plant.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="구역">
            <select
              className="input-field"
              disabled={!plantIdInput}
              value={zoneIdInput}
              onChange={(event) => setZoneIdInput(event.target.value)}
            >
              <option value="">{plantIdInput ? '전체' : '발전소를 먼저 선택하세요.'}</option>
              {zoneOptions.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="시작일">
            <input className="input-field" type="date" value={fromInput} onChange={(event) => setFromInput(event.target.value)} />
          </FormField>
          <FormField label="종료일">
            <input className="input-field" type="date" value={toInput} onChange={(event) => setToInput(event.target.value)} />
          </FormField>
        </div>
        <div className="inline-actions">
          <button className="btn btn-primary" type="button" onClick={handleApplyFilters}>
            적용
          </button>
          <button className="btn btn-secondary" type="button" onClick={handleResetFilters}>
            초기화
          </button>
        </div>
      </section>

      <section className="panel stack-md">
        <div className="workspace-tabs">
          {RESULTS_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`workspace-tab ${tab.id === activeTab ? 'workspace-tab-active' : ''}`}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {!canQuery ? (
          <CompactEmptyState
            title="먼저 발전소 또는 구역을 선택하세요."
            description="범위를 정하면 검토 대기 결과와 변화 추적을 같은 화면에서 확인할 수 있습니다."
            action={<Link className="btn btn-secondary" to="/assets">자산 선택</Link>}
          />
        ) : null}

        {canQuery && activeTab !== 'tracking' && resultsQuery.isLoading && !resultsQuery.data ? (
          <LoadingState message="분석 결과를 불러오는 중입니다." />
        ) : null}
        {canQuery && activeTab !== 'tracking' && resultsQuery.isError ? (
          <ErrorState title="분석 결과를 불러오지 못했습니다." description={getApiErrorMessage(resultsQuery.error)} />
        ) : null}

        {canQuery && activeTab === 'tracking' && trackingQuery.isLoading && trackingRows.length === 0 ? (
          <LoadingState message="변화 추적 데이터를 불러오는 중입니다." />
        ) : null}
        {canQuery && activeTab === 'tracking' && trackingQuery.isError ? (
          <ErrorState title="변화 추적 데이터를 불러오지 못했습니다." description={getApiErrorMessage(trackingQuery.error)} />
        ) : null}

        {canQuery && activeTab !== 'tracking' && resultsQuery.data ? (
          filteredResultRows.length > 0 ? (
            <section className="stack-md">
              <div className="card-grid card-grid-compact">
                <MiniSummaryCard label="현재 범위" value={[selectedPlant?.name, selectedZone?.name].filter(Boolean).join(' · ') || '선택한 범위'} />
                <MiniSummaryCard label="검토 대기" value={`${resultRows.filter((row) => row.reviewStatus === 'UNCHECKED').length}건`} />
                <MiniSummaryCard label="높은 우선순위" value={`${resultRows.filter((row) => row.priorityLevel === 'HIGH' || row.priorityLevel === 'URGENT').length}건`} />
                <MiniSummaryCard label="재확인" value={`${resultRows.filter((row) => row.reviewStatus === 'RECHECK_REQUIRED' || row.resultStatus === 'LOW_CONFIDENCE').length}건`} />
              </div>
              <div className="result-list">
                {filteredResultRows.map((row) => (
                  <ResultWorkspaceCard key={row.resultId} row={row} />
                ))}
              </div>
              <Pagination
                page={(resultsQuery.data.data.page ?? 0) + 1}
                totalPages={resultsQuery.data.data.totalPages}
                totalElements={resultsQuery.data.data.totalElements}
                onPageChange={(nextPage) => {
                  const next = new URLSearchParams(searchParams)
                  next.set('page', String(nextPage))
                  setSearchParams(next)
                }}
              />
            </section>
          ) : (
            <CompactEmptyState
              title="조건에 맞는 결과가 없습니다."
              description="점검 상세에서 이미지를 업로드하고 분석을 요청하면 결과가 표시됩니다."
            />
          )
        ) : null}

        {canQuery && activeTab === 'tracking' && trackingQuery.data ? (
          trackingRows.length > 0 ? (
            <section className="stack-md">
              <div className="card-grid card-grid-compact">
                <MiniSummaryCard label="반복 이상" value={`${formatCount(repeatedCount)}건`} />
                <MiniSummaryCard label="악화" value={`${formatCount(worsenedCount)}건`} />
                <MiniSummaryCard label="우선 관리" value={`${formatCount(priorityCount)}건`} />
                <MiniSummaryCard label="현재 범위" value={[selectedPlant?.name, selectedZone?.name].filter(Boolean).join(' · ') || '선택한 범위'} />
              </div>
              <section className="workspace-grid results-workspace-grid">
                <div className="stack-md">
                  {trackingRows.map((row) => (
                    <TrackingWorkspaceCard key={`${row.currentResultId}-${row.previousResultId ?? 'none'}`} row={row} onSelectCompare={setCompareParams} />
                  ))}
                </div>
                <section className="panel stack-md">
                  <div>
                    <h2 className="panel-title">비교 요약</h2>
                    <p className="panel-description">선택한 결과를 기준으로 이전 점검 대비 변화만 보여줍니다.</p>
                  </div>
                  {compareParams && compareQuery.isLoading ? <LoadingState message="비교 결과를 불러오는 중입니다." /> : null}
                  {compareParams && compareQuery.isError ? (
                    getApiErrorStatus(compareQuery.error) === 404 ? (
                      <CompactEmptyState title="이전 비교 결과가 없습니다." description="아직 바로 비교할 이전 점검이 없습니다." />
                    ) : (
                      <ErrorState title="비교 결과를 불러오지 못했습니다." description={getApiErrorMessage(compareQuery.error)} />
                    )
                  ) : null}
                  {compareQuery.data ? <TrackingCompareSummary data={compareQuery.data.data} /> : null}
                  {!compareParams ? (
                    <CompactEmptyState title="비교할 결과를 선택하세요." description="왼쪽 목록에서 비교 보기를 누르면 이 패널에 변화 요약이 표시됩니다." />
                  ) : null}
                </section>
              </section>
            </section>
          ) : (
            <CompactEmptyState title="아직 변화 추적 데이터가 없습니다." description="같은 구역의 결과가 쌓이면 이전 점검과 비교할 수 있습니다." />
          )
        ) : null}
      </section>
    </section>
  )
}

function ResultWorkspaceCard({ row }: { row: AnalysisResultSummary }) {
  return (
    <article className="result-card">
      <div className="section-header">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={getResultStatusLabel(row.resultStatus)} tone={getResultStatusTone(row.resultStatus)} />
            <StatusBadge label={getReviewStatusLabel(row.reviewStatus)} tone={getReviewStatusTone(row.reviewStatus)} />
            <StatusBadge label={getSeverityLevelLabel(row.severityLevel)} tone={getSeverityLevelTone(row.severityLevel)} />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">결과 #{row.resultId}</h3>
          <p className="mt-1 text-sm text-slate-600">분석 시각 {formatDateTime(row.analyzedAt)} · 조치 {getActionCandidateLabel(row.actionCandidate)}</p>
        </div>
        <Link className="btn btn-secondary" to={`/results/${row.resultId}`}>
          결과 보기
        </Link>
      </div>
      <div className="asset-summary-grid">
        <InfoItem label="점검" value={row.inspectionId ? `#${row.inspectionId}` : '-'} />
        <InfoItem label="이상 수" value={row.anomalyCount != null ? `${row.anomalyCount}건` : '-'} />
        <InfoItem label="우선순위" value={getPriorityLevelLabel(row.priorityLevel)} />
        <InfoItem label="입력 유형" value={row.inputType ?? '-'} />
      </div>
    </article>
  )
}

function TrackingWorkspaceCard({ row, onSelectCompare }: { row: TrackingSummary; onSelectCompare: (params: TrackingCompareParams) => void }) {
  return (
    <article className="result-card">
      <div className="section-header">
        <div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={row.repeated ? '반복 이상' : '반복 아님'} tone={row.repeated ? 'warning' : 'default'} />
            <StatusBadge label={row.worsened ? '악화 감지' : '악화 아님'} tone={row.worsened ? 'danger' : 'default'} />
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-950">결과 #{row.currentResultId ?? '-'}</h3>
          <p className="mt-1 text-sm text-slate-600">최근 분석 {formatDateTime(row.analyzedAt)} · 조치 {getActionCandidateLabel(row.actionCandidate)}</p>
        </div>
        <div className="secondary-action-group">
          <button className="btn btn-secondary" type="button" onClick={() => onSelectCompare({ currentResultId: row.currentResultId ?? 0, previousResultId: row.previousResultId ?? undefined })} disabled={!row.currentResultId}>
            비교 보기
          </button>
          {row.currentResultId ? <Link className="text-button" to={`/results/${row.currentResultId}`}>결과 보기</Link> : null}
        </div>
      </div>
      <div className="asset-summary-grid">
        <InfoItem label="심각도" value={getSeverityLevelLabel(row.severityLevel)} />
        <InfoItem label="우선순위" value={getPriorityLevelLabel(row.priorityLevel)} />
        <InfoItem label="면적 비율" value={formatRatioPercent(row.currentAreaRatio)} />
        <InfoItem label="반복 이상 수" value={row.repeatedAnomalyCount != null ? `${row.repeatedAnomalyCount}건` : '-'} />
      </div>
    </article>
  )
}

function TrackingCompareSummary({ data }: { data: InspectionCompare }) {
  return (
    <div className="asset-summary-grid">
      <InfoItem label="면적 변화" value={formatRatioPercent(data.areaChange.areaRatioDiff)} />
      <InfoItem label="반복 여부" value={data.repeatedAnomaly ? '반복 이상' : '반복 아님'} />
      <InfoItem label="악화 여부" value={data.worsened ? '악화 감지' : '악화 아님'} />
      <InfoItem label="우선 사유" value={data.priorityReason ?? '-'} />
    </div>
  )
}

function CompactEmptyState({ action, description, title }: { action?: ReactNode; description: string; title: string }) {
  return (
    <div className="compact-empty">
      <div className="text-base font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

function MiniSummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="summary-card">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-950">{value}</div>
    </article>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="asset-summary-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function filterResultsByTab(rows: AnalysisResultSummary[], tab: ResultsTab) {
  switch (tab) {
    case 'review':
      return rows.filter((row) => row.reviewStatus === 'UNCHECKED')
    case 'priority':
      return rows.filter((row) => row.priorityLevel === 'HIGH' || row.priorityLevel === 'URGENT')
    case 'recheck':
      return rows.filter((row) => row.reviewStatus === 'RECHECK_REQUIRED' || row.resultStatus === 'LOW_CONFIDENCE')
    default:
      return rows
  }
}

function toResultsTab(tab: string | null, fallback: ResultsTab): ResultsTab {
  if (tab === 'all' || tab === 'review' || tab === 'priority' || tab === 'recheck' || tab === 'tracking') {
    return tab
  }
  return fallback
}
