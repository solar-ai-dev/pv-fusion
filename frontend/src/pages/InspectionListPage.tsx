import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspections } from '../features/inspections/hooks/useInspections'
import {
  INSPECTION_STATUS_OPTIONS,
  getCaptureMethodLabel,
  getInspectionStatusLabel,
  getInspectionStatusTone,
  type InspectionListParams,
  type InspectionStatus,
} from '../features/inspections/types'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { Pagination } from '../shared/components/table/Pagination'
import {
  formatDateTime,
  getApiErrorMessage,
  parsePositiveNumber,
} from '../shared/utils'

const DEFAULT_PAGE = 1
const DEFAULT_SIZE = 20

export function InspectionListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const statusParam = searchParams.get('inspectionStatus')
  const inspectionStatus = INSPECTION_STATUS_OPTIONS.includes(
    statusParam as InspectionStatus,
  )
    ? (statusParam as InspectionStatus)
    : undefined
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const page = Math.max(
    parsePositiveNumber(searchParams.get('page') ?? undefined) ?? DEFAULT_PAGE,
    DEFAULT_PAGE,
  )
  const size = Math.max(
    parsePositiveNumber(searchParams.get('size') ?? undefined) ?? DEFAULT_SIZE,
    1,
  )

  const inspectionParams = useMemo<InspectionListParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      inspectionStatus,
      from,
      to,
      page: page - 1,
      size,
    }),
    [from, inspectionStatus, page, plantId, size, to, zoneId],
  )

  const inspectionsQuery = useInspections(inspectionParams)
  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const filterZonesQuery = useZonesByPlantId(plantId ?? 0)

  if (inspectionsQuery.isError && !inspectionsQuery.data) {
    return (
      <section className="space-y-6">
        <PageHeader
          title="점검"
          description="등록된 점검을 확인하고 이미지 업로드와 분석 흐름을 이어서 진행하세요."
          actions={
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateModalOpen(true)}>
              새 점검 시작
            </button>
          }
        />
        <ErrorState
          title="점검 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(inspectionsQuery.error)}
        />
        <InspectionCreateWizard
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </section>
    )
  }

  const rows = inspectionsQuery.data?.data.content ?? []

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검"
        description="새 점검을 시작하거나 진행 중인 점검을 이어서 확인하세요."
        actions={
          <button className="btn btn-primary" type="button" onClick={() => setIsCreateModalOpen(true)}>
            새 점검 시작
          </button>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">조회 조건</h2>
            <p className="panel-description">
              기본 조건만 노출하고, 범위나 기간은 필요할 때만 조정할 수 있게 유지했습니다.
            </p>
          </div>
          <div className="inline-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setSearchParams(new URLSearchParams())}
            >
              초기화
            </button>
          </div>
        </div>
        <div className="filter-grid">
          <FormField label="발전소">
            <select
              className="input-field"
              value={plantId ? String(plantId) : ''}
              onChange={(event) => {
                const nextPlantId = event.target.value
                updateSearchParams({
                  plantId: nextPlantId,
                  zoneId: '',
                  page: String(DEFAULT_PAGE),
                })
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
          <FormField label="구역">
            <select
              className="input-field"
              value={zoneId ? String(zoneId) : ''}
              onChange={(event) =>
                updateSearchParams({
                  zoneId: event.target.value,
                  page: String(DEFAULT_PAGE),
                })
              }
              disabled={!plantId}
            >
              <option value="">{plantId ? '전체' : '발전소를 먼저 선택해 주세요.'}</option>
              {filterZonesQuery.data?.data.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>
                  {zone.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="상태">
            <select
              className="input-field"
              value={inspectionStatus ?? ''}
              onChange={(event) =>
                updateSearchParams({
                  inspectionStatus: event.target.value,
                  page: String(DEFAULT_PAGE),
                })
              }
            >
              <option value="">전체</option>
              {INSPECTION_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getInspectionStatusLabel(status)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="시작일">
            <input
              className="input-field"
              type="date"
              value={from ?? ''}
              onChange={(event) =>
                updateSearchParams({ from: event.target.value, page: String(DEFAULT_PAGE) })
              }
            />
          </FormField>
          <FormField label="종료일">
            <input
              className="input-field"
              type="date"
              value={to ?? ''}
              onChange={(event) =>
                updateSearchParams({ to: event.target.value, page: String(DEFAULT_PAGE) })
              }
            />
          </FormField>
          <FormField label="페이지 크기">
            <select
              className="input-field"
              value={String(size)}
              onChange={(event) =>
                updateSearchParams({
                  size: event.target.value,
                  page: String(DEFAULT_PAGE),
                })
              }
            >
              {[10, 20, 50].map((option) => (
                <option key={option} value={option}>
                  {option}개
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">점검 목록</h2>
            <p className="panel-description">
              진행 중인 점검을 이어가거나 완료된 점검의 촬영 시각과 상태를 빠르게 확인할 수 있습니다.
            </p>
          </div>
          {inspectionsQuery.isLoading ? (
            <span className="text-sm text-slate-500">점검 목록을 불러오는 중입니다.</span>
          ) : null}
        </div>

        {inspectionsQuery.isLoading && !inspectionsQuery.data ? (
          <LoadingState message="점검 목록을 불러오는 중입니다." />
        ) : null}

        {inspectionsQuery.data ? (
          rows.length > 0 ? (
            <>
              <DataTable
                columns={[
                  {
                    key: 'name',
                    header: '점검명',
                    render: (inspection) => (
                      <div className="stack-sm">
                        <Link
                          className="text-base font-semibold text-sky-700"
                          to={`/inspections/${inspection.inspectionId}`}
                        >
                          {inspection.name}
                        </Link>
                        <span className="text-sm text-slate-500">
                          {getCaptureMethodLabel(inspection.captureMethod)} 촬영
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: 'scope',
                    header: '연결 대상',
                    render: (inspection) => (
                      <div className="stack-sm text-sm text-slate-600">
                        <span>{inspection.plantId ? '발전소 연결됨' : '발전소 정보 없음'}</span>
                        <span>구역 연결됨</span>
                      </div>
                    ),
                  },
                  {
                    key: 'status',
                    header: '상태',
                    render: (inspection) => (
                      <StatusBadge
                        label={getInspectionStatusLabel(inspection.inspectionStatus)}
                        tone={getInspectionStatusTone(inspection.inspectionStatus)}
                      />
                    ),
                  },
                  {
                    key: 'capturedAt',
                    header: '촬영 시각',
                    render: (inspection) => formatDateTime(inspection.capturedAt),
                  },
                  {
                    key: 'createdAt',
                    header: '등록 시각',
                    render: (inspection) => formatDateTime(inspection.createdAt),
                  },
                  {
                    key: 'actions',
                    header: '이동',
                    render: (inspection) => (
                      <Link className="text-button" to={`/inspections/${inspection.inspectionId}`}>
                        점검 상세
                      </Link>
                    ),
                  },
                ]}
                rows={rows}
                rowKey={(inspection) => inspection.inspectionId}
              />
              <Pagination
                page={(inspectionsQuery.data.data.page ?? 0) + 1}
                totalPages={inspectionsQuery.data.data.totalPages}
                totalElements={inspectionsQuery.data.data.totalElements}
                onPageChange={(nextPage) =>
                  updateSearchParams({ page: String(Math.max(nextPage, DEFAULT_PAGE)) })
                }
              />
            </>
          ) : (
            <div className="state-card">
              <EmptyState
                title="아직 등록된 점검이 없습니다."
                description="상단의 새 점검 시작 버튼으로 촬영과 분석 흐름을 시작해 주세요."
              />
            </div>
          )
        ) : null}
      </section>

      <InspectionCreateWizard
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </section>
  )

  function updateSearchParams(nextValues: Record<string, string>) {
    const next = new URLSearchParams(searchParams)

    Object.entries(nextValues).forEach(([key, value]) => {
      if (value) {
        next.set(key, value)
      } else {
        next.delete(key)
      }
    })

    setSearchParams(next)
  }
}
