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
import { EmptyState } from '../shared/components/state/EmptyState'
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
  name: z.string().trim().min(1, '발전소 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, '점검 영역 이름을 입력해 주세요.'),
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
        title="올바르지 않은 발전소 ID입니다."
        description="주소의 발전소 정보가 올바른지 확인해 주세요."
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
      toast.push(response.message || '발전소 정보가 수정되었습니다.')
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
      toast.push(response.message || '점검 영역이 등록되었습니다.')
      zoneForm.reset()
      setIsCreateZoneModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 영역 등록에 실패했습니다.'))
    }
  })

  const handleDeactivatePlant = async () => {
    try {
      const response = await deactivatePlantMutation.mutateAsync()
      toast.push(response.message || '발전소가 비활성화되었습니다.')
      setIsDeactivateModalOpen(false)
      navigate('/plants')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 비활성화에 실패했습니다.'))
    }
  }

  const plant = plantQuery.data?.data
  const zones = zonesQuery.data?.data ?? []

  return (
    <section className="space-y-6">
      <PageHeader
        title={plant?.name ?? '발전소 상세'}
        description="점검 영역을 관리하고 이 발전소의 새 점검을 시작할 수 있습니다."
        actions={
          <>
            <Link className="btn btn-primary" to={`/inspections?plantId=${plantId}`}>
              이 발전소 점검 시작
            </Link>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                zoneForm.reset()
                setIsCreateZoneModalOpen(true)
              }}
            >
              점검 영역 설정
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => setIsEditModalOpen(true)}
            >
              정보 수정
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

      {plant ? (
        <section className="panel stack-md">
          <div className="toolbar">
            <div className="stack-sm">
              <div className="inline-actions">
                <StatusBadge
                  label={getResourceStatusLabel(plant.status)}
                  tone={getResourceStatusTone(plant.status)}
                />
                <StatusBadge label={`점검 영역 ${plant.zoneCount}개`} />
              </div>
              <div>
                <h2 className="panel-title">{plant.name}</h2>
                <p className="panel-description">{plant.location || '위치 정보가 없습니다.'}</p>
              </div>
            </div>
            <div className="inline-actions text-sm text-slate-500">
              <span>생성 {formatDateTime(plant.createdAt)}</span>
              <span>수정 {formatDateTime(plant.updatedAt)}</span>
            </div>
          </div>
          <div className="detail-grid">
            <DetailItem label="설명" value={plant.description || '-'} />
            <DetailItem label="최근 점검" value={formatDateTime(plant.latestInspectionAt)} />
            <DetailItem label="생성자" value={String(plant.createdByUserId)} />
            <DetailItem label="발전소 ID" value={String(plant.plantId)} />
          </div>
        </section>
      ) : null}

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">점검 영역 목록</h2>
            <p className="panel-description">
              점검할 영역을 확인하고 상세 정보나 점검 시작으로 이어갈 수 있습니다.
            </p>
          </div>
          <Link className="btn btn-secondary" to={`/inspections?plantId=${plantId}`}>
            이 발전소 점검 시작
          </Link>
        </div>

        {zonesQuery.isLoading ? <LoadingState message="점검 영역 목록을 불러오는 중입니다." /> : null}
        {zonesQuery.isError ? (
          <ErrorState
            title="점검 영역 목록 조회에 실패했습니다."
            description={getApiErrorMessage(zonesQuery.error)}
          />
        ) : null}

        {zonesQuery.data ? (
          zones.length > 0 ? (
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: '점검 영역',
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
                  header: '설비 현황',
                  render: (zone) => (
                    <div className="stack-sm text-sm">
                      <span>Array {zone.arrayCount}개</span>
                      <span>Panel {zone.panelCount}개</span>
                    </div>
                  ),
                },
                {
                  key: 'anomaly',
                  header: '이상 후보',
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
                {
                  key: 'actions',
                  header: '동작',
                  render: (zone) => (
                    <Link
                      className="text-button"
                      to={`/inspections?plantId=${plantId}&zoneId=${zone.zoneId}`}
                    >
                      이 영역 점검 시작
                    </Link>
                  ),
                },
              ]}
              rows={zones}
              rowKey={(zone) => zone.zoneId}
            />
          ) : (
            <div className="state-card space-y-4">
              <EmptyState
                title="등록된 점검 영역이 없습니다."
                description="점검을 시작하려면 먼저 이 발전소의 점검 영역을 설정하세요."
              />
              <div className="flex justify-center">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => {
                    zoneForm.reset()
                    setIsCreateZoneModalOpen(true)
                  }}
                >
                  점검 영역 설정
                </button>
              </div>
            </div>
          )
        ) : null}
      </section>

      <EntityModal
        isOpen={isEditModalOpen}
        title="발전소 정보 수정"
        description="점검에 필요한 발전소 기본 정보를 수정하세요."
        onClose={() => setIsEditModalOpen(false)}
      >
        <form className="stack-md" onSubmit={handleUpdatePlant}>
          <FormField
            label="발전소 이름 *"
            placeholder="예: 부천 발전소"
            error={plantForm.formState.errors.name?.message}
            {...plantForm.register('name')}
          />
          <FormField
            label="위치"
            placeholder="예: 경기도 부천시"
            error={plantForm.formState.errors.location?.message}
            {...plantForm.register('location')}
          />
          <FormField label="설명" error={plantForm.formState.errors.description?.message}>
            <textarea
              className="input-field textarea-field"
              placeholder="예: 지붕형 발전소, 1구역과 2구역으로 나누어 점검"
              {...plantForm.register('description')}
            />
          </FormField>
          <ModalActions
            isSubmitting={updatePlantMutation.isPending}
            onCancel={() => setIsEditModalOpen(false)}
            submitText="저장"
          />
        </form>
      </EntityModal>

      <EntityModal
        isOpen={isCreateZoneModalOpen}
        title="점검 영역 설정"
        description="이 발전소에서 점검할 영역 정보를 입력하세요."
        onClose={() => {
          zoneForm.reset()
          setIsCreateZoneModalOpen(false)
        }}
      >
        <form className="stack-md" onSubmit={handleCreateZone}>
          <FormField
            label="점검 영역 이름 *"
            placeholder="예: 1구역 옥상 동측"
            error={zoneForm.formState.errors.name?.message}
            {...zoneForm.register('name')}
          />
          <FormField
            label="위치"
            placeholder="예: 본관 옥상 동측"
            error={zoneForm.formState.errors.location?.message}
            {...zoneForm.register('location')}
          />
          <FormField label="설명" error={zoneForm.formState.errors.description?.message}>
            <textarea
              className="input-field textarea-field"
              placeholder="예: 열화상 촬영 우선, 출입 전 안전장비 확인"
              {...zoneForm.register('description')}
            />
          </FormField>
          <ModalActions
            isSubmitting={createZoneMutation.isPending}
            onCancel={() => {
              zoneForm.reset()
              setIsCreateZoneModalOpen(false)
            }}
            submitText="설정 저장"
          />
        </form>
      </EntityModal>

      <ConfirmModal
        isOpen={isDeactivateModalOpen}
        title="발전소 비활성화"
        description="이 발전소를 비활성화하면 새 점검 시작 전에 다시 상태를 확인해야 합니다. 계속할까요?"
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
      <section
        className="modal-card max-h-[calc(100vh-3rem)] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
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
  submitText = '저장',
}: {
  isSubmitting: boolean
  onCancel: () => void
  submitText?: string
}) {
  return (
    <div className="flex justify-end gap-3">
      <button className="btn btn-secondary" type="button" onClick={onCancel}>
        취소
      </button>
      <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
        {submitText}
      </button>
    </div>
  )
}
