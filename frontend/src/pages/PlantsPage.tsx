import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import {
  useCreatePlant,
  usePlants,
} from '../features/plants/hooks/usePlants'
import {
  getResourceStatusLabel,
  getResourceStatusTone,
  type CreatePlantRequest,
} from '../features/plants/types'
import { FormField } from '../shared/components/form/FormField'
import { PageHeader } from '../shared/components/layout/PageHeader'
import { EmptyState } from '../shared/components/state/EmptyState'
import { ErrorState } from '../shared/components/state/ErrorState'
import { LoadingState } from '../shared/components/state/LoadingState'
import { StatusBadge } from '../shared/components/state/StatusBadge'
import { useToast } from '../shared/hooks/useToast'
import { formatTableDateTime, getApiErrorMessage } from '../shared/utils'

const plantFormSchema = z.object({
  name: z.string().trim().min(1, '발전소 이름을 입력해 주세요.'),
  location: z.string().trim().optional(),
  description: z.string().trim().optional(),
})
type PlantFormValues = z.infer<typeof plantFormSchema>

export function PlantsPage() {
  const toast = useToast()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const plantsQuery = usePlants({ page: 0, size: 100 })
  const createPlantMutation = useCreatePlant()

  const form = useForm<PlantFormValues>({
    resolver: zodResolver(plantFormSchema),
    defaultValues: { name: '', location: '', description: '' },
  })

  const plants = plantsQuery.data?.data.content ?? []

  const activeCount = plants.filter((p) => p.status === 'ACTIVE').length
  const inactiveCount = plants.filter((p) => p.status !== 'ACTIVE').length
  const withInspectionCount = plants.filter((p) => p.latestInspectionAt).length

  const handleCreate = form.handleSubmit(async (values) => {
    const payload: CreatePlantRequest = {
      name: values.name.trim(),
      location: values.location?.trim() || null,
      description: values.description?.trim() || null,
    }
    try {
      await createPlantMutation.mutateAsync(payload)
      toast.push('발전소가 등록되었습니다.')
      setIsCreateOpen(false)
      form.reset()
    } catch (error) {
      toast.push(getApiErrorMessage(error, '발전소 등록에 실패했습니다.'))
    }
  })

  return (
    <section className="page-shell">
      <PageHeader
        title="발전소"
        description="등록된 발전소 현황을 확인하고 관리합니다."
        actions={
          <button className="btn btn-primary" type="button" onClick={() => setIsCreateOpen(true)}>
            발전소 등록
          </button>
        }
      />

      {/* 요약 통계 카드 */}
      {plants.length > 0 ? (
        <div className="plants-summary-grid">
          <article className="plants-summary-card">
            <span className="plants-summary-label">전체 발전소</span>
            <span className="plants-summary-value">{plants.length}개</span>
          </article>
          <article className="plants-summary-card">
            <span className="plants-summary-label">운영 중</span>
            <span className="plants-summary-value" style={{ color: '#0f766e' }}>{activeCount}개</span>
          </article>
          <article className="plants-summary-card">
            <span className="plants-summary-label">비활성</span>
            <span className="plants-summary-value" style={{ color: inactiveCount > 0 ? '#92400e' : '#94a3b8' }}>{inactiveCount}개</span>
          </article>
          <article className="plants-summary-card">
            <span className="plants-summary-label">최근 점검 있음</span>
            <span className="plants-summary-value">{withInspectionCount}개</span>
            <span className="plants-summary-hint">{plants.length > 0 ? `전체 ${plants.length}개 중` : ''}</span>
          </article>
        </div>
      ) : null}

      {plantsQuery.isLoading && plants.length === 0 ? (
        <LoadingState message="발전소 목록을 불러오는 중입니다." />
      ) : null}

      {plantsQuery.isError ? (
        <ErrorState
          title="발전소 목록을 불러오지 못했습니다."
          description={getApiErrorMessage(plantsQuery.error)}
        />
      ) : null}

      {!plantsQuery.isLoading && plants.length === 0 ? (
        <section className="panel">
          <EmptyState
            title="등록된 발전소가 없습니다."
            description="발전소를 등록하면 구역과 점검 흐름을 이어서 관리할 수 있습니다."
            action={
              <button className="btn btn-primary" type="button" onClick={() => setIsCreateOpen(true)}>
                발전소 등록
              </button>
            }
          />
        </section>
      ) : null}

      {plants.length > 0 ? (
        <section className="table-panel">
          <div className="table-panel-header">
            <span className="table-panel-title">발전소 목록</span>
            <span className="table-panel-count">총 {plants.length}개</span>
          </div>
          <div className="overflow-x-auto">
            <table className="plants-compact-table">
              <thead>
                <tr>
                  <th>발전소명</th>
                  <th>위치</th>
                  <th>상태</th>
                  <th>구역 수</th>
                  <th>최근 점검</th>
                  <th>바로가기</th>
                </tr>
              </thead>
              <tbody>
                {plants.map((plant) => (
                  <tr key={plant.plantId}>
                    <td>
                      <Link
                        to={`/plants/${plant.plantId}`}
                        className="font-semibold text-slate-900 hover:text-sky-600 transition-colors"
                      >
                        {plant.name}
                      </Link>
                    </td>
                    <td className="text-slate-500">{plant.location || '-'}</td>
                    <td>
                      <StatusBadge
                        label={getResourceStatusLabel(plant.status)}
                        tone={getResourceStatusTone(plant.status)}
                      />
                    </td>
                    <td className="text-slate-700">{plant.zoneCount}개</td>
                    <td className="text-slate-500 text-sm">
                      {formatTableDateTime(plant.latestInspectionAt)}
                    </td>
                    <td>
                      <Link
                        to={`/plants/${plant.plantId}`}
                        className="text-button text-sm"
                      >
                        상세
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={() => setIsCreateOpen(false)}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="stack-sm">
              <h2 className="panel-title">발전소 등록</h2>
              <p className="panel-description">새 발전소의 기본 정보를 입력해 주세요.</p>
            </div>
            <form className="stack-md mt-5" onSubmit={handleCreate}>
              <FormField label="발전소 이름 *" error={form.formState.errors.name?.message}>
                <input className="input-field" {...form.register('name')} />
              </FormField>
              <FormField label="위치">
                <input className="input-field" {...form.register('location')} />
              </FormField>
              <FormField label="설명">
                <textarea className="input-field min-h-28" {...form.register('description')} />
              </FormField>
              <div className="wizard-footer">
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                >
                  취소
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={createPlantMutation.isPending}
                >
                  {createPlantMutation.isPending ? '등록 중...' : '등록'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  )
}
