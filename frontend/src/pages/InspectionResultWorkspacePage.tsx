import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspections } from '../features/inspections/hooks/useInspections'
import { getInspectionStatusLabel, type InspectionListParams } from '../features/inspections/types'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useResults } from '../features/results/hooks/useResults'
import { getPriorityLevelLabel, getResultStatusLabel, getReviewStatusLabel, getSeverityLevelLabel, type ResultListParams } from '../features/results/types'
import { useTracking } from '../features/tracking/hooks/useTracking'
import type { TrackingListParams } from '../features/tracking/types'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { Pagination } from '../shared/components/table/Pagination'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

type WorkspaceTab = 'inspections' | 'results' | 'review' | 'tracking'
const TABS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'inspections', label: '점검' },
  { id: 'results', label: '결과' },
  { id: 'review', label: '검토 대기' },
  { id: 'tracking', label: '변화 추적' },
]

type Props = { defaultTab?: WorkspaceTab }

export function InspectionResultWorkspacePage({ defaultTab = 'inspections' }: Props) {
  const role = useAuth((state) => state.user?.role)
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const page = Math.max(parsePositiveNumber(searchParams.get('page') ?? undefined) ?? 1, 1)
  const tab = toTab(searchParams.get('tab'), defaultTab)
  const canQueryResults = role === 'ADMIN' || Boolean(plantId || zoneId)

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(plantId ?? 0)
  const inspectionParams = useMemo<InspectionListParams>(() => ({ plantId: plantId ?? undefined, zoneId: zoneId ?? undefined, from, to, page: page - 1, size: 20 }), [from, page, plantId, to, zoneId])
  const resultParams = useMemo<ResultListParams>(() => ({ plantId: plantId ?? undefined, zoneId: zoneId ?? undefined, page: page - 1, size: 20 }), [page, plantId, zoneId])
  const trackingParams = useMemo<TrackingListParams>(() => ({ plantId: plantId ?? undefined, zoneId: zoneId ?? undefined, from, to }), [from, plantId, to, zoneId])
  const inspectionsQuery = useInspections(inspectionParams)
  const resultsQuery = useResults(resultParams, canQueryResults && tab !== 'tracking')
  const trackingQuery = useTracking(trackingParams, canQueryResults && tab === 'tracking')
  const resultRows = (resultsQuery.data?.data.content ?? []).filter((row) => (tab === 'review' ? row.reviewStatus === 'UNCHECKED' : true))
  const trackingRows = trackingQuery.data?.data.items ?? []

  return (
    <section className="space-y-6">
      <PageHeader title="점검·결과" description="점검 시작, 결과 확인, 검토 대기, 변화 추적을 한 공간에서 이어갑니다." actions={<button className="btn btn-primary" type="button" onClick={() => setIsCreateOpen(true)}>새 점검 시작</button>} />
      <section className="panel stack-md">
        <div className="workspace-tabs">{TABS.map((item) => <button key={item.id} className={`workspace-tab ${tab === item.id ? 'workspace-tab-active' : ''}`} type="button" onClick={() => { const next = new URLSearchParams(searchParams); if (item.id === defaultTab) next.delete('tab'); else next.set('tab', item.id); next.delete('page'); setSearchParams(next) }}>{item.label}</button>)}</div>
        <div className="filter-grid">
          <FormField label="발전소"><select className="input-field" value={plantId ? String(plantId) : ''} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set('plantId', event.target.value); else next.delete('plantId'); next.delete('zoneId'); next.delete('page'); setSearchParams(next) }}><option value="">전체</option>{plantsQuery.data?.data.content.map((plant) => <option key={plant.plantId} value={plant.plantId}>{plant.name}</option>)}</select></FormField>
          <FormField label="구역"><select className="input-field" disabled={!plantId} value={zoneId ? String(zoneId) : ''} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set('zoneId', event.target.value); else next.delete('zoneId'); next.delete('page'); setSearchParams(next) }}><option value="">{plantId ? '전체' : '발전소를 먼저 선택하세요.'}</option>{zonesQuery.data?.data.map((zone) => <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>)}</select></FormField>
          <FormField label="시작일"><input className="input-field" type="date" value={from ?? ''} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set('from', event.target.value); else next.delete('from'); next.delete('page'); setSearchParams(next) }} /></FormField>
          <FormField label="종료일"><input className="input-field" type="date" value={to ?? ''} onChange={(event) => { const next = new URLSearchParams(searchParams); if (event.target.value) next.set('to', event.target.value); else next.delete('to'); next.delete('page'); setSearchParams(next) }} /></FormField>
        </div>
      </section>

      {tab === 'inspections' ? renderInspections(inspectionsQuery, searchParams, setSearchParams) : null}
      {tab === 'results' || tab === 'review' ? renderResults(canQueryResults, resultsQuery, resultRows, searchParams, setSearchParams) : null}
      {tab === 'tracking' ? renderTracking(canQueryResults, trackingQuery, trackingRows) : null}

      <InspectionCreateWizard isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} initialPlantId={plantId ?? null} initialZoneId={zoneId ?? null} />
    </section>
  )
}

