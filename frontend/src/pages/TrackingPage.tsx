
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth'
import { usePlants } from '../features/plants/hooks/usePlants'
import type { ActionCandidate, DefectType, PriorityLevel, SeverityLevel } from '../features/results/types'
import { useTracking, useTrackingCompare } from '../features/tracking/hooks/useTracking'
import type {
  InspectionCompare,
  TrackingCompareParams,
  TrackingListParams,
  TrackingSummary,
} from '../features/tracking/types'
import { useZone, useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { formatCount, formatDateTime, formatDecimal, formatRatioPercent, getApiErrorMessage, getApiErrorStatus, parsePositiveNumber } from '../shared/utils'

const ACTION_OPTIONS: ActionCandidate[] = ['CLEANING', 'RETAKE', 'FIELD_INSPECTION', 'REPLACEMENT_REVIEW']
const PRIORITY_OPTIONS: PriorityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const SEVERITY_OPTIONS: SeverityLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function TrackingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuth((state) => state.user?.role)
  const [plantIdInput, setPlantIdInput] = useState(searchParams.get('plantId') ?? '')
  const [zoneIdInput, setZoneIdInput] = useState(searchParams.get('zoneId') ?? '')
  const [fromInput, setFromInput] = useState(searchParams.get('from') ?? '')
  const [toInput, setToInput] = useState(searchParams.get('to') ?? '')
  const [compareParams, setCompareParams] = useState<TrackingCompareParams | null>(null)

  const params = useMemo<TrackingListParams>(() => ({
    plantId: parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? undefined,
    zoneId: parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? undefined,
    equipmentId: parsePositiveNumber(searchParams.get('equipmentId') ?? undefined) ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    actionCandidate: (searchParams.get('actionCandidate') as ActionCandidate | null) ?? undefined,
    priorityLevel: (searchParams.get('priorityLevel') as PriorityLevel | null) ?? undefined,
    severityLevel: (searchParams.get('severityLevel') as SeverityLevel | null) ?? undefined,
  }), [searchParams])

  const selectedPlantId = parsePositiveNumber(plantIdInput) ?? 0
  const selectedZoneId = parsePositiveNumber(zoneIdInput) ?? 0
  const hasScopedFilter = Boolean(params.plantId || params.zoneId || params.equipmentId)
  const canQuery = role === 'ADMIN' || hasScopedFilter

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(selectedPlantId)
  const selectedZoneQuery = useZone(selectedZoneId)
  const trackingQuery = useTracking(params, canQuery)
  const compareQuery = useTrackingCompare(compareParams ?? { currentResultId: 0 }, Boolean(compareParams))

  const plantOptions = plantsQuery.data?.data.content ?? []
  const zoneOptions = zonesQuery.data?.data ?? []
  const selectedPlant = plantOptions.find((plant) => plant.plantId === params.plantId) ?? null
  const selectedZone = zoneOptions.find((zone) => zone.zoneId === params.zoneId) ?? selectedZoneQuery.data?.data ?? null
  const items = trackingQuery.data?.data.items ?? []
  const repeatedItems = items.filter((item) => item.repeated)
  const worsenedItems = items.filter((item) => item.worsened)
  const priorityItems = items.filter((item) => item.priorityLevel === 'HIGH' || item.priorityLevel === 'URGENT')
  const latestTracked = [...items].filter((item) => item.analyzedAt).sort((left, right) => String(right.analyzedAt).localeCompare(String(left.analyzedAt)))[0]
  const selectedScopeText = [selectedPlant?.name, selectedZone?.name].filter(Boolean).join(' · ') || '선택한 범위'

  const handleApplyFilters = () => {
    const next = new URLSearchParams()
    if (plantIdInput.trim()) next.set('plantId', plantIdInput.trim())
    if (zoneIdInput.trim()) next.set('zoneId', zoneIdInput.trim())
    if (fromInput.trim()) next.set('from', fromInput.trim())
    if (toInput.trim()) next.set('to', toInput.trim())
    setIfPresent(next, 'actionCandidate', searchParams.get('actionCandidate'))
    setIfPresent(next, 'priorityLevel', searchParams.get('priorityLevel'))
    setIfPresent(next, 'severityLevel', searchParams.get('severityLevel'))
    setIfPresent(next, 'equipmentId', searchParams.get('equipmentId'))
    setSearchParams(next)
  }

  const handleSelectFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const handleReset = () => {
    setPlantIdInput('')
    setZoneIdInput('')
    setFromInput('')
    setToInput('')
    setCompareParams(null)
    setSearchParams({})
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="변화 추적"
        description="같은 점검 영역의 이전 결과와 비교해 반복 이상과 악화 여부를 확인하세요."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link className="btn btn-secondary" to="/plants">점검 영역 선택</Link>
            <Link className="btn btn-secondary" to="/results">결과 목록 보기</Link>
            <Link className="btn btn-primary" to="/inspections">새 점검 시작</Link>
          </div>
        }
      />

      <section className="panel space-y-5">
        <div>
          <h2 className="panel-title">조회 조건</h2>
          <p className="panel-description">발전소, 점검 영역, 기간, 조치 후보, 심각도를 기준으로 반복 이상과 악화 여부를 좁혀 보세요.</p>
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
          <FormField label="심각도">
            <select className="input-field" value={searchParams.get('severityLevel') ?? ''} onChange={(event) => handleSelectFilter('severityLevel', event.target.value)}>
              <option value="">전체</option>
              {SEVERITY_OPTIONS.map((option) => <option key={option} value={option}>{getSeverityLabel(option)}</option>)}
            </select>
          </FormField>
        </div>
        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">상세 필터</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField label="우선순위">
              <select className="input-field" value={searchParams.get('priorityLevel') ?? ''} onChange={(event) => handleSelectFilter('priorityLevel', event.target.value)}>
                <option value="">전체</option>
                {PRIORITY_OPTIONS.map((option) => <option key={option} value={option}>{getPriorityLabel(option)}</option>)}
              </select>
            </FormField>
          </div>
        </details>
        <div className="inline-actions">
          <button className="btn btn-primary" type="button" onClick={handleApplyFilters}>적용하기</button>
          <button className="btn btn-secondary" type="button" onClick={handleReset}>필터 초기화</button>
        </div>
      </section>

      {!canQuery ? <CompactEmptyState title="먼저 점검 영역을 선택하세요." description="변화 추적은 같은 점검 영역의 결과가 누적되어야 의미가 있습니다. 범위를 먼저 선택해 주세요." action={<div className="flex flex-wrap gap-3"><Link className="btn btn-secondary" to="/plants">점검 영역 선택</Link><Link className="btn btn-secondary" to="/results">결과 목록 보기</Link></div>} /> : null}
      {canQuery && trackingQuery.isLoading && items.length === 0 ? <LoadingState message="변화 추적 데이터를 불러오는 중입니다." /> : null}
      {canQuery && trackingQuery.isError ? <ErrorState title="변화 추적 데이터를 불러오지 못했습니다." description={getApiErrorMessage(trackingQuery.error)} /> : null}

      {canQuery && items.length > 0 ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="반복 이상" value={`${formatCount(repeatedItems.length)}건`} description="같은 점검 영역에서 반복적으로 나타난 이상 후보입니다." tone={repeatedItems.length > 0 ? 'warning' : 'default'} />
            <SummaryCard label="악화 의심" value={`${formatCount(worsenedItems.length)}건`} description="이전 점검보다 심각도나 면적이 커진 후보입니다." tone={worsenedItems.length > 0 ? 'danger' : 'default'} />
            <SummaryCard label="우선 관리 대상" value={`${formatCount(priorityItems.length)}건`} description="우선순위가 높은 점검 영역입니다." tone={priorityItems.length > 0 ? 'danger' : 'default'} />
            <SummaryCard label="최근 점검 대비 변화" value={latestTracked?.analyzedAt ? formatDateTime(latestTracked.analyzedAt) : '-'} description={selectedScopeText} />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">반복 이상과 악화 의심 목록</h2>
                <p className="panel-description">어떤 결과를 먼저 확인해야 하는지 바로 판단할 수 있도록 정리했습니다.</p>
              </div>
              <div className="space-y-4">
                {items.map((row) => <TrackingRowCard key={`${row.currentResultId ?? 'tracking'}-${row.previousResultId ?? 'prev'}`} row={row} onSelectCompare={setCompareParams} zoneName={selectedZone?.name ?? '선택한 점검 영역'} />)}
              </div>
            </section>

            <section className="panel space-y-5">
              <div>
                <h2 className="panel-title">비교 요약</h2>
                <p className="panel-description">선택한 결과를 기준으로 이전 점검과 비교한 변화를 보여줍니다.</p>
              </div>
              {compareParams && compareQuery.isLoading ? <LoadingState message="비교 결과를 불러오는 중입니다." /> : null}
              {compareParams && compareQuery.isError ? (
                getApiErrorStatus(compareQuery.error) === 404 ? <CompactEmptyState title="비교할 이전 결과가 없습니다." description="이 결과는 아직 바로 비교할 이전 점검 결과가 없습니다." /> : <ErrorState title="비교 결과를 불러오지 못했습니다." description={getApiErrorMessage(compareQuery.error)} />
              ) : null}
              {compareQuery.data ? <TrackingComparePanel data={compareQuery.data.data} /> : null}
              {!compareParams ? <CompactEmptyState title="비교할 결과를 선택하세요." description="왼쪽 목록에서 비교 보기를 누르면 이전 점검 대비 변화가 표시됩니다." /> : null}
            </section>
          </section>
        </>
      ) : null}

      {canQuery && trackingQuery.data && items.length === 0 ? <CompactEmptyState title="아직 비교할 이전 점검 결과가 없습니다." description="같은 점검 영역의 결과가 2회 이상 누적되면 반복 이상과 악화 여부를 확인할 수 있습니다." action={<div className="flex flex-wrap gap-3"><Link className="btn btn-primary" to="/inspections">새 점검 시작</Link><Link className="btn btn-secondary" to="/results">결과 목록 보기</Link></div>} /> : null}
    </section>
  )
}

