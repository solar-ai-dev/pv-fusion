import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspections } from '../features/inspections/hooks/useInspections'
import {
  getCaptureMethodLabel,
  getInspectionStatusLabel,
  getInspectionStatusTone,
  INSPECTION_STATUS_OPTIONS,
  type InspectionListParams,
  type InspectionStatus,
} from '../features/inspections/types'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { Pagination } from '../shared/components/table/Pagination'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

function toInspectionStatus(value: string | null): InspectionStatus | undefined {
  if (
    value === 'READY' ||
    value === 'UPLOADING' ||
    value === 'ANALYZING' ||
    value === 'COMPLETED' ||
    value === 'FAILED'
  ) {
    return value
  }
  return undefined
}

export function InspectionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const from = searchParams.get('from') ?? undefined
  const to = searchParams.get('to') ?? undefined
  const inspectionStatus = toInspectionStatus(searchParams.get('status'))
  const page = Math.max(parsePositiveNumber(searchParams.get('page') ?? undefined) ?? 1, 1)

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(plantId ?? 0)

  const params = useMemo<InspectionListParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      inspectionStatus,
      from: from || undefined,
      to: to || undefined,
      page: page - 1,
      size: 20,
    }),
    [plantId, zoneId, inspectionStatus, from, to, page],
  )

  const inspectionsQuery = useInspections(params)
  const rows = inspectionsQuery.data?.data.content ?? []

  const plantMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const plant of plantsQuery.data?.data.content ?? []) {
      map.set(plant.plantId, plant.name)
    }
    return map
  }, [plantsQuery.data])

  const zoneMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const zone of zonesQuery.data?.data ?? []) {
      map.set(zone.zoneId, zone.name)
    }
    return map
  }, [zonesQuery.data])

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(key, value)
    } else {
      next.delete(key)
    }
    next.delete('page')
    setSearchParams(next)
  }

  const handleReset = () => {
    setSearchParams({})
  }

  const hasFilter = plantId || zoneId || inspectionStatus || from || to

  return (
    <section className="page-shell">
      <PageHeader
        title="점검"
        description="발전소·구역별 점검 목록을 조회하고 새 점검을 시작합니다."
        actions={
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setIsCreateOpen(true)}
          >
            새 점검 시작
          </button>
        }
      />

      {/* 필터 */}
      <section className="filter-section">
        <div className="filter-row">
          <div className="filter-field">
            <FormField label="발전소">
              <select
                className="input-field"
                value={plantId ? String(plantId) : ''}
                onChange={(e) => {
                  setParam('plantId', e.target.value || null)
                  setParam('zoneId', null)
                }}
              >
                <option value="">전체</option>
                {plantsQuery.data?.data.content.map((plant) => (
                  <option key={plant.plantId} value={plant.plantId}>
                    {plant.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="구역">
              <select
                className="input-field"
                disabled={!plantId}
                value={zoneId ? String(zoneId) : ''}
                onChange={(e) => setParam('zoneId', e.target.value || null)}
              >
                <option value="">{plantId ? '전체' : '발전소 먼저 선택'}</option>
                {zonesQuery.data?.data.map((zone) => (
                  <option key={zone.zoneId} value={zone.zoneId}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="상태">
              <select
                className="input-field"
                value={inspectionStatus ?? ''}
                onChange={(e) => setParam('status', e.target.value || null)}
              >
                <option value="">전체</option>
                {INSPECTION_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {getInspectionStatusLabel(s)}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="시작일">
              <input
                className="input-field"
                type="date"
                value={from ?? ''}
                onChange={(e) => setParam('from', e.target.value || null)}
              />
            </FormField>
          </div>
          <div className="filter-field">
            <FormField label="종료일">
              <input
                className="input-field"
                type="date"
                value={to ?? ''}
                onChange={(e) => setParam('to', e.target.value || null)}
              />
            </FormField>
          </div>
          {hasFilter ? (
            <div className="filter-actions">
              <button className="btn btn-secondary" type="button" onClick={handleReset}>
                초기화
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* 테이블 */}
      {inspectionsQuery.isLoading && !inspectionsQuery.data ? (
        <LoadingState message="점검 목록을 불러오는 중입니다." />
      ) : inspectionsQuery.isError ? (
        <ErrorState
          title="점검 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(inspectionsQuery.error)}
        />
      ) : (
        <section className="table-panel">
          <div className="table-panel-header">
            <span className="table-panel-title">점검 목록</span>
            <span className="table-panel-count">
              총 {inspectionsQuery.data?.data.totalElements ?? 0}건
            </span>
          </div>
          <DataTable
            rows={rows}
            rowKey={(row) => row.inspectionId}
            emptyTitle="조건에 맞는 점검이 없습니다."
            emptyDescription="필터를 바꾸거나 새 점검을 시작하세요."
            columns={[
              {
                key: 'name',
                header: '점검명 / ID',
                render: (row) => (
                  <div>
                    <div className="font-semibold text-slate-900 leading-tight">{row.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">#{row.inspectionId}</div>
                  </div>
                ),
              },
              {
                key: 'plant',
                header: '발전소 / 구역',
                render: (row) => (
                  <div>
                    <div className="text-sm text-slate-700 leading-tight">
                      {row.plantId ? (plantMap.get(row.plantId) ?? `#${row.plantId}`) : '-'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {zoneMap.get(row.zoneId) ?? `구역 #${row.zoneId}`}
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: '점검 상태',
                render: (row) => (
                  <StatusBadge
                    label={getInspectionStatusLabel(row.inspectionStatus)}
                    tone={getInspectionStatusTone(row.inspectionStatus)}
                  />
                ),
              },
              {
                key: 'method',
                header: '촬영 방식',
                render: (row) => (
                  <span className="text-slate-600 text-sm">{getCaptureMethodLabel(row.captureMethod)}</span>
                ),
              },
              {
                key: 'capturedAt',
                header: '촬영 시각',
                render: (row) => (
                  <span className="text-slate-500 text-xs whitespace-nowrap">
                    {row.capturedAt ? formatDateTime(row.capturedAt) : '-'}
                  </span>
                ),
              },
              {
                key: 'createdAt',
                header: '생성일',
                render: (row) => (
                  <span className="text-slate-500 text-xs whitespace-nowrap">
                    {formatDateTime(row.createdAt)}
                  </span>
                ),
              },
              {
                key: 'analysisNote',
                header: '분석·결과',
                render: (row) => (
                  <Link
                    to={`/inspections/${row.inspectionId}#image-upload-section`}
                    className="text-xs text-slate-400 whitespace-nowrap hover:text-slate-600"
                    title="분석 상태와 결과는 점검 상세에서 확인하세요."
                  >
                    상세에서 확인
                  </Link>
                ),
              },
              {
                key: 'action',
                header: '',
                render: (row) => (
                  <Link
                    to={`/inspections/${row.inspectionId}`}
                    className="text-button text-sm whitespace-nowrap"
                  >
                    상세 보기
                  </Link>
                ),
              },
            ]}
          />
          <div className="p-3">
            <Pagination
              page={page}
              totalPages={inspectionsQuery.data?.data.totalPages ?? 0}
              totalElements={inspectionsQuery.data?.data.totalElements ?? 0}
              onPageChange={(nextPage) => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(nextPage))
                setSearchParams(next)
              }}
            />
          </div>
        </section>
      )}


      <InspectionCreateWizard
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        initialPlantId={plantId ?? null}
        initialZoneId={zoneId ?? null}
      />
    </section>
  )
}
