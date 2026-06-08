import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { useCreatePlant, usePlants } from '../features/plants/hooks/usePlants'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
  RESOURCE_STATUS_OPTIONS,
  type CreatePlantRequest,
  type PlantListParams,
  type ResourceStatus,
} from '../features/plants/types'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { DataTable } from '../shared/components/table/DataTable'
import { Pagination } from '../shared/components/table/Pagination'
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

type PlantFormValues = z.infer<typeof plantFormSchema>

export function PlantListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const toast = useToast()

  const currentPage = parsePositiveNumber(searchParams.get('page') ?? undefined) ?? 1
  const currentSize = parsePositiveNumber(searchParams.get('size') ?? undefined) ?? 10
  const statusParam = searchParams.get('status')
  const currentStatus = RESOURCE_STATUS_OPTIONS.includes(statusParam as ResourceStatus)
    ? (statusParam as ResourceStatus)
    : undefined
  const currentKeyword = searchParams.get('keyword') ?? ''

  const [filters, setFilters] = useState({
    keyword: currentKeyword,
    status: currentStatus ?? '',
    size: String(currentSize),
  })

  useEffect(() => {
    setFilters({
      keyword: currentKeyword,
      status: currentStatus ?? '',
      size: String(currentSize),
    })
  }, [currentKeyword, currentSize, currentStatus])

  const queryParams: PlantListParams = {
    page: currentPage,
    size: currentSize,
    keyword: currentKeyword || undefined,
    status: currentStatus,
  }

  const plantsQuery = usePlants(queryParams)
  const createPlantMutation = useCreatePlant()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: {
      name: '',
      location: '',
      description: '',
    },
  })

  const submitFilters = () => {
    const nextParams = new URLSearchParams()

    if (filters.keyword.trim()) {
      nextParams.set('keyword', filters.keyword.trim())
    }

    if (filters.status) {
      nextParams.set('status', filters.status)
    }

    nextParams.set('page', '1')
    nextParams.set('size', filters.size)
    setSearchParams(nextParams)
  }

  const handlePageChange = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(nextPage))
    setSearchParams(nextParams)
  }

  const handleCreatePlant = handleSubmit(async (values) => {
    const payload: CreatePlantRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }

    try {
      const response = await createPlantMutation.mutateAsync(payload)
      toast.push(response.message || '발전소를 등록했습니다.')
      reset()
      setIsCreateModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 등록에 실패했습니다.'))
    }
  })

  return (
    <section className="space-y-6">
      <PageHeader
        title="발전소 관리"
        description="실제 backend의 발전소 목록, 생성, 상세 진입 흐름을 확인하는 화면입니다."
        actions={
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
          >
            발전소 등록
          </button>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">검색 및 필터</h2>
            <p className="panel-description">
              keyword, status, page, size 파라미터를 backend와 동일하게 사용합니다.
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={submitFilters}>
            조건 적용
          </button>
        </div>
        <div className="filter-grid">
          <FormField
            label="검색어"
            value={filters.keyword}
            onChange={(event) =>
              setFilters((current) => ({ ...current, keyword: event.target.value }))
            }
          />
          <FormField label="상태">
            <select
              className="input-field"
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({ ...current, status: event.target.value }))
              }
            >
              <option value="">전체</option>
              {RESOURCE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getResourceStatusLabel(status)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="페이지 크기">
            <select
              className="input-field"
              value={filters.size}
              onChange={(event) =>
                setFilters((current) => ({ ...current, size: event.target.value }))
              }
            >
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}개
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      {plantsQuery.isLoading ? <LoadingState message="발전소 목록을 불러오는 중입니다." /> : null}
      {plantsQuery.isError ? (
        <ErrorState
          title="발전소 목록 조회에 실패했습니다."
          description={getApiErrorMessage(
            plantsQuery.error,
            'backend 없이도 화면은 유지되지만 목록은 비어 있을 수 있습니다.',
          )}
        />
      ) : null}

      {plantsQuery.data ? (
        <>
          <DataTable
            columns={[
              {
                key: 'name',
                header: '발전소',
                render: (plant) => (
                  <div className="stack-sm">
                    <Link
                      className="text-base font-semibold text-sky-700"
                      to={`/plants/${plant.plantId}`}
                    >
                      {plant.name}
                    </Link>
                    <span className="text-xs text-slate-500">ID {plant.plantId}</span>
                  </div>
                ),
              },
              {
                key: 'location',
                header: '위치',
                render: (plant) => plant.location || '-',
              },
              {
                key: 'status',
                header: '상태',
                render: (plant) => (
                  <StatusBadge
                    label={getResourceStatusLabel(plant.status)}
                    tone={getResourceStatusTone(plant.status)}
                  />
                ),
              },
              {
                key: 'zones',
                header: '구역 수',
                render: (plant) => `${plant.zoneCount}개`,
              },
              {
                key: 'latestInspectionAt',
                header: '최근 점검',
                render: (plant) => formatDateTime(plant.latestInspectionAt),
              },
            ]}
            rows={plantsQuery.data.data.content}
            rowKey={(plant) => plant.plantId}
            emptyTitle="등록된 발전소가 없습니다."
            emptyDescription="검색 조건에 맞는 발전소가 없거나 backend 데이터가 아직 없습니다."
          />
          <Pagination
            page={plantsQuery.data.data.page}
            totalPages={plantsQuery.data.data.totalPages}
            totalElements={plantsQuery.data.data.totalElements}
            onPageChange={handlePageChange}
          />
        </>
      ) : null}

      <EntityModal
        isOpen={isCreateModalOpen}
        title="발전소 등록"
        description="PlantController의 CreatePlantRequest 형식으로 저장합니다."
        onClose={() => {
          reset()
          setIsCreateModalOpen(false)
        }}
      >
        <form className="mt-6 stack-md" onSubmit={handleCreatePlant}>
          <FormField
            label="이름"
            placeholder="발전소 이름"
            error={errors.name?.message}
            {...register('name')}
          />
          <FormField
            label="위치"
            placeholder="예: 전북 익산시"
            error={errors.location?.message}
            {...register('location')}
          />
          <FormField label="설명" error={errors.description?.message}>
            <textarea
              className="input-field textarea-field"
              placeholder="발전소 설명"
              {...register('description')}
            />
          </FormField>
          <div className="flex justify-end gap-3">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                reset()
                setIsCreateModalOpen(false)
              }}
            >
              취소
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={createPlantMutation.isPending}
            >
              등록
            </button>
          </div>
        </form>
      </EntityModal>
    </section>
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