type CompareData = InspectionCompare

function TrackingRowCard({ row, onSelectCompare, zoneName }: { row: TrackingSummary; onSelectCompare: (params: TrackingCompareParams) => void; zoneName: string }) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{zoneName}</h3>
          <p className="mt-1 text-sm text-slate-600">최근 점검 {formatDateTime(row.analyzedAt)} · 이전 점검 {row.previousResultId ? '비교 가능' : '이전 결과 없음'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge label={row.repeated ? '반복 이상' : '반복 아님'} tone={row.repeated ? 'warning' : 'default'} />
          <StatusBadge label={row.worsened ? '악화 의심' : '악화 아님'} tone={row.worsened ? 'danger' : 'default'} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label="조치 후보" value={getActionLabel(row.actionCandidate)} />
        <InfoBlock label="심각도" value={getSeverityLabel(row.severityLevel)} />
        <InfoBlock label="우선순위" value={getPriorityLabel(row.priorityLevel)} />
        <InfoBlock label="면적 비율" value={formatRatioPercent(row.currentAreaRatio)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn btn-secondary" type="button" disabled={!row.currentResultId} onClick={() => onSelectCompare({ currentResultId: row.currentResultId ?? 0, previousResultId: row.previousResultId ?? undefined })}>비교 보기</button>
        {row.currentResultId ? <Link className="btn btn-primary" to={`/results/${row.currentResultId}`}>결과 보기</Link> : null}
      </div>
    </article>
  )
}

