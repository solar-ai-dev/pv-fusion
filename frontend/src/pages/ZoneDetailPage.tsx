import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { InspectionCreateWizard } from '../features/inspections/components/InspectionCreateWizard'
import { useInspections } from '../features/inspections/hooks/useInspections'
import { getInspectionStatusLabel, getInspectionStatusTone } from '../features/inspections/types'
import { usePlant } from '../features/plants/hooks/usePlants'
import { getResourceStatusLabel, getResourceStatusTone } from '../features/plants/types'
import {
  useDeactivateZone,
  useDeleteZone,
  useUpdateZone,
  useZone,
  useZoneDeleteImpact,
} from '../features/zones/hooks/useZones'
import { getPriorityLabel, type UpdateZoneRequest } from '../features/zones/types'
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

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, '구역 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})
type ZoneFormValues = z.infer<typeof zoneFormSchema>

export function ZoneDetailPage() {
  const { zoneId: zoneIdParam } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const zoneId = parsePositiveNumber(zoneIdParam) ?? 0

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isInspectionWizardOpen, setIsInspectionWizardOpen] = useState(false)

  const zoneQuery = useZone(zoneId)
  const zone = zoneQuery.data?.data ?? null
  const plantQuery = usePlant(zone?.plantId ?? 0)
  const plant = plantQuery.data?.data ?? null
  const inspectionsQuery = useInspections(
    { zoneId: zoneId || undefined, page: 0, size: 10 },
    zoneId > 0,
  )
  const inspections = inspectionsQuery.data?.data.content ?? []

  const updateZoneMutation = useUpdateZone(zoneId)
  const deactivateZoneMutation = useDeactivateZone(zoneId)
  const deleteZoneMutation = useDeleteZone(zoneId)
  const zoneDeleteImpactQuery = useZoneDeleteImpact(zoneId, isDeleteOpen)

  const form = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: { name: '', location: '', description: '' },
  })

  useEffect(() => {
    if (isEditOpen && zone) {
      form.reset({
        name: zone.name,
        location: zone.location ?? '',
        description: zone.description ?? '',
      })
    }
  }, [isEditOpen, zone, form])

  if (!zoneId) {
    return (
      <ErrorState title="올바르지 않은 구역 정보입니다." description="주소를 다시 확인해 주세요." />
    )
  }

  if (zoneQuery.isLoading) {
    return <LoadingState message="구역 정보를 불러오는 중입니다." />
  }

  if (zoneQuery.isError || !zone) {
    return (
      <ErrorState
        title="구역 정보를 불러오지 못했습니다."
        description={getApiErrorMessage(zoneQuery.error)}
      />
    )
  }

  const handleUpdate = form.handleSubmit(async (values) => {
    const payload: UpdateZoneRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }
    try {
      await updateZoneMutation.mutateAsync(payload)
      toast.push('구역 정보가 저장되었습니다.')
      setIsEditOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 수정에 실패했습니다.'))
    }
  })

  const handleDeactivate = async () => {
    try {
      await deactivateZoneMutation.mutateAsync()
      toast.push('구역이 비활성화되었습니다.')
      setIsDeactivateOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 비활성화에 실패했습니다.'))
    }
  }

  const handleDelete = async () => {
    if (!zoneDeleteImpactQuery.data?.data) {
      toast.push('삭제 영향 범위를 불러오지 못했습니다.')
      return
    }
    try {
      await deleteZoneMutation.mutateAsync()
      toast.push('구역이 삭제되었습니다.')
      navigate(plant ? `/plants/${plant.plantId}` : '/plants')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 삭제에 실패했습니다.'))
    }
  }

  return (
    <section className="page-shell">
      <PageHeader
        title={zone.name}
        description={zone.location || '위치 정보가 없습니다.'}
        actions={
          <div className="page-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setIsInspectionWizardOpen(true)}
            >
              이 구역 점검 시작
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsEditOpen(true)}
            >
              구역 수정
            </button>
            {plant ? (
              <Link className="btn btn-secondary" to={`/plants/${plant.plantId}`}>
                발전소 상세
              </Link>
            ) : null}
          </div>
        }
      />

      {/* 요약 */}
      <section className="panel">
        <div className="detail-summary-grid">
          <div className="detail-summary-item">
            <span className="detail-summary-label">발전소</span>
            <span className="detail-summary-value">{plant?.name ?? '-'}</span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">상태</span>
            <span className="detail-summary-value">
              <StatusBadge
                label={getResourceStatusLabel(zone.status)}
                tone={getResourceStatusTone(zone.status)}
              />
            </span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">이상 후보</span>
            <span className="detail-summary-value">
              {zone.anomalyCandidateCount > 0 ? (
                <StatusBadge label={`${zone.anomalyCandidateCount}건`} tone="warning" />
              ) : (
                '0건'
              )}
            </span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">우선순위</span>
            <span className="detail-summary-value">
              {zone.priorityLevel ? (
                <StatusBadge label={getPriorityLabel(zone.priorityLevel)} tone="warning" />
              ) : (
                '-'
              )}
            </span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">최근 점검</span>
            <span className="detail-summary-value">{formatDateTime(zone.latestInspectionAt)}</span>
          </div>
          <div className="detail-summary-item">
            <span className="detail-summary-label">설비 구조</span>
            <span className="detail-summary-value">
              어레이 {zone.arrayCount} · 패널 {zone.panelCount}
            </span>
          </div>
        </div>
        {zone.description ? (
          <p className="mt-3 text-sm text-slate-600">{zone.description}</p>
        ) : null}
      </section>

      {/* 점검 이력 */}
      <section className="panel stack-md">
        <div className="section-header">
          <div>
            <h2 className="section-title">점검 이력</h2>
            <p className="section-description">이 구역의 점검 기록입니다.</p>
          </div>
          <Link className="text-button" to={`/inspections?zoneId=${zoneId}`}>
            전체 보기
          </Link>
        </div>
        {inspectionsQuery.isLoading ? (
          <LoadingState message="점검 이력을 불러오는 중입니다." />
        ) : inspections.length === 0 ? (
          <EmptyState
            title="점검 이력이 없습니다."
            description="첫 점검을 시작하면 이 구역의 이력이 쌓입니다."
            action={
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => setIsInspectionWizardOpen(true)}
              >
                이 구역 점검 시작
              </button>
            }
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

      {/* 관리 영역 */}
      <section className="danger-zone">
        <h3 className="danger-zone-title">구역 관리</h3>
        <p className="danger-zone-description">
          비활성화하면 운영 흐름에서 제외됩니다. 삭제는 복구가 불가능합니다.
        </p>
        <div className="danger-zone-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setIsDeactivateOpen(true)}
          >
            비활성화
          </button>
          <button
            className="btn-danger btn"
            type="button"
            onClick={() => setIsDeleteOpen(true)}
          >
            구역 삭제
          </button>
        </div>
      </section>

      <InspectionCreateWizard
        isOpen={isInspectionWizardOpen}
        onClose={() => setIsInspectionWizardOpen(false)}
        initialPlantId={zone.plantId}
        initialZoneId={zoneId}
      />

      {isEditOpen ? (
        <div className="modal-backdrop" onClick={() => setIsEditOpen(false)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="panel-title">구역 수정</h2>
            <form className="stack-md mt-5" onSubmit={handleUpdate}>
              <FormField label="구역 이름 *" error={form.formState.errors.name?.message}>
                <input className="input-field" {...form.register('name')} />
              </FormField>
              <FormField label="위치">
                <input className="input-field" {...form.register('location')} />
              </FormField>
              <FormField label="설명">
                <textarea className="input-field min-h-28" {...form.register('description')} />
              </FormField>
              <div className="wizard-footer">
                <button className="btn btn-secondary" type="button" onClick={() => setIsEditOpen(false)}>취소</button>
                <button className="btn btn-primary" type="submit" disabled={updateZoneMutation.isPending}>저장</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      <ConfirmModal
        isOpen={isDeactivateOpen}
        title="구역을 비활성화할까요?"
        description="비활성화하면 새 점검 시작 전에 다시 확인해야 합니다."
        confirmText="비활성화"
        tone="danger"
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={handleDeactivate}
        isConfirming={deactivateZoneMutation.isPending}
      />
      <ConfirmModal
        isOpen={isDeleteOpen}
        title="구역을 삭제할까요?"
        description="삭제 전 연결된 점검, 이미지, 결과 영향을 확인하세요."
        confirmText="삭제"
        tone="danger"
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        isConfirming={deleteZoneMutation.isPending}
      >
        {zoneDeleteImpactQuery.data?.data ? (
          <DeleteImpactSummary impact={zoneDeleteImpactQuery.data.data} />
        ) : null}
      </ConfirmModal>
    </section>
  )
}
