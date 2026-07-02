import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import { EmptyState } from '../shared/components/state/EmptyState'
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
  name: z.string().trim().min(1, '발전소 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})

type PlantFormValues = z.infer<typeof plantFormSchema>

export function PlantListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
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
    page: currentPage - 1,
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

  const resetFilters = () => {
    setFilters({ keyword: '', status: '', size: '10' })
    setSearchParams(new URLSearchParams({ page: '1', size: '10' }))
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
      navigate(`/plants/${response.data.plantId}`)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 등록에 실패했습니다.'))
    }
  })

  const plants = plantsQuery.data?.data.content ?? []

  return (
    <section className="space-y-6">
      <PageHeader
        title="발전소"
        description="발전소를 등록하고 상태와 최근 점검 흐름을 빠르게 확인하세요."
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
            <h2 className="panel-title">조회 조건</h2>
            <p className="panel-description">
              검색어와 상태만 먼저 열어 두고, 필요한 경우에만 조건을 바꿔 확인합니다.
            </p>
          </div>
          <div className="inline-actions">
            <button className="btn btn-secondary" type="button" onClick={resetFilters}>
              초기화
            </button>
            <button className="btn btn-primary" type="button" onClick={submitFilters}>
              적용
            </button>
          </div>
        </div>
        <div className="filter-grid">
          <FormField
            label="검색어"
            placeholder="발전소 이름 또는 위치"
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
          title="발전소 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(plantsQuery.error, '잠시 후 다시 시도해 주세요.')}
        />
      ) : null}

      {plantsQuery.data ? (
        plants.length > 0 ? (
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
                      <span className="text-sm text-slate-500">
                        {plant.location || '위치 정보 없음'}
                      </span>
                    </div>
                  ),
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
                  header: '점검 영역 수',
                  render: (plant) => `${plant.zoneCount}개`,
                },
                {
                  key: 'latestInspectionAt',
                  header: '최근 점검',
                  render: (plant) => formatDateTime(plant.latestInspectionAt),
                },
                {
                  key: 'actions',
                  header: '이동',
                  render: (plant) => (
                    <Link className="text-button" to={`/plants/${plant.plantId}`}>
                      상세 보기
                    </Link>
                  ),
                },
              ]}
              rows={plants}
              rowKey={(plant) => plant.plantId}
            />
            <Pagination
              page={(plantsQuery.data.data.page ?? 0) + 1}
              totalPages={plantsQuery.data.data.totalPages}
              totalElements={plantsQuery.data.data.totalElements}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <div className="state-card">
            <EmptyState
              title="등록된 발전소가 없습니다."
              description="상단의 발전소 등록 버튼으로 첫 운영 대상을 추가해 주세요."
            />
          </div>
        )
      ) : null}

      <EntityModal
        isOpen={isCreateModalOpen}
        title="발전소 등록"
        description="발전소 이름과 기본 정보를 입력하면 상세 화면에서 점검 영역을 이어서 등록할 수 있습니다."
        onClose={() => {
          reset()
          setIsCreateModalOpen(false)
        }}
      >
        <form className="mt-6 stack-md" onSubmit={handleCreatePlant}>
          <FormField
            label="발전소 이름 *"
            placeholder="예: 부천 발전소"
            error={errors.name?.message}
            {...register('name')}
          />
          <FormField
            label="위치"
            placeholder="예: 경기 부천시"
            error={errors.location?.message}
            {...register('location')}
          />
          <FormField label="설명" error={errors.description?.message}>
            <textarea
              className="input-field textarea-field"
              placeholder="운영 메모나 구역 구성 정보를 적어 두면 이후 화면에서 참고하기 쉽습니다."
              {...register('description')}
            />
          </FormField>
          <div className="inline-actions justify-end">
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