function renderInspections(query: ReturnType<typeof useInspections>, searchParams: URLSearchParams, setSearchParams: ReturnType<typeof useSearchParams>[1]) {
  if (query.isLoading && !query.data) return <LoadingState message="점검 목록을 불러오는 중입니다." />
  if (query.isError) return <ErrorState title="점검 목록을 불러오지 못했습니다." description={getApiErrorMessage(query.error)} />
  const rows = query.data?.data.content ?? []
  if (rows.length === 0) return <section className="panel"><EmptyState title="조건에 맞는 점검이 없습니다." description="필터를 바꾸거나 새 점검을 시작하세요." /></section>
  return <section className="panel stack-md"><div className="workspace-nav-list">{rows.map((row) => <article key={row.inspectionId} className="workspace-row"><div><h3 className="text-base font-semibold text-slate-950">{row.name}</h3><p className="mt-1 text-sm text-slate-600">{`${getInspectionStatusLabel(row.inspectionStatus)} · ${formatDateTime(row.createdAt)}`}</p></div><Link className="text-button" to={`/inspections/${row.inspectionId}`}>작업 열기</Link></article>)}</div><Pagination page={(query.data?.data.page ?? 0) + 1} totalPages={query.data?.data.totalPages ?? 0} totalElements={query.data?.data.totalElements ?? 0} onPageChange={(nextPage) => { const next = new URLSearchParams(searchParams); next.set('page', String(nextPage)); setSearchParams(next) }} /></section>
}

function renderResults(canQueryResults: boolean, query: ReturnType<typeof useResults>, rows: ReturnType<typeof useResults>['data'] extends never ? never : any[], searchParams: URLSearchParams, setSearchParams: ReturnType<typeof useSearchParams>[1]) {
  if (!canQueryResults) return <section className="panel"><EmptyState title="먼저 발전소 또는 구역을 선택하세요." description="범위를 정하면 결과와 검토 대기 현황을 확인할 수 있습니다." action={<Link className="btn btn-secondary" to="/plants">발전소 선택</Link>} /></section>
  if (query.isLoading && !query.data) return <LoadingState message="분석 결과를 불러오는 중입니다." />
  if (query.isError) return <ErrorState title="분석 결과를 불러오지 못했습니다." description={getApiErrorMessage(query.error)} />
  if (rows.length === 0) return <section className="panel"><EmptyState title="조건에 맞는 결과가 없습니다." description="분석을 완료하면 결과가 표시됩니다." /></section>
  return <section className="panel stack-md"><div className="result-list">{rows.map((row) => <article key={row.resultId} className="result-card"><div className="section-header"><div><h3 className="text-base font-semibold text-slate-950">{`결과 #${row.resultId}`}</h3><p className="mt-1 text-sm text-slate-600">{`${getResultStatusLabel(row.resultStatus)} · ${getReviewStatusLabel(row.reviewStatus)} · ${getSeverityLevelLabel(row.severityLevel)}`}</p></div><Link className="text-button" to={`/results/${row.resultId}`}>결과 보기</Link></div><div className="asset-summary-grid"><Info label="점검" value={row.inspectionId ? `#${row.inspectionId}` : '-'} /><Info label="우선순위" value={getPriorityLevelLabel(row.priorityLevel)} /><Info label="이상 수" value={row.anomalyCount != null ? `${row.anomalyCount}건` : '-'} /><Info label="분석 시각" value={formatDateTime(row.analyzedAt)} /></div></article>)}</div><Pagination page={(query.data?.data.page ?? 0) + 1} totalPages={query.data?.data.totalPages ?? 0} totalElements={query.data?.data.totalElements ?? 0} onPageChange={(nextPage) => { const next = new URLSearchParams(searchParams); next.set('page', String(nextPage)); setSearchParams(next) }} /></section>
}

function renderTracking(canQueryResults: boolean, query: ReturnType<typeof useTracking>, rows: any[]) {
  if (!canQueryResults) return <section className="panel"><EmptyState title="먼저 발전소 또는 구역을 선택하세요." description="범위를 정하면 변화 추적을 확인할 수 있습니다." action={<Link className="btn btn-secondary" to="/plants">발전소 선택</Link>} /></section>
  if (query.isLoading && rows.length === 0) return <LoadingState message="변화 추적 데이터를 불러오는 중입니다." />
  if (query.isError) return <ErrorState title="변화 추적 데이터를 불러오지 못했습니다." description={getApiErrorMessage(query.error)} />
  if (rows.length === 0) return <section className="panel"><EmptyState title="아직 변화 추적 데이터가 없습니다." description="같은 구역에 결과가 쌓이면 비교할 수 있습니다." /></section>
  return <section className="panel stack-md"><div className="card-grid card-grid-compact"><Mini label="반복 이상" value={`${rows.filter((item) => item.repeated).length}건`} /><Mini label="악화" value={`${rows.filter((item) => item.worsened).length}건`} /><Mini label="우선 관리" value={`${rows.filter((item) => item.priorityLevel === 'HIGH' || item.priorityLevel === 'URGENT').length}건`} /></div><div className="result-list">{rows.map((row) => <article key={`${row.currentResultId}-${row.previousResultId ?? 'none'}`} className="result-card"><div className="section-header"><div><h3 className="text-base font-semibold text-slate-950">{`결과 #${row.currentResultId ?? '-'}`}</h3><p className="mt-1 text-sm text-slate-600">{`${row.repeated ? '반복 이상' : '반복 아님'} · ${row.worsened ? '악화 감지' : '악화 없음'}`}</p></div>{row.currentResultId ? <Link className="text-button" to={`/results/${row.currentResultId}`}>결과 보기</Link> : null}</div></article>)}</div></section>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="asset-summary-item"><span className="detail-label">{label}</span><span className="detail-value">{value}</span></div> }
function Mini({ label, value }: { label: string; value: string }) { return <article className="summary-card"><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-2 text-lg font-semibold text-slate-950">{value}</div></article> }
function toTab(value: string | null, fallback: WorkspaceTab): WorkspaceTab { return value === 'inspections' || value === 'results' || value === 'review' || value === 'tracking' ? value : fallback }
