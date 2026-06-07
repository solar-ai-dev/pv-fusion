import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  useDeactivatePlant,
  usePlant,
  useUpdatePlant,
} from '../features/plants/hooks/usePlants'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
  type UpdatePlantRequest,
} from '../features/plants/types'
import { useCreateZone, useZonesByPlantId } from '../features/zones/hooks/useZones'
import type { CreateZoneRequest } from '../features/zones/types'
import { ConfirmModal } from '../shared/components/feedback/ConfirmModal'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { useToast } from '../shared/hooks/useToast'
import {
  formatDateTime,
  getApiErrorMessage,
  parsePositiveNumber,
} from '../shared/utils'

const plantFormSchema = z.object({
  name: z.string().trim().min(1, '발전소 이름은 필수입니다.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, '구역 이름은 필수입니다.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

type PlantFormValues = z.infer<typeof plantFormSchema>
type ZoneFormValues = z.infer<typeof zoneFormSchema>

export function PlantDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const plantId = parsePositiveNumber(params.plantId)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateZoneModalOpen, setIsCreateZoneModalOpen] = useState(false)
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false)

  const plantQuery = usePlant(plantId ?? 0)
  const zonesQuery = useZonesByPlantId(plantId ?? 0)
  const updatePlantMutation = useUpdatePlant(plantId ?? 0)
  const deactivatePlantMutation = useDeactivatePlant(plantId ?? 0)
  const createZoneMutation = useCreateZone(plantId ?? 0)

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

  useEffect(() => {
    if (plantQuery.data) {
      plantForm.reset({
        name: plantQuery.data.data.name,
        location: plantQuery.data.data.location ?? '',
        description: plantQuery.data.data.description ?? '',
      })
    }
  }, [plantForm, plantQuery.data])

  if (!plantId) {
    return (
      <ErrorState
        title="잘못된 발전소 ID입니다."
        description="URL의 plantId가 숫자인지 확인해 주세요."
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
      const response = await updatePlantMutation.mutateAsync(payload)
      toast.push(response.message || '발전소 정보를 수정했습니다.')
      setIsEditModalOpen(false)
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
      toast.push(response.message || '구역을 등록했습니다.')
      zoneForm.reset()
      setIsCreateZoneModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '구역 등록에 실패했습니다.'))
    }
  })

  const handleDeactivatePlant = async () => {
    try {
      const response = await deactivatePlantMutation.mutateAsync()
      toast.push(response.message || '발전소를 비활성화했습니다.')
      setIsDeactivateModalOpen(false)
      navigate('/plants')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 비활성화에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="발전소 상세"
        description="발전소 기본 정보와 구역 목록을 backend 실제 응답 기준으로 보여줍니다."
        actions={
          <>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsEditModalOpen(true)}
            >
              정보 수정
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => {
                zoneForm.reset()
                setIsCreateZoneModalOpen(true)
              }}
            >
              구역 등록
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsDeactivateModalOpen(true)}
            >
              비활성화
            </button>
          </>
        }
      />

      {plantQuery.isLoading ? <LoadingState message="발전소 정보를 불러오는 중입니다." /> : null}
      {plantQuery.isError ? (
        <ErrorState
          title="발전소 상세 조회에 실패했습니다."
          description={getApiErrorMessage(plantQuery.error)}
        />
      ) : null}

      {plantQuery.data ? (
        <section className="panel stack-md">
          <div className="toolbar">
            <div className="stack-sm">
              <div className="inline-actions">
                <StatusBadge
                  label={getResourceStatusLabel(plantQuery.data.data.status)}
                  tone={getResourceStatusTone(plantQuery.data.data.status)}
                />
                <StatusBadge label={`구역 ${plantQuery.data.data.zoneCount}개`} />
              </div>
              <div>
                <h2 className="panel-title">{plantQuery.data.data.name}</h2>
                <p className="panel-description">
                  {plantQuery.data.data.location || '위치 정보 없음'}
                </p>
              </div>
            </div>
            <div className="inline-actions text-sm text-slate-500">
              <span>생성 {formatDateTime(plantQuery.data.data.createdAt)}</span>
              <span>수정 {formatDateTime(plantQuery.data.data.updatedAt)}</span>
            </div>
          </div>
          <div className="detail-grid">
            <DetailItem label="설명" value={plantQuery.data.data.description || '-'} />
            <DetailItem
              label="최근 점검"
              value={formatDateTime(plantQuery.data.data.latestInspectionAt)}
            />
            <DetailItem label="생성자" value={String(plantQuery.data.data.createdByUserId)} />
            <DetailItem label="발전소 ID" value={String(plantQuery.data.data.plantId)} />
          </div>
        </section>
      ) : null}

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">구역 목록</h2>
            <p className="panel-description">
              `GET /api/v1/plants/{'{plantId}'}/zones` 결과를 그대로 표시합니다.
            </p>
          </div>
          <Link className="btn btn-secondary" to="/inspections">
            점검 목록 이동
          </Link>
        </div>

        {zonesQuery.isLoading ? <LoadingState message="구역 목록을 불러오는 중입니다." /> : null}
        {zonesQuery.isError ? (
          <ErrorState
            title="구역 목록 조회에 실패했습니다."
            description={getApiErrorMessage(zonesQuery.error)}
          />
        ) : null}

        {zonesQuery.data ? (
          <DataTable
            columns={[
              {
                key: 'name',
                header: '구역',
                render: (zone) => (
                  <div className="stack-sm">
                    <Link
                      className="text-base font-semibold text-sky-700"
                      to={`/zones/${zone.zoneId}`}
                    >
                      {zone.name}
                    </Link>
                    <span className="text-xs text-slate-500">ID {zone.zoneId}</span>
                  </div>
                ),
              },
              {
                key: 'stats',
                header: '장비 현황',
                render: (zone) => (
                  <div className="stack-sm text-sm">
                    <span>Array {zone.arrayCount}개</span>
                    <span>Panel {zone.panelCount}개</span>
                  </div>
                ),
              },
              {
                key: 'anomaly',
                header: '후보 이상',
                render: (zone) => `${zone.anomalyCandidateCount}건`,
              },
              {
                key: 'priority',
                header: '우선순위',
                render: (zone) => zone.priorityLevel || '-',
              },
              {
                key: 'latestInspectionAt',
                header: '최근 점검',
                render: (zone) => formatDateTime(zone.latestInspectionAt),
              },
            ]}
            rows={zonesQuery.data.data}
            rowKey={(zone) => zone.zoneId}
            emptyTitle="등록된 구역이 없습니다."
            emptyDescription="이 발전소에 첫 번째 구역을 추가해 보세요."
          />
        ) : null}
      </section>

      <EntityModal
        isOpen={isEditModalOpen}
        title="발전소 정보 수정"
        description="PATCH /api/v1/plants/{plantId} 요청 형식입니다."
        onClose={() => setIsEditModalOpen(false)}
      >
        <form className="stack-md" onSubmit={handleUpdatePlant}>
          <FormField
            label="이름"
            error={plantForm.formState.errors.name?.message}
            {...plantForm.register('name')}
          />
          <FormField
            label="위치"
            error={plantForm.formState.errors.location?.message}
            {...plantForm.register('location')}
          />
          <FormField
            label="설명"
            error={plantForm.formState.errors.description?.message}
          >
            <textarea
              className="input-field textarea-field"
              {...plantForm.register('description')}
            />
          </FormField>
          <ModalActions
            isSubmitting={updatePlantMutation.isPending}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </form>
      </EntityModal>

      <EntityModal
        isOpen={isCreateZoneModalOpen}
        title="구역 등록"
        description="POST /api/v1/plants/{plantId}/zones 요청 형식입니다."
        onClose={() => {
          zoneForm.reset()
          setIsCreateZoneModalOpen(false)
        }}
      >
        <form className="stack-md" onSubmit={handleCreateZone}>
          <FormField
            label="이름"
            error={zoneForm.formState.errors.name?.message}
            {...zoneForm.register('name')}
          />
          <FormField
            label="위치"
            error={zoneForm.formState.errors.location?.message}
            {...zoneForm.register('location')}
          />
          <FormField
            label="설명"
            error={zoneForm.formState.errors.description?.message}
          >
            <textarea
              className="input-field textarea-field"
              {...zoneForm.register('description')}
            />
          </FormField>
          <ModalActions
            isSubmitting={createZoneMutation.isPending}
            onCancel={() => {
              zoneForm.reset()
              setIsCreateZoneModalOpen(false)
            }}
          />
        </form>
      </EntityModal>

      <ConfirmModal
        isOpen={isDeactivateModalOpen}
        title="발전소 비활성화"
        description="실제 backend는 204가 아니라 200 본문을 반환합니다. 이 호출은 plant detail과 list를 함께 갱신합니다."
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivatePlantMutation.isPending}
        onConfirm={handleDeactivatePlant}
        onCancel={() => setIsDeactivateModalOpen(false)}
      />
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-item">
      <span className="detail-label">{label}</span>
      <span className="detail-value">{value}</span>
    </div>
  )
}

function EntityModal({
  isOpen,
  title,
  description,
  children,
  onClose,
}: {
  isOpen: boolean
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-description">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  )
}

function ModalActions({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean
  onCancel: () => void
}) {
  return (
    <div className="flex justify-end gap-3">
      <button className="btn btn-secondary" type="button" onClick={onCancel}>
        취소
      </button>
      <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
        저장
      </button>
    </div>
  )
}
