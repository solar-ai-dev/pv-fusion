import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useDeleteInspection, useInspectionDeleteImpact, useInspections } from '../features/inspections/hooks/useInspections'
import {
  getCaptureMethodLabel,
  getInspectionStatusLabel,
  getInspectionStatusTone,
  type InspectionListParams,
  type InspectionSummary,
} from '../features/inspections/types'
import { usePlants } from '../features/plants/hooks/usePlants'
import { useZonesByPlantId } from '../features/zones/hooks/useZones'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { DeleteImpactSummary } from '../shared/components/feedback/DeleteImpactSummary'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { Pagination } from '../shared/components/table/Pagination'
import { useToast } from '../shared/hooks/useToast'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

const DEFAULT_PAGE = 1
const DEFAULT_SIZE = 20
const VIEWS = [
  { id: 'all', label: '전체' },
  { id: 'in-progress', label: '진행 중' },
  { id: 'ready', label: '준비' },
  { id: 'completed', label: '완료' },
  { id: 'failed', label: '실패' },
] as const

type InspectionView = (typeof VIEWS)[number]['id']

export function InspectionListPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [inspectionToDelete, setInspectionToDelete] = useState<InspectionSummary | null>(null)

  const view = toInspectionView(searchParams.get('view'))
  const plantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined)
  const zoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined)
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const page = Math.max(parsePositiveNumber(searchParams.get('page') ?? undefined) ?? DEFAULT_PAGE, DEFAULT_PAGE)
  const size = Math.max(parsePositiveNumber(searchParams.get('size') ?? undefined) ?? DEFAULT_SIZE, 1)
  const selectedInspectionId = parsePositiveNumber(searchParams.get('selectedId') ?? undefined)

  const inspectionParams = useMemo<InspectionListParams>(
    () => ({
      plantId: plantId ?? undefined,
      zoneId: zoneId ?? undefined,
      inspectionStatus:
        view === 'ready'
          ? 'READY'
          : view === 'completed'
            ? 'COMPLETED'
            : view === 'failed'
              ? 'FAILED'
              : undefined,
      from,
      to,
      page: page - 1,
      size,
    }),
    [from, page, plantId, size, to, view, zoneId],
  )

  const inspectionsQuery = useInspections(inspectionParams)
  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const zonesQuery = useZonesByPlantId(plantId ?? 0)
  const deleteInspectionMutation = useDeleteInspection(inspectionToDelete?.inspectionId ?? 0)
  const inspectionDeleteImpactQuery = useInspectionDeleteImpact(
    inspectionToDelete?.inspectionId ?? 0,
    Boolean(inspectionToDelete),
  )

  const rows = inspectionsQuery.data?.data.content ?? []
  const displayedRows = rows.filter((row) => {
    if (view === 'in-progress') {
      return row.inspectionStatus === 'UPLOADING' || row.inspectionStatus === 'ANALYZING'
    }
    return true
  })
  const selectedInspection = displayedRows.find((row) => row.inspectionId === selectedInspectionId) ?? displayedRows[0] ?? null

  const handleDeleteInspection = async () => {
    if (!inspectionToDelete) {
      return
    }
    if (!inspectionDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러오지 못했습니다. 다시 시도해 주세요.')
      return
    }

    try {
      await deleteInspectionMutation.mutateAsync()
      toast.push('점검을 삭제했습니다.')
      setInspectionToDelete(null)
      navigate('/inspections')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 삭제에 실패했습니다.'))
    }
  }

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
        <div className="workspace-tabs">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              className={`workspace-tab ${view === item.id ? 'workspace-tab-active' : ''}`}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                if (item.id === 'all') next.delete('view')
                else next.set('view', item.id)
                next.delete('page')
                setSearchParams(next)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="filter-grid">
          <FormField label="발전소">
            <select
              className="input-field"
              value={plantId ? String(plantId) : ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('plantId', event.target.value)
                else next.delete('plantId')
                next.delete('zoneId')
                next.delete('page')
                setSearchParams(next)
              }}
            >
              <option value="">전체</option>
              {plantsQuery.data?.data.content.map((plant) => (
                <option key={plant.plantId} value={plant.plantId}>{plant.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="구역">
            <select
              className="input-field"
              disabled={!plantId}
              value={zoneId ? String(zoneId) : ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('zoneId', event.target.value)
                else next.delete('zoneId')
                next.delete('page')
                setSearchParams(next)
              }}
            >
              <option value="">{plantId ? '전체' : '발전소를 먼저 선택하세요.'}</option>
              {zonesQuery.data?.data.map((zone) => (
                <option key={zone.zoneId} value={zone.zoneId}>{zone.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="시작일">
            <input
              className="input-field"
              type="date"
              value={from ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('from', event.target.value)
                else next.delete('from')
                next.delete('page')
                setSearchParams(next)
              }}
            />
          </FormField>
          <FormField label="종료일">
            <input
              className="input-field"
              type="date"
              value={to ?? ''}
              onChange={(event) => {
                const next = new URLSearchParams(searchParams)
                if (event.target.value) next.set('to', event.target.value)
                else next.delete('to')
                next.delete('page')
                setSearchParams(next)
              }}
            />
          </FormField>
        </div>
      </section>

      {inspectionsQuery.isLoading && !inspectionsQuery.data ? <LoadingState message="점검 목록을 불러오는 중입니다." /> : null}
      {inspectionsQuery.isError ? <ErrorState title="점검 목록을 불러오지 못했습니다." description={getApiErrorMessage(inspectionsQuery.error)} /> : null}

      {inspectionsQuery.data ? (
        displayedRows.length > 0 ? (
          <section className="workspace-grid inspection-workspace-grid">
            <section className="panel workspace-sidebar stack-md">
              <div className="section-header">
                <div>
                  <h2 className="panel-title">점검 목록</h2>
                  <p className="panel-description">선택한 점검은 오른쪽 패널에서 바로 이어집니다.</p>
                </div>
              </div>
              <div className="workspace-nav-list">
                {displayedRows.map((inspection) => (
                  <button
                    key={inspection.inspectionId}
                    className={`workspace-nav-item ${selectedInspection?.inspectionId === inspection.inspectionId ? 'workspace-nav-item-active' : ''}`}
                    type="button"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams)
                      next.set('selectedId', String(inspection.inspectionId))
                      setSearchParams(next)
                    }}
                  >
                    <span className="workspace-nav-title">{inspection.name}</span>
                    <span className="workspace-nav-meta">
                      {getInspectionStatusLabel(inspection.inspectionStatus)} · {formatDateTime(inspection.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
              <Pagination
                page={(inspectionsQuery.data.data.page ?? 0) + 1}
                totalPages={inspectionsQuery.data.data.totalPages}
                totalElements={inspectionsQuery.data.data.totalElements}
                onPageChange={(nextPage) => {
                  const next = new URLSearchParams(searchParams)
                  next.set('page', String(nextPage))
                  setSearchParams(next)
                }}
              />
            </section>

            <section className="panel stack-md">
              {selectedInspection ? (
                <>
                  <div className="section-header">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge label={getInspectionStatusLabel(selectedInspection.inspectionStatus)} tone={getInspectionStatusTone(selectedInspection.inspectionStatus)} />
                      </div>
                      <h2 className="mt-3 text-xl font-semibold text-slate-950">{selectedInspection.name}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        촬영 방식 {getCaptureMethodLabel(selectedInspection.captureMethod)} · 등록 {formatDateTime(selectedInspection.createdAt)}
                      </p>
                    </div>
                    <div className="page-actions">
                      <Link className="btn btn-primary" to={`/inspections/${selectedInspection.inspectionId}`}>
                        작업 열기
                      </Link>
                    </div>
                  </div>
                  <div className="asset-summary-grid">
                    <InfoItem label="다음 작업" value={getNextActionLabel(selectedInspection)} />
                    <InfoItem label="발전소" value={selectedInspection.plantId ? `#${selectedInspection.plantId}` : '-'} />
                    <InfoItem label="구역" value={`#${selectedInspection.zoneId}`} />
                    <InfoItem label="촬영 시각" value={formatDateTime(selectedInspection.capturedAt)} />
                  </div>
                  <div className="management-panel">
                    <div>
                      <h3 className="panel-title">관리 작업</h3>
                      <p className="panel-description">삭제는 관리 작업에서만 진행합니다.</p>
                    </div>
                    <div className="management-actions management-actions-muted">
                      <button className="text-button text-button-danger muted-action" type="button" onClick={() => setInspectionToDelete(selectedInspection)}>
                        점검 삭제
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState title="선택한 점검이 없습니다." description="왼쪽 목록에서 점검을 선택하면 요약과 다음 작업이 표시됩니다." />
              )}
            </section>
          </section>
        ) : (
          <EmptyState
            title="조건에 맞는 점검이 없습니다."
            description="필터를 바꾸거나 새 점검을 시작하세요."
            action={<button className="btn btn-primary" type="button" onClick={() => setIsCreateModalOpen(true)}>새 점검 시작</button>}
          />
        )
      ) : null}

      <InspectionCreateWizard isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <ConfirmModal
        isOpen={Boolean(inspectionToDelete)}
        title="점검을 삭제할까요?"
        description="삭제 전 연결된 이미지와 결과 영향을 확인하세요."
        confirmText="삭제"
        tone="danger"
        onClose={() => setInspectionToDelete(null)}
        onConfirm={handleDeleteInspection}
        isConfirming={deleteInspectionMutation.isPending}
      >
        {inspectionDeleteImpactQuery.data?.data ? <DeleteImpactSummary impact={inspectionDeleteImpactQuery.data.data} /> : null}
      </ConfirmModal>
    </section>
  )
}

function getNextActionLabel(inspection: InspectionSummary) {
  switch (inspection.inspectionStatus) {
    case 'READY':
      return '이미지 업로드'
    case 'UPLOADING':
      return '업로드 이어가기'
    case 'ANALYZING':
      return '분석 상태 확인'
    case 'COMPLETED':
      return '결과 확인'
    case 'FAILED':
      return '재확인 또는 재요청'
  }
}

function toInspectionView(value: string | null): InspectionView {
  if (value === 'in-progress' || value === 'ready' || value === 'completed' || value === 'failed') {
    return value
  }

  return 'all'
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="asset-summary-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}
