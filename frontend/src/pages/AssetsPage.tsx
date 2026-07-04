import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import {
  useCreatePlant,
  useDeactivatePlant,
  useDeletePlant,
  usePlant,
  usePlantDeleteImpact,
  usePlants,
  useUpdatePlant,
} from '../features/plants/hooks/usePlants'
import {
  getResourceStatusLabel,
  type CreatePlantRequest,
  type UpdatePlantRequest,
} from '../features/plants/types'
import {
  useCreateZone,
  useDeactivateZone,
  useDeleteZone,
  useZone,
  useZoneDeleteImpact,
  useZonesByPlantId,
  useUpdateZone,
} from '../features/zones/hooks/useZones'
import {
  getPriorityLabel,
  type CreateZoneRequest,
  type UpdateZoneRequest,
  type ZoneSummary,
} from '../features/zones/types'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { DeleteImpactSummary } from '../shared/components/feedback/DeleteImpactSummary'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import { formatDateTime, getApiErrorMessage, parsePositiveNumber } from '../shared/utils'

const plantFormSchema = z.object({
  name: z.string().trim().min(1, '발전소 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, '구역 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

type PlantFormValues = z.infer<typeof plantFormSchema>
type ZoneFormValues = z.infer<typeof zoneFormSchema>

type AssetsPageProps = {
  forcedPlantId?: number | null
  forcedZoneId?: number | null
}

export function AssetsPage({ forcedPlantId, forcedZoneId }: AssetsPageProps) {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreatePlantOpen, setIsCreatePlantOpen] = useState(false)
  const [isEditPlantOpen, setIsEditPlantOpen] = useState(false)
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false)
  const [isEditZoneOpen, setIsEditZoneOpen] = useState(false)
  const [isDeactivatePlantOpen, setIsDeactivatePlantOpen] = useState(false)
  const [isDeletePlantOpen, setIsDeletePlantOpen] = useState(false)
  const [zoneToDeactivate, setZoneToDeactivate] = useState<ZoneSummary | null>(null)
  const [zoneToDelete, setZoneToDelete] = useState<ZoneSummary | null>(null)
  const [isInspectionWizardOpen, setIsInspectionWizardOpen] = useState(false)

  const queryPlantId = parsePositiveNumber(searchParams.get('plantId') ?? undefined) ?? null
  const queryZoneId = parsePositiveNumber(searchParams.get('zoneId') ?? undefined) ?? null
  const forcedZoneQuery = useZone(forcedZoneId ?? 0)
  const selectedZoneId = forcedZoneId ?? queryZoneId
  const selectedPlantId = forcedPlantId ?? queryPlantId ?? forcedZoneQuery.data?.data.plantId ?? null

  const plantsQuery = usePlants({ page: 0, size: 100, status: 'ACTIVE' })
  const selectedPlantQuery = usePlant(selectedPlantId ?? 0)
  const zonesQuery = useZonesByPlantId(selectedPlantId ?? 0)
  const selectedZoneQuery = useZone(selectedZoneId ?? 0)

  const createPlantMutation = useCreatePlant()
  const updatePlantMutation = useUpdatePlant(selectedPlantId ?? 0)
  const deactivatePlantMutation = useDeactivatePlant(selectedPlantId ?? 0)
  const deletePlantMutation = useDeletePlant(selectedPlantId ?? 0)
  const plantDeleteImpactQuery = usePlantDeleteImpact(selectedPlantId ?? 0, isDeletePlantOpen)

  const createZoneMutation = useCreateZone(selectedPlantId ?? 0)
  const updateZoneMutation = useUpdateZone(selectedZoneId ?? 0)
  const deactivateZoneMutation = useDeactivateZone(zoneToDeactivate?.zoneId ?? 0)
  const deleteZoneMutation = useDeleteZone(zoneToDelete?.zoneId ?? 0)
  const zoneDeleteImpactQuery = useZoneDeleteImpact(zoneToDelete?.zoneId ?? 0, Boolean(zoneToDelete))

  const plantForm = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      name: '',
      location: '',
      description: '',
    },
  })
  const zoneForm = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: '',
      location: '',
      description: '',
    },
  })

  const plants = useMemo(() => plantsQuery.data?.data.content ?? [], [plantsQuery.data])
  const selectedPlant = selectedPlantQuery.data?.data ?? null
  const zones = useMemo(() => zonesQuery.data?.data ?? [], [zonesQuery.data])
  const selectedZone = selectedZoneQuery.data?.data ?? null
  const selectedZoneSummary =
    zones.find((zone) => zone.zoneId === selectedZoneId) ??
    (selectedZone
      ? {
          zoneId: selectedZone.zoneId,
          plantId: selectedZone.plantId,
          name: selectedZone.name,
          arrayCount: selectedZone.arrayCount,
          panelCount: selectedZone.panelCount,
          latestInspectionAt: selectedZone.latestInspectionAt,
          anomalyCandidateCount: selectedZone.anomalyCandidateCount,
          topActionCandidate: selectedZone.topActionCandidate,
          priorityLevel: selectedZone.priorityLevel,
        }
      : null)

  useEffect(() => {
    if (forcedPlantId || forcedZoneId) {
      return
    }
    if (!queryPlantId && plants.length === 1) {
      const next = new URLSearchParams(searchParams)
      next.set('plantId', String(plants[0].plantId))
      setSearchParams(next, { replace: true })
    }
  }, [forcedPlantId, forcedZoneId, plants, queryPlantId, searchParams, setSearchParams])

  useEffect(() => {
    if (!isEditPlantOpen || !selectedPlant) {
      return
    }
    plantForm.reset({
      name: selectedPlant.name,
      location: selectedPlant.location ?? '',
      description: selectedPlant.description ?? '',
    })
  }, [isEditPlantOpen, plantForm, selectedPlant])

  useEffect(() => {
    if (!isEditZoneOpen || !selectedZone) {
      return
    }
    zoneForm.reset({
      name: selectedZone.name,
      location: selectedZone.location ?? '',
      description: selectedZone.description ?? '',
    })
  }, [isEditZoneOpen, selectedZone, zoneForm])

  const applySelection = (nextPlantId?: number | null, nextZoneId?: number | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextPlantId) {
      next.set('plantId', String(nextPlantId))
    } else {
      next.delete('plantId')
    }
    if (nextZoneId) {
      next.set('zoneId', String(nextZoneId))
    } else {
      next.delete('zoneId')
    }
    setSearchParams(next)
  }

  const handleCreatePlant = plantForm.handleSubmit(async (values) => {
    const payload: CreatePlantRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      const response = await createPlantMutation.mutateAsync(payload)
      toast.push('발전소가 등록되었습니다.')
      setIsCreatePlantOpen(false)
      plantForm.reset()
      applySelection(response.data.plantId, null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 등록에 실패했습니다.'))
    }
  })

  const handleUpdatePlant = plantForm.handleSubmit(async (values) => {
    const payload: UpdatePlantRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      await updatePlantMutation.mutateAsync(payload)
      toast.push('변경사항이 저장되었습니다.')
      setIsEditPlantOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 수정에 실패했습니다.'))
    }
  })

  const handleCreateZone = zoneForm.handleSubmit(async (values) => {
    const payload: CreateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      const response = await createZoneMutation.mutateAsync(payload)
      toast.push('구역이 등록되었습니다.')
      setIsCreateZoneOpen(false)
      zoneForm.reset()
      applySelection(selectedPlantId, response.data.zoneId)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 등록에 실패했습니다.'))
    }
  })

  const handleUpdateZone = zoneForm.handleSubmit(async (values) => {
    const payload: UpdateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      await updateZoneMutation.mutateAsync(payload)
      toast.push('구역 정보가 저장되었습니다.')
      setIsEditZoneOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 수정에 실패했습니다.'))
    }
  })

  const handleDeactivatePlant = async () => {
    try {
      await deactivatePlantMutation.mutateAsync()
      toast.push('비활성화되었습니다.')
      setIsDeactivatePlantOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 비활성화에 실패했습니다.'))
    }
  }

  const handleDeletePlant = async () => {
    if (!plantDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러오지 못했습니다. 다시 시도해 주세요.')
      return
    }

    try {
      await deletePlantMutation.mutateAsync()
      toast.push('발전소를 삭제했습니다.')
      setIsDeletePlantOpen(false)
      applySelection(null, null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 삭제에 실패했습니다.'))
    }
  }

  const handleDeactivateZone = async () => {
    if (!zoneToDeactivate) {
      return
    }

    try {
      await deactivateZoneMutation.mutateAsync()
      toast.push('구역이 비활성화되었습니다.')
      setZoneToDeactivate(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 비활성화에 실패했습니다.'))
    }
  }

  const handleDeleteZone = async () => {
    if (!zoneToDelete) {
      return
    }
    if (!zoneDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러오지 못했습니다. 다시 시도해 주세요.')
      return
    }

    try {
      await deleteZoneMutation.mutateAsync()
      toast.push('구역을 삭제했습니다.')
      setZoneToDelete(null)
      applySelection(selectedPlantId, null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 삭제에 실패했습니다.'))
    }
  }

  const selectedPanel = selectedZone ? (
    <section className="panel stack-md">
      <div className="section-header">
        <div>
          <h2 className="panel-title">{selectedZone.name}</h2>
          <p className="panel-description">{selectedZone.location || '위치 정보가 없습니다.'}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" type="button" onClick={() => setIsInspectionWizardOpen(true)}>
            이 구역 점검 시작
          </button>
          <Link className="text-button" to={`/zones/${selectedZone.zoneId}`}>
            상세 보기
          </Link>
        </div>
      </div>
      <div className="asset-summary-grid">
        <AssetSummaryItem label="발전소" value={selectedPlant?.name ?? '-'} />
        <AssetSummaryItem label="상태" value={getResourceStatusLabel(selectedZone.status)} />
        <AssetSummaryItem label="최근 점검" value={formatDateTime(selectedZone.latestInspectionAt)} />
        <AssetSummaryItem label="이상 후보" value={`${selectedZone.anomalyCandidateCount}건`} />
        <AssetSummaryItem label="우선순위" value={getPriorityLabel(selectedZone.priorityLevel)} />
        <AssetSummaryItem label="설비 위치" value={`어레이 ${selectedZone.arrayCount} · 패널 ${selectedZone.panelCount}`} />
      </div>
      <section className="management-panel">
        <div>
          <h3 className="panel-title">구역 관리</h3>
          <p className="panel-description">수정, 비활성화, 삭제는 관리 작업에서 진행합니다.</p>
        </div>
        <div className="management-actions management-actions-muted">
          <button className="text-button" type="button" onClick={() => setIsEditZoneOpen(true)}>
            구역 수정
          </button>
          <button className="text-button muted-action" type="button" onClick={() => setZoneToDeactivate(selectedZoneSummary)}>
            구역 비활성화
          </button>
          <button className="text-button text-button-danger muted-action" type="button" onClick={() => setZoneToDelete(selectedZoneSummary)}>
            구역 삭제
          </button>
        </div>
      </section>
    </section>
  ) : selectedPlant ? (
    <section className="panel stack-md">
      <div className="section-header">
        <div>
          <h2 className="panel-title">{selectedPlant.name}</h2>
          <p className="panel-description">{selectedPlant.location || '위치 정보가 없습니다.'}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" type="button" onClick={() => setIsCreateZoneOpen(true)}>
            구역 등록
          </button>
        </div>
      </div>
      <div className="asset-summary-grid">
        <AssetSummaryItem label="상태" value={getResourceStatusLabel(selectedPlant.status)} />
        <AssetSummaryItem label="구역 수" value={`${selectedPlant.zoneCount}개`} />
        <AssetSummaryItem label="최근 점검" value={formatDateTime(selectedPlant.latestInspectionAt)} />
        <AssetSummaryItem label="설명" value={selectedPlant.description || '-'} />
      </div>
      {zones.length > 0 ? (
        <div className="stack-md">
          <div className="compact-empty">
            <div className="text-base font-semibold text-slate-900">구역을 선택해 점검을 시작하세요.</div>
            <p className="mt-2 text-sm text-slate-600">선택한 구역은 오른쪽 패널에서 바로 이어집니다.</p>
          </div>
          <div className="asset-card-list">
            {zones.map((zone) => (
              <article key={zone.zoneId} className={`asset-card ${zone.zoneId === selectedZoneId ? 'asset-card-active' : ''}`}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {zone.priorityLevel ? <StatusBadge label={getPriorityLabel(zone.priorityLevel)} tone="warning" /> : null}
                    {zone.anomalyCandidateCount > 0 ? <StatusBadge label={`이상 ${zone.anomalyCandidateCount}건`} tone="warning" /> : null}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-950">{zone.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    최근 점검 {formatDateTime(zone.latestInspectionAt)} · 어레이 {zone.arrayCount} · 패널 {zone.panelCount}
                  </p>
                </div>
                <div className="asset-card-actions">
                  <button className="btn btn-primary" type="button" onClick={() => applySelection(selectedPlant.plantId, zone.zoneId)}>
                    이 구역 선택
                  </button>
                  <button className="text-button" type="button" onClick={() => applySelection(selectedPlant.plantId, zone.zoneId)}>
                    상세 보기
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title="점검을 시작할 구역이 없습니다."
          description="점검은 구역 단위로 진행됩니다. 먼저 이 발전소에 구역을 등록하세요."
          action={
            <button className="btn btn-primary" type="button" onClick={() => setIsCreateZoneOpen(true)}>
              구역 등록
            </button>
          }
        />
      )}
      <section className="management-panel">
        <div>
          <h3 className="panel-title">발전소 관리</h3>
          <p className="panel-description">수정, 비활성화, 삭제는 관리 작업에서 진행합니다.</p>
        </div>
        <div className="management-actions management-actions-muted">
          <button className="text-button" type="button" onClick={() => setIsEditPlantOpen(true)}>
            발전소 수정
          </button>
          <button className="text-button muted-action" type="button" onClick={() => setIsDeactivatePlantOpen(true)}>
            발전소 비활성화
          </button>
          <button className="text-button text-button-danger muted-action" type="button" onClick={() => setIsDeletePlantOpen(true)}>
            발전소 삭제
          </button>
        </div>
      </section>
    </section>
  ) : (
    <EmptyState
      title="발전소를 선택하세요."
      description="왼쪽에서 발전소를 선택하면 등록된 구역과 최근 상태를 확인할 수 있습니다."
    />
  )

  return (
    <section className="space-y-6">
      <PageHeader
      title="발전소"
      description="발전소와 구역을 관리하고, 구역을 선택해 점검을 시작합니다."
        actions={
          <div className="page-actions">
            {selectedZone ? (
              <button className="btn btn-primary" type="button" onClick={() => setIsInspectionWizardOpen(true)}>
                이 구역 점검 시작
              </button>
            ) : null}
            <button className="btn btn-secondary" type="button" onClick={() => setIsCreatePlantOpen(true)}>
              발전소 등록
            </button>
          </div>
        }
      />

      {plantsQuery.isLoading && plants.length === 0 ? <LoadingState message="발전소 목록을 불러오는 중입니다." /> : null}
      {plantsQuery.isError ? (
        <ErrorState
          title="발전소 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(plantsQuery.error)}
        />
      ) : null}

      {!plantsQuery.isLoading && plants.length === 0 ? (
        <EmptyState
          title="등록된 발전소가 없습니다."
          description="발전소를 등록하면 구역과 점검 흐름을 이어서 관리할 수 있습니다."
          action={
            <button className="btn btn-primary" type="button" onClick={() => setIsCreatePlantOpen(true)}>
              발전소 등록
            </button>
          }
        />
      ) : null}

      {plants.length > 0 ? (
        <section className="workspace-grid assets-workspace-grid">
          <aside className="panel workspace-sidebar stack-md">
            <div className="section-header">
              <div>
                <h2 className="panel-title">발전소</h2>
                <p className="panel-description">발전소를 선택하면 등록된 구역을 볼 수 있습니다.</p>
              </div>
            </div>
            <div className="workspace-nav-list">
              {plants.map((plant) => (
                <button
                  key={plant.plantId}
                  className={`workspace-nav-item ${plant.plantId === selectedPlantId ? 'workspace-nav-item-active' : ''}`}
                  type="button"
                  onClick={() => applySelection(plant.plantId, null)}
                >
                  <span className="workspace-nav-title">{plant.name}</span>
                  <span className="workspace-nav-meta">
                    {getResourceStatusLabel(plant.status)} · 구역 {plant.zoneCount}개
                  </span>
                </button>
              ))}
            </div>

            {selectedPlantId ? (
              <div className="stack-sm">
                <div className="section-header">
                  <div>
                    <h3 className="panel-title">구역</h3>
                    <p className="panel-description">점검은 구역 단위로 시작합니다.</p>
                  </div>
                  <button className="text-button" type="button" onClick={() => setIsCreateZoneOpen(true)}>
                    구역 등록
                  </button>
                </div>
                {zones.length > 0 ? (
                  <div className="workspace-nav-list">
                    {zones.map((zone) => (
                      <button
                        key={zone.zoneId}
                        className={`workspace-nav-item ${zone.zoneId === selectedZoneId ? 'workspace-nav-item-active' : ''}`}
                        type="button"
                        onClick={() => applySelection(selectedPlantId, zone.zoneId)}
                      >
                        <span className="workspace-nav-title">{zone.name}</span>
                        <span className="workspace-nav-meta">
                          이상 {zone.anomalyCandidateCount}건 · 최근 점검 {formatDateTime(zone.latestInspectionAt)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="등록된 구역이 없습니다."
                    description="점검을 시작하려면 먼저 이 발전소에 구역을 등록해야 합니다."
                    action={
                      <button className="btn btn-secondary" type="button" onClick={() => setIsCreateZoneOpen(true)}>
                        구역 등록
                      </button>
                    }
                  />
                )}
              </div>
            ) : null}
          </aside>

          <div className="stack-md">
            {selectedPanel}
          </div>
        </section>
      ) : null}

      <InspectionCreateWizard
        isOpen={isInspectionWizardOpen}
        onClose={() => setIsInspectionWizardOpen(false)}
        initialPlantId={selectedPlantId}
        initialZoneId={selectedZoneId}
      />

      <AssetFormModal
        description="발전소 기본 정보를 입력해 주세요."
        isOpen={isCreatePlantOpen}
        title="발전소 등록"
        onClose={() => setIsCreatePlantOpen(false)}
        onSubmit={handleCreatePlant}
        submitLabel="등록"
      >
        <PlantFields form={plantForm} />
      </AssetFormModal>

      <AssetFormModal
        description="발전소 정보를 수정합니다."
        isOpen={isEditPlantOpen}
        title="발전소 수정"
        onClose={() => setIsEditPlantOpen(false)}
        onSubmit={handleUpdatePlant}
        submitLabel="저장"
      >
        <PlantFields form={plantForm} />
      </AssetFormModal>

      <AssetFormModal
        description="선택한 발전소에 구역을 추가합니다."
        isOpen={isCreateZoneOpen}
        title="구역 등록"
        onClose={() => setIsCreateZoneOpen(false)}
        onSubmit={handleCreateZone}
        submitLabel="등록"
      >
        <ZoneFields form={zoneForm} />
      </AssetFormModal>

      <AssetFormModal
        description="구역 정보를 수정합니다."
        isOpen={isEditZoneOpen}
        title="구역 수정"
        onClose={() => setIsEditZoneOpen(false)}
        onSubmit={handleUpdateZone}
        submitLabel="저장"
      >
        <ZoneFields form={zoneForm} />
      </AssetFormModal>

      <ConfirmModal
        isOpen={isDeactivatePlantOpen}
        title="발전소를 비활성화할까요?"
        description="비활성화하면 관련 점검 진입과 운영 흐름에서 제외됩니다."
        confirmText="비활성화"
        tone="danger"
        onClose={() => setIsDeactivatePlantOpen(false)}
        onConfirm={handleDeactivatePlant}
        isConfirming={deactivatePlantMutation.isPending}
      />
      <ConfirmModal
        isOpen={Boolean(zoneToDeactivate)}
        title="구역을 비활성화할까요?"
        description="비활성화하면 새 점검 시작 전에 이 구역을 다시 확인해야 합니다."
        confirmText="비활성화"
        tone="danger"
        onClose={() => setZoneToDeactivate(null)}
        onConfirm={handleDeactivateZone}
        isConfirming={deactivateZoneMutation.isPending}
      />
      <ConfirmModal
        isOpen={isDeletePlantOpen}
        title="발전소를 삭제할까요?"
        description="삭제 전 연결된 구역, 점검, 이미지, 분석 결과 영향을 확인하세요."
        confirmText="삭제"
        tone="danger"
        onClose={() => setIsDeletePlantOpen(false)}
        onConfirm={handleDeletePlant}
        isConfirming={deletePlantMutation.isPending}
      >
        {plantDeleteImpactQuery.data?.data ? <DeleteImpactSummary impact={plantDeleteImpactQuery.data.data} /> : null}
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(zoneToDelete)}
        title="구역을 삭제할까요?"
        description="삭제 전 연결된 점검, 이미지, 결과 영향을 확인하세요."
        confirmText="삭제"
        tone="danger"
        onClose={() => setZoneToDelete(null)}
        onConfirm={handleDeleteZone}
        isConfirming={deleteZoneMutation.isPending}
      >
        {zoneDeleteImpactQuery.data?.data ? <DeleteImpactSummary impact={zoneDeleteImpactQuery.data.data} /> : null}
      </ConfirmModal>
    </section>
  )
}

function AssetFormModal({
  children,
  description,
  isOpen,
  onClose,
  onSubmit,
  submitLabel,
  title,
}: {
  children: ReactNode
  description: string
  isOpen: boolean
  onClose: () => void
  onSubmit: React.FormEventHandler<HTMLFormElement>
  submitLabel: string
  title: string
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="stack-sm">
          <h2 className="panel-title">{title}</h2>
          <p className="panel-description">{description}</p>
        </div>
        <form className="stack-md mt-5" onSubmit={onSubmit}>
          {children}
          <div className="wizard-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose}>
              취소
            </button>
            <button className="btn btn-primary" type="submit">
              {submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function PlantFields({ form }: { form: ReturnType<typeof useForm<PlantFormValues>> }) {
  return (
    <>
      <FormField label="발전소 이름" error={form.formState.errors.name?.message}>
        <input className="input-field" {...form.register('name')} />
      </FormField>
      <FormField label="위치">
        <input className="input-field" {...form.register('location')} />
      </FormField>
      <FormField label="설명">
        <textarea className="input-field min-h-28" {...form.register('description')} />
      </FormField>
    </>
  )
}

function ZoneFields({ form }: { form: ReturnType<typeof useForm<ZoneFormValues>> }) {
  return (
    <>
      <FormField label="구역 이름" error={form.formState.errors.name?.message}>
        <input className="input-field" {...form.register('name')} />
      </FormField>
      <FormField label="위치">
        <input className="input-field" {...form.register('location')} />
      </FormField>
      <FormField label="설명">
        <textarea className="input-field min-h-28" {...form.register('description')} />
      </FormField>
    </>
  )
}

function AssetSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="asset-summary-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}