function TrackingComparePanel({ data }: { data: CompareData }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatusBadge label={data.repeatedAnomaly ? '반복 이상' : '반복 아님'} tone={data.repeatedAnomaly ? 'warning' : 'default'} />
        <StatusBadge label={data.worsened ? '악화 의심' : '악화 아님'} tone={data.worsened ? 'danger' : 'default'} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoBlock label="면적 변화" value={formatRatioPercent(data.areaChange.areaRatioDiff)} />
        <InfoBlock label="심각도 점수 변화" value={formatDecimal(data.severityChange.severityScoreDiff)} />
        <InfoBlock label="결함 수 변화" value={`${formatCount(data.defectChange.defectCountDiff)}건`} />
        <InfoBlock label="우선 관리 사유" value={getPriorityReasonText(data.priorityReason)} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <InfoBlock label="새로 보인 결함 유형" value={data.defectChange.newDefectTypes.length > 0 ? data.defectChange.newDefectTypes.map(getDefectLabel).join(', ') : '-'} />
        <InfoBlock label="계속 보이는 결함 유형" value={data.defectChange.persistentDefectTypes.length > 0 ? data.defectChange.persistentDefectTypes.map(getDefectLabel).join(', ') : '-'} />
      </div>
    </div>
  )
}

function SummaryCard({ label, value, description, tone = 'default' }: { label: string; value: string; description: string; tone?: 'default' | 'warning' | 'danger' }) {
  return <article className={`kpi-card kpi-card-${tone}`}><div className="text-sm font-medium text-slate-500">{label}</div><div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div><p className="mt-2 text-sm text-slate-600">{description}</p></article>
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

function getActionLabel(value?: ActionCandidate | null) {
  switch (value) {
    case 'CLEANING': return '청소 후보'
    case 'RETAKE': return '재촬영 후보'
    case 'FIELD_INSPECTION': return '현장 점검 후보'
    case 'REPLACEMENT_REVIEW': return '교체 검토 후보'
    default: return '-'
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

function getPriorityLabel(value?: PriorityLevel | null) {
  switch (value) {
    case 'LOW': return '낮음'
    case 'MEDIUM': return '보통'
    case 'HIGH': return '높음'
    case 'URGENT': return '긴급'
    default: return '-'
  }
}

function getPriorityReasonText(value?: string | null) {
  if (!value) return '-'
  if (value === 'worsened and repeated anomaly') return '반복 이상이면서 악화된 대상입니다.'
  if (value === 'worsened tracking result') return '이전 점검보다 악화된 대상입니다.'
  if (value === 'repeated anomaly') return '반복적으로 나타난 이상입니다.'
  if (value === 'tracked anomaly') return '지속 추적 중인 이상입니다.'
  return value
}

function getDefectLabel(value: DefectType) {
  switch (value) {
    case 'CONTAMINATION': return '오염'
    case 'DUST': return '먼지'
    case 'LEAF': return '낙엽'
    case 'BIRD_DROPPING': return '조류 배설물'
    case 'SHADING': return '음영'
    case 'VEGETATION': return '식생'
    case 'APPEARANCE_DAMAGE': return '외관 손상'
    case 'HOTSPOT': return '핫스팟'
    case 'OVERHEATING': return '과열'
    case 'ABNORMAL_HEAT': return '이상 발열'
    case 'UNKNOWN': return '분류 필요'
  }
}
