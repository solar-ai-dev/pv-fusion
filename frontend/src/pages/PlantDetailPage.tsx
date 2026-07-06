import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspections } from '../features/inspections/hooks/useInspections'
import { getInspectionStatusLabel, getInspectionStatusTone } from '../features/inspections/types'
import {
  useDeactivatePlant,
  useDeletePlant,
  usePlant,
  usePlantDeleteImpact,
  useUpdatePlant,
} from '../features/plants/hooks/usePlants'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
  type UpdatePlantRequest,
} from '../features/plants/types'
import {
  useCreateZone,
  useDeactivateZone,
  useDeleteZone,
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

export function PlantDetailPage() {
  const { plantId: plantIdParam } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const plantId = parsePositiveNumber(plantIdParam) ?? 0

  const [isEditPlantOpen, setIsEditPlantOpen] = useState(false)
  const [isDeactivatePlantOpen, setIsDeactivatePlantOpen] = useState(false)
  const [isDeletePlantOpen, setIsDeletePlantOpen] = useState(false)
  const [isCreateZoneOpen, setIsCreateZoneOpen] = useState(false)
  const [isInspectionWizardOpen, setIsInspectionWizardOpen] = useState(false)
  const [zoneToEdit, setZoneToEdit] = useState<ZoneSummary | null>(null)
  const [zoneToDeactivate, setZoneToDeactivate] = useState<ZoneSummary | null>(null)
  const [zoneToDelete, setZoneToDelete] = useState<ZoneSummary | null>(null)
  const [wizardInitialZoneId, setWizardInitialZoneId] = useState<number | null>(null)
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false)

  const plantQuery = usePlant(plantId)
  const zonesQuery = useZonesByPlantId(plantId)
  const inspectionsQuery = useInspections(
    { plantId: plantId || undefined, page: 0, size: 5 },
    plantId > 0,
  )
  const plantDeleteImpactQuery = usePlantDeleteImpact(plantId, isDeletePlantOpen)

  const updatePlantMutation = useUpdatePlant(plantId)
  const deactivatePlantMutation = useDeactivatePlant(plantId)
  const deletePlantMutation = useDeletePlant(plantId)
  const createZoneMutation = useCreateZone(plantId)
  const updateZoneMutation = useUpdateZone(zoneToEdit?.zoneId ?? 0)
  const deactivateZoneMutation = useDeactivateZone(zoneToDeactivate?.zoneId ?? 0)
  const deleteZoneMutation = useDeleteZone(zoneToDelete?.zoneId ?? 0)
  const zoneDeleteImpactQuery = useZoneDeleteImpact(
    zoneToDelete?.zoneId ?? 0,
    Boolean(zoneToDelete),
  )

  const plant = plantQuery.data?.data ?? null
  const zones = zonesQuery.data?.data ?? []
  const inspections = inspectionsQuery.data?.data.content ?? []

  const plantForm = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: { name: '', location: '', description: '' },
  })
  const zoneForm = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: { name: '', location: '', description: '' },
  })

  useEffect(() => {
    if (isEditPlantOpen && plant) {
      plantForm.reset({
        name: plant.name,
        location: plant.location ?? '',
        description: plant.description ?? '',
      })
    }
  }, [isEditPlantOpen, plant, plantForm])

  useEffect(() => {
    if (zoneToEdit) {
      zoneForm.reset({
        name: zoneToEdit.name,
        location: '',
        description: '',
      })
    }
  }, [zoneToEdit, zoneForm])

  if (!plantId) {
    return (
      <ErrorState title="올바르지 않은 발전소 정보입니다." description="주소를 다시 확인해 주세요." />
    )
  }

  if (plantQuery.isLoading) {
    return <LoadingState message="발전소 정보를 불러오는 중입니다." />
  }

  if (plantQuery.isError || !plant) {
    return (
      <ErrorState
        title="발전소 정보를 불러오지 못했습니다."
        description={getApiErrorMessage(plantQuery.error)}
      />
    )
  }

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

  const handleDeactivatePlant = async () => {
    try {
      await deactivatePlantMutation.mutateAsync()
      toast.push('발전소가 비활성화되었습니다.')
      setIsDeactivatePlantOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 비활성화에 실패했습니다.'))
    }
  }

  const handleDeletePlant = async () => {
    if (!plantDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러오지 못했습니다.')
      return
    }
    try {
      await deletePlantMutation.mutateAsync()
      toast.push('발전소가 삭제되었습니다.')
      navigate('/plants')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 삭제에 실패했습니다.'))
    }
  }

  const handleCreateZone = zoneForm.handleSubmit(async (values) => {
    const payload: CreateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }
    try {
      await createZoneMutation.mutateAsync(payload)
      toast.push('구역이 등록되었습니다.')
      setIsCreateZoneOpen(false)
      zoneForm.reset()
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 등록에 실패했습니다.'))
    }
  })

  const handleUpdateZone = zoneForm.handleSubmit(async (values) => {
    if (!zoneToEdit) return
    const payload: UpdateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }
    try {
      await updateZoneMutation.mutateAsync(payload)
      toast.push('구역 정보가 저장되었습니다.')
      setZoneToEdit(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 수정에 실패했습니다.'))
    }
  })

  const handleDeactivateZone = async () => {
    if (!zoneToDeactivate) return
    try {
      await deactivateZoneMutation.mutateAsync()
      toast.push('구역이 비활성화되었습니다.')
      setZoneToDeactivate(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 비활성화에 실패했습니다.'))
    }
  }

  const handleDeleteZone = async () => {
    if (!zoneToDelete || !zoneDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러오지 못했습니다.')
      return
    }
    try {
      await deleteZoneMutation.mutateAsync()
      toast.push('구역이 삭제되었습니다.')
      setZoneToDelete(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 삭제에 실패했습니다.'))
    }
  }

  return (
    <section className="page-shell">
      <PageHeader
        title={plant.name}
        description={plant.location || '위치 정보가 없습니다.'}
        actions={
          <div className="page-actions">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsEditPlantOpen(true)}
            >
              발전소 수정
            </button>
            <Link className="btn btn-secondary" to="/plants">
              목록
            </Link>
          </div>
        }
      />

      {/* 요약 */}
      <section className="panel">
        <div className="detail-summary-grid">
          <div className="detail-summary-item">
            <span className="detail-summary-label">상태</span>
            <span className="detail-summary-value">
              <StatusBadge
                label={getResourceStatusLabel(plant.status)}
                tone={getResourceStatusTone(plant.status)}
              />
            </span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">구역 수</span>
            <span className="detail-summary-value">{plant.zoneCount}개</span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">최근 점검</span>
            <span className="detail-summary-value">{formatDateTime(plant.latestInspectionAt)}</span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">설명</span>
            <span className="detail-summary-value text-sm text-slate-600">
              {plant.description || '-'}
            </span>
          </div>
        </div>
      </section>

      {/* 구역 목록 */}
      <section className="panel stack-md">
        <div className="section-header">
          <div>
            <h2 className="section-title">구역 목록</h2>
            <p className="section-description">이 발전소에 등록된 구역입니다.</p>
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setIsCreateZoneOpen(true)}
          >
            구역 등록
          </button>
        </div>
        {zonesQuery.isLoading ? (
          <LoadingState message="구역 목록을 불러오는 중입니다." />
        ) : zones.length === 0 ? (
          <EmptyState
            title="등록된 구역이 없습니다."
            description="점검은 구역 단위로 진행됩니다. 먼저 구역을 등록하세요."
            action={
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setIsCreateZoneOpen(true)}
              >
                구역 등록
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="plants-compact-table">
              <thead>
                <tr>
                  <th>구역명</th>
                  <th>이상 후보</th>
                  <th>우선순위</th>
                  <th>최근 점검</th>
                  <th>어레이·패널</th>
                  <th>바로가기</th>
                  <th>점검</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.zoneId}>
                    <td>
                      <Link
                        to={`/zones/${zone.zoneId}`}
                        className="font-semibold text-slate-900 hover:text-sky-600 transition-colors"
                      >
                        {zone.name}
                      </Link>
                    </td>
                    <td>
                      {zone.anomalyCandidateCount > 0 ? (
                        <StatusBadge
                          label={`${zone.anomalyCandidateCount}건`}
                          tone="warning"
                        />
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td>
                      {zone.priorityLevel ? (
                        <StatusBadge label={getPriorityLabel(zone.priorityLevel)} tone="warning" />
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="text-slate-500 text-sm">
                      {formatDateTime(zone.latestInspectionAt)}
                    </td>
                    <td className="text-slate-500 text-sm">
                      {zone.arrayCount}·{zone.panelCount}
                    </td>
                    <td>
                      <Link to={`/zones/${zone.zoneId}`} className="text-button text-sm">
                        상세
                      </Link>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary"
                        type="button"
                        style={{ padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
                        onClick={() => {
                          setWizardInitialZoneId(zone.zoneId)
                          setIsInspectionWizardOpen(true)
                        }}
                      >
                        점검 시작
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 최근 점검 */}
      <section className="panel stack-md">
        <div className="section-header">
          <div>
            <h2 className="section-title">최근 점검</h2>
            <p className="section-description">이 발전소의 최근 점검 목록입니다.</p>
          </div>
          <Link className="text-button" to={`/inspections?plantId=${plantId}`}>
            전체 보기
          </Link>
        </div>
        {inspectionsQuery.isLoading ? (
          <LoadingState message="점검 목록을 불러오는 중입니다." />
        ) : inspections.length === 0 ? (
          <EmptyState
            title="점검 이력이 없습니다."
            description="구역을 선택해 첫 점검을 시작하세요."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="plants-compact-table">
              <thead>
                <tr>
                  <th>점검명</th>
                  <th>상태</th>
                  <th>촬영 시각</th>
                  <th>생성일</th>
                  <th>바로가기</th>
                </tr>
              </thead>
              <tbody>
                {inspections.map((inspection) => (
                  <tr key={inspection.inspectionId}>
                    <td className="font-medium text-slate-900">{inspection.name}</td>
                    <td>
                      <StatusBadge
                        label={getInspectionStatusLabel(inspection.inspectionStatus)}
                        tone={getInspectionStatusTone(inspection.inspectionStatus)}
                      />
                    </td>
                    <td className="text-slate-500 text-sm">
                      {formatDateTime(inspection.capturedAt)}
                    </td>
                    <td className="text-slate-500 text-sm">
                      {formatDateTime(inspection.createdAt)}
                    </td>
                    <td>
                      <Link
                        to={`/inspections/${inspection.inspectionId}`}
                        className="text-button text-sm"
                      >
                        상세 보기
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 관리 영역 (compact collapsible) */}
      <section className="danger-zone-compact">
        <button
          className="danger-zone-compact-toggle"
          type="button"
          onClick={() => setIsDangerZoneOpen((v) => !v)}
        >
          <span className="danger-zone-compact-label">발전소 관리</span>
          <span className="danger-zone-compact-hint">
            {isDangerZoneOpen ? '▲ 접기' : '비활성화 · 삭제 ▼'}
          </span>
        </button>
        {isDangerZoneOpen ? (
          <div className="danger-zone-compact-body">
            <p className="danger-zone-compact-desc">
              비활성화하면 운영 흐름에서 제외됩니다. 삭제는 복구가 불가능합니다.
            </p>
            <div className="danger-zone-compact-actions">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setIsDeactivatePlantOpen(true)}
              >
                비활성화
              </button>
              <button
                className="btn-ghost-danger"
                type="button"
                onClick={() => setIsDeletePlantOpen(true)}
              >
                발전소 삭제
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* 모달들 */}
      <InspectionCreateWizard
        isOpen={isInspectionWizardOpen}
        onClose={() => {
          setIsInspectionWizardOpen(false)
          setWizardInitialZoneId(null)
        }}
        initialPlantId={plantId}
        initialZoneId={wizardInitialZoneId}
      />

      {isEditPlantOpen ? (
        <div className="modal-backdrop" onClick={() => setIsEditPlantOpen(false)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="panel-title">발전소 수정</h2>
            <form className="stack-md mt-5" onSubmit={handleUpdatePlant}>
              <FormField label="발전소 이름 *" error={plantForm.formState.errors.name?.message}>
                <input className="input-field" {...plantForm.register('name')} />
              </FormField>
              <FormField label="위치">
                <input className="input-field" {...plantForm.register('location')} />
              </FormField>
              <FormField label="설명">
                <textarea className="input-field min-h-28" {...plantForm.register('description')} />
              </FormField>
              <div className="wizard-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setIsEditPlantOpen(false)}>취소</button>
                <button className="btn btn-primary" type="submit" disabled={updatePlantMutation.isPending}>저장</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {isCreateZoneOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCreateZoneOpen(false)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="panel-title">구역 등록</h2>
            <form className="stack-md mt-5" onSubmit={handleCreateZone}>
              <FormField label="구역 이름 *" error={zoneForm.formState.errors.name?.message}>
                <input className="input-field" {...zoneForm.register('name')} />
              </FormField>
              <FormField label="위치">
                <input className="input-field" {...zoneForm.register('location')} />
              </FormField>
              <FormField label="설명">
                <textarea className="input-field min-h-28" {...zoneForm.register('description')} />
              </FormField>
              <div className="wizard-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setIsCreateZoneOpen(false)}>취소</button>
                <button className="btn btn-primary" type="submit" disabled={createZoneMutation.isPending}>등록</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {zoneToEdit ? (
        <div className="modal-backdrop" onClick={() => setZoneToEdit(null)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="panel-title">구역 수정 — {zoneToEdit.name}</h2>
            <form className="stack-md mt-5" onSubmit={handleUpdateZone}>
              <FormField label="구역 이름 *" error={zoneForm.formState.errors.name?.message}>
                <input className="input-field" {...zoneForm.register('name')} />
              </FormField>
              <FormField label="위치">
                <input className="input-field" {...zoneForm.register('location')} />
              </FormField>
              <FormField label="설명">
                <textarea className="input-field min-h-28" {...zoneForm.register('description')} />
              </FormField>
              <div className="wizard-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setZoneToEdit(null)}>취소</button>
                <button className="btn btn-primary" type="submit" disabled={updateZoneMutation.isPending}>저장</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={isDeactivatePlantOpen}
        title="발전소를 비활성화할까요?"
        description="비활성화하면 운영 흐름에서 제외됩니다."
        confirmText="비활성화"
        tone="danger"
        onClose={() => setIsDeactivatePlantOpen(false)}
        onConfirm={handleDeactivatePlant}
        isConfirming={deactivatePlantMutation.isPending}
      />
      <ConfirmModal
        isOpen={isDeletePlantOpen}
        title="발전소를 삭제할까요?"
        description="삭제 전 연결된 구역, 점검, 결과 영향을 확인하세요."
        confirmText="삭제"
        tone="danger"
        onClose={() => setIsDeletePlantOpen(false)}
        onConfirm={handleDeletePlant}
        isConfirming={deletePlantMutation.isPending}
      >
        {plantDeleteImpactQuery.data?.data ? (
          <DeleteImpactSummary impact={plantDeleteImpactQuery.data.data} />
        ) : null}
      </ConfirmModal>
      <ConfirmModal
        isOpen={Boolean(zoneToDeactivate)}
        title="구역을 비활성화할까요?"
        description="비활성화하면 새 점검 시작 전에 다시 확인해야 합니다."
        confirmText="비활성화"
        tone="danger"
        onClose={() => setZoneToDeactivate(null)}
        onConfirm={handleDeactivateZone}
        isConfirming={deactivateZoneMutation.isPending}
      />
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
        {zoneDeleteImpactQuery.data?.data ? (
          <DeleteImpactSummary impact={zoneDeleteImpactQuery.data.data} />
        ) : null}
      </ConfirmModal>
    </section>
  )
}
