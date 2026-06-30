import type { ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'
import {
  getAnalysisInputTypeLabel,
  getAnalysisJobStatusLabel,
  getAnalysisJobStatusTone,
} from '../features/analysisJobs/types'
import {
  useAnalysisJob,
  useAnalysisJobs,
  useCreateAnalysisJob,
  useRetryAnalysisJob,
} from '../features/analysisJobs/hooks/useAnalysisJobs'
import { useEquipments } from '../features/equipments/hooks/useEquipments'
import { flattenEquipmentTree } from '../features/equipments/types'
import {
  IMAGE_TYPE_OPTIONS,
  TARGET_TYPE_OPTIONS,
  getImageTypeLabel,
  getTargetTypeLabel,
  getUploadStatusLabel,
  getUploadStatusTone,
  type ImageSummary,
} from '../features/images/types'
import {
  useDeactivateImage,
  useImagePreview,
  useImages,
  useUploadImage,
} from '../features/images/hooks/useImages'
import {
  CAPTURE_METHOD_OPTIONS,
  getCaptureMethodLabel,
  getInspectionStatusLabel,
  getInspectionStatusTone,
  type UpdateInspectionRequest,
} from '../features/inspections/types'
import {
  useInspection,
  useUpdateInspection,
} from '../features/inspections/hooks/useInspections'
import { getResourceStatusLabel, getResourceStatusTone } from '../features/plants/types'
import { useZone } from '../features/zones/hooks/useZones'
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
  isActiveResource,
  isRunningAnalysisJob,
  parsePositiveNumber,
  toDateTimeLocalInputValue,
  toOffsetDateTime,
} from '../shared/utils'

const updateInspectionSchema = z.object({
  name: z.string().trim().min(1, '점검명을 입력해 주세요.'),
  capturedAt: z.string().optional(),
  captureMethod: z.enum(CAPTURE_METHOD_OPTIONS),
  inspectorName: z.string().optional(),
  memo: z.string().optional(),
})

const uploadImageSchema = z
  .object({
    targetType: z.enum(TARGET_TYPE_OPTIONS),
    equipmentId: z.string().optional(),
    imageType: z.enum(IMAGE_TYPE_OPTIONS),
    capturedAt: z.string().optional(),
    memo: z.string().optional(),
    file: z.custom<FileList | undefined>(
      (value) => value === undefined || value instanceof FileList,
      '이미지 파일을 선택해 주세요.',
    ),
  })
  .superRefine((value, context) => {
    const hasFile = value.file instanceof FileList && value.file.length > 0

    if (!hasFile) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['file'],
        message: '이미지 파일을 선택해 주세요.',
      })
    }

    if (value.targetType === 'ZONE' && value.equipmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentId'],
        message: '구역 대상 이미지는 설비를 선택할 수 없습니다.',
      })
    }

    if (value.targetType !== 'ZONE' && !value.equipmentId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['equipmentId'],
        message: '설비 대상 이미지는 설비를 지정해 주세요.',
      })
    }
  })

type UpdateInspectionFormValues = z.infer<typeof updateInspectionSchema>
type UploadImageFormValues = z.infer<typeof uploadImageSchema>

export function InspectionDetailPage() {
  const params = useParams()
  const toast = useToast()
  const inspectionId = parsePositiveNumber(params.inspectionId)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [previewImageId, setPreviewImageId] = useState<number | null>(null)
  const [selectedImage, setSelectedImage] = useState<ImageSummary | null>(null)
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [uploadFormVersion, setUploadFormVersion] = useState(0)

  const inspectionQuery = useInspection(inspectionId ?? 0)
  const zoneId = inspectionQuery.data?.data.zoneId ?? 0
  const zoneQuery = useZone(zoneId)
  const equipmentsQuery = useEquipments(zoneId, {})
  const imagesQuery = useImages({ inspectionId: inspectionId ?? undefined })
  const updateInspectionMutation = useUpdateInspection(inspectionId ?? 0)
  const uploadImageMutation = useUploadImage(inspectionId ?? 0)
  const deactivateImageMutation = useDeactivateImage(inspectionId ?? 0)
  const previewQuery = useImagePreview(previewImageId ?? 0, Boolean(previewImageId))
  const analysisJobsQuery = useAnalysisJobs(
    {
      inspectionId: inspectionId ?? undefined,
      page: 0,
      size: 20,
    },
    Boolean(inspectionId),
  )
  const selectedJobQuery = useAnalysisJob(selectedJobId ?? 0, Boolean(selectedJobId))
  const createAnalysisJobMutation = useCreateAnalysisJob()
  const retryAnalysisJobMutation = useRetryAnalysisJob(selectedJobId ?? 0)

  const inspectionForm = useForm<UpdateInspectionFormValues>({
    resolver: zodResolver(updateInspectionSchema),
    defaultValues: {
      name: '',
      capturedAt: '',
      captureMethod: 'DRONE',
      inspectorName: '',
      memo: '',
    },
  })

  const uploadForm = useForm<UploadImageFormValues>({
    resolver: zodResolver(uploadImageSchema),
    defaultValues: {
      targetType: 'ZONE',
      equipmentId: '',
      imageType: 'RGB',
      capturedAt: '',
      memo: '',
      file: undefined,
    },
  })

  const flattenedEquipments = useMemo(
    () => flattenEquipmentTree(equipmentsQuery.data?.data ?? []),
    [equipmentsQuery.data],
  )
  const selectedTargetType = uploadForm.watch('targetType')
  const isZoneUploadTarget = selectedTargetType === 'ZONE'
  const uploadEquipmentOptions = useMemo(
    () =>
      isZoneUploadTarget
        ? []
        : flattenedEquipments.filter(
            (equipment) => equipment.equipmentType === selectedTargetType,
          ),
    [flattenedEquipments, isZoneUploadTarget, selectedTargetType],
  )
  const isUploadEquipmentEmpty =
    !isZoneUploadTarget &&
    !equipmentsQuery.isLoading &&
    !equipmentsQuery.isError &&
    uploadEquipmentOptions.length === 0

  const imageRows = useMemo(() => imagesQuery.data?.data ?? [], [imagesQuery.data])
  const jobRows = useMemo(
    () => analysisJobsQuery.data?.data.content ?? [],
    [analysisJobsQuery.data],
  )
  const selectedJob = selectedJobQuery.data?.data ?? null

  const runningImageJobIds = useMemo(
    () =>
      new Set(
        jobRows
          .filter((job) => job.imageId != null && isRunningAnalysisJob(job.jobStatus))
          .map((job) => job.imageId as number),
      ),
    [jobRows],
  )

  const singleAnalysisImages = useMemo(
    () => imageRows.filter((image) => isActiveResource(image.status)),
    [imageRows],
  )

  useEffect(() => {
    if (!inspectionQuery.data) {
      return
    }

    inspectionForm.reset({
      name: inspectionQuery.data.data.name,
      capturedAt: toDateTimeLocalInputValue(inspectionQuery.data.data.capturedAt),
      captureMethod: inspectionQuery.data.data.captureMethod,
      inspectorName: inspectionQuery.data.data.inspectorName ?? '',
      memo: inspectionQuery.data.data.memo ?? '',
    })
  }, [inspectionForm, inspectionQuery.data])

  useEffect(() => {
    const currentEquipmentId = uploadForm.getValues('equipmentId')

    if (selectedTargetType === 'ZONE') {
      if (currentEquipmentId) {
        uploadForm.setValue('equipmentId', '')
      }
      return
    }

    if (
      currentEquipmentId &&
      !uploadEquipmentOptions.some(
        (equipment) => String(equipment.equipmentId) === currentEquipmentId,
      )
    ) {
      uploadForm.setValue('equipmentId', '')
    }
  }, [selectedTargetType, uploadEquipmentOptions, uploadForm])

  useEffect(() => {
    if (!selectedJobId && jobRows[0]) {
      setSelectedJobId(jobRows[0].jobId)
    }
  }, [jobRows, selectedJobId])

  if (!inspectionId) {
    return (
      <ErrorState
        title="잘못된 점검 ID입니다."
        description="URL의 inspectionId가 올바른 숫자인지 확인해 주세요."
      />
    )
  }

  if (inspectionQuery.isLoading && !inspectionQuery.data) {
    return <LoadingState message="점검 상세를 불러오는 중입니다." />
  }

  if (inspectionQuery.isError || !inspectionQuery.data) {
    return (
      <ErrorState
        title="점검 상세를 불러오지 못했습니다."
        description={getApiErrorMessage(inspectionQuery.error)}
      />
    )
  }

  const inspection = inspectionQuery.data.data

  const handleUpdateInspection = inspectionForm.handleSubmit(async (values) => {
    const payload: UpdateInspectionRequest = {
      name: values.name.trim(),
      capturedAt: toOffsetDateTime(values.capturedAt),
      captureMethod: values.captureMethod,
      inspectorName: values.inspectorName?.trim() || null,
      memo: values.memo?.trim() || null,
    }

    try {
      const response = await updateInspectionMutation.mutateAsync(payload)
      toast.push(response.message || '점검 정보를 수정했습니다.')
      setIsEditModalOpen(false)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '점검 수정에 실패했습니다.'))
    }
  })

  const handleUploadImage = uploadForm.handleSubmit(async (values) => {
    const file = values.file?.item(0)

    if (!file) {
      return
    }

    try {
      const response = await uploadImageMutation.mutateAsync({
        inspectionId,
        equipmentId: values.targetType === 'ZONE' ? null : Number(values.equipmentId),
        targetType: values.targetType,
        imageType: values.imageType,
        capturedAt: toOffsetDateTime(values.capturedAt),
        memo: values.memo?.trim() || null,
        file,
      })

      toast.push(response.message || '이미지를 업로드했습니다.')
      uploadForm.reset({
        targetType: 'ZONE',
        equipmentId: '',
        imageType: 'RGB',
        capturedAt: '',
        memo: '',
        file: undefined,
      })
      setUploadFormVersion((current) => current + 1)
    } catch (error) {
      toast.push(
        getApiErrorMessage(
          error,
          '이미지 업로드에 실패했습니다. 중복 업로드나 대상 조건을 확인해 주세요.',
        ),
      )
    }
  })

  const handleDeactivateImage = async () => {
    if (!selectedImage) {
      return
    }

    try {
      const response = await deactivateImageMutation.mutateAsync(selectedImage.imageId)
      toast.push(response.message || '이미지를 비활성화했습니다.')
      setSelectedImage(null)
    } catch (error) {
      toast.push(getApiErrorMessage(error, '이미지 비활성화에 실패했습니다.'))
    }
  }

  const requestSingleAnalysis = async (image: ImageSummary) => {
    try {
      const response = await createAnalysisJobMutation.mutateAsync({
        imageId: image.imageId,
      })
      setSelectedJobId(response.data.jobId)
      toast.push(response.message || '분석 요청을 등록했습니다.')
    } catch (error) {
      toast.push(getApiErrorMessage(error, '분석 요청에 실패했습니다.'))
    }
  }

  const handleRefreshJobs = async () => {
    await analysisJobsQuery.refetch()
    if (selectedJobId) {
      await selectedJobQuery.refetch()
    }
  }

  const handleRetryJob = async () => {
    if (!selectedJobId) {
      return
    }

    try {
      const response = await retryAnalysisJobMutation.mutateAsync(undefined)
      toast.push(response.message || '분석 작업을 재요청했습니다.')
      await handleRefreshJobs()
    } catch (error) {
      toast.push(getApiErrorMessage(error, '분석 재요청에 실패했습니다.'))
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="점검 상세"
        description="점검 메타데이터 수정, 이미지 업로드, 단건 분석 요청과 상태 확인을 이 화면에서 처리합니다."
        actions={
          <>
            <Link className="btn btn-secondary" to="/inspections">
              목록으로
            </Link>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setIsEditModalOpen(true)}
            >
              점검 수정
            </button>
          </>
        }
      />

      <section className="panel stack-md">
        <div className="toolbar">
          <div className="stack-sm">
            <div className="inline-actions">
              <StatusBadge
                label={getInspectionStatusLabel(inspection.inspectionStatus)}
                tone={getInspectionStatusTone(inspection.inspectionStatus)}
              />
              <StatusBadge label={getCaptureMethodLabel(inspection.captureMethod)} />
            </div>
            <div>
              <h2 className="panel-title">{inspection.name}</h2>
              <p className="panel-description">
                구역 {inspection.zoneId} · 발전소 {inspection.plantId}
              </p>
            </div>
          </div>
          <div className="inline-actions">
            <Link className="btn btn-secondary" to={`/zones/${inspection.zoneId}`}>
              구역 상세
            </Link>
            {zoneQuery.data ? (
              <Link className="btn btn-secondary" to={`/plants/${zoneQuery.data.data.plantId}`}>
                발전소 상세
              </Link>
            ) : null}
          </div>
        </div>
        <div className="detail-grid">
          <DetailItem label="촬영 시각" value={formatDateTime(inspection.capturedAt)} />
          <DetailItem label="점검자" value={inspection.inspectorName || '-'} />
          <DetailItem label="메모" value={inspection.memo || '-'} />
          <DetailItem label="작성자" value={String(inspection.createdByUserId)} />
          <DetailItem label="생성 시각" value={formatDateTime(inspection.createdAt)} />
          <DetailItem label="수정 시각" value={formatDateTime(inspection.updatedAt)} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">이미지 업로드</h2>
            <p className="panel-description">
              구역 또는 설비 단위 이미지를 업로드합니다. 단건 이미지 분석 흐름만 유지합니다.
            </p>
          </div>
          <form className="stack-md" onSubmit={handleUploadImage}>
            <FormField
              label="대상 타입"
              error={uploadForm.formState.errors.targetType?.message}
            >
              <select className="input-field" {...uploadForm.register('targetType')}>
                {TARGET_TYPE_OPTIONS.map((targetType) => (
                  <option key={targetType} value={targetType}>
                    {getTargetTypeLabel(targetType)}
                  </option>
                ))}
              </select>
            </FormField>
            {isUploadEquipmentEmpty ? (
              <p className="text-sm text-amber-700">
                등록된 설비가 없습니다. 구역 상세에서 Array/Panel/Module을 먼저 등록해 주세요.
              </p>
            ) : null}
            <FormField
              label="설비 선택"
              hint={
                isZoneUploadTarget
                  ? '구역 대상 이미지는 설비를 선택하지 않습니다.'
                  : '선택한 대상 타입과 같은 설비만 표시합니다.'
              }
              error={uploadForm.formState.errors.equipmentId?.message}
            >
              <select
                className="input-field"
                {...uploadForm.register('equipmentId')}
                disabled={isZoneUploadTarget || isUploadEquipmentEmpty}
              >
                <option value="">
                  {selectedTargetType === 'ZONE'
                    ? '설비 선택 없음'
                    : '설비를 선택해 주세요.'}
                </option>
                {uploadEquipmentOptions.map((equipment) => (
                  <option key={equipment.equipmentId} value={equipment.equipmentId}>
                    {`${'· '.repeat(equipment.depth)}${equipment.name}`}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="이미지 타입"
              error={uploadForm.formState.errors.imageType?.message}
            >
              <select className="input-field" {...uploadForm.register('imageType')}>
                {IMAGE_TYPE_OPTIONS.map((imageType) => (
                  <option key={imageType} value={imageType}>
                    {getImageTypeLabel(imageType)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              label="촬영 시각"
              hint="비워 두면 backend로 null을 전달합니다."
              error={uploadForm.formState.errors.capturedAt?.message}
            >
              <input
                className="input-field"
                type="datetime-local"
                {...uploadForm.register('capturedAt')}
              />
            </FormField>
            <FormField label="메모" error={uploadForm.formState.errors.memo?.message}>
              <textarea className="input-field textarea-field" {...uploadForm.register('memo')} />
            </FormField>
            <FormField
              label="이미지 파일"
              hint="같은 inspection + targetType + equipmentId + imageType + ACTIVE 조합은 중복 업로드가 막힙니다."
              error={uploadForm.formState.errors.file?.message}
            >
              <input
                key={uploadFormVersion}
                className="input-field"
                type="file"
                accept="image/*"
                {...uploadForm.register('file')}
              />
            </FormField>
            <div className="flex justify-end">
              <button
                className="btn btn-primary"
                type="submit"
                disabled={uploadImageMutation.isPending}
              >
                이미지 업로드
              </button>
            </div>
          </form>
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">연결 상태</h2>
            <p className="panel-description">
              이미지 목록과 분석 작업은 각각 public API로 조회합니다.
            </p>
          </div>
          <div className="detail-grid">
            <DetailItem label="구역명" value={zoneQuery.data?.data.name || '-'} />
            <DetailItem label="설비 노드 수" value={String(flattenedEquipments.length)} />
            <DetailItem label="업로드 이미지 수" value={String(imageRows.length)} />
          </div>
          {equipmentsQuery.isLoading ? (
            <LoadingState message="설비 목록을 불러오는 중입니다." />
          ) : null}
          {equipmentsQuery.isError ? (
            <ErrorState
              title="설비 목록을 불러오지 못했습니다."
              description={getApiErrorMessage(equipmentsQuery.error)}
            />
          ) : null}
        </section>
      </section>

      <section className="panel stack-md">
        <div className="toolbar">
          <div>
            <h2 className="panel-title">업로드 이미지 목록</h2>
            <p className="panel-description">
              미리보기와 RGB/열화상 단건 분석 요청을 바로 실행할 수 있습니다.
            </p>
          </div>
          {imagesQuery.isLoading ? (
            <span className="text-sm text-slate-500">이미지 목록을 불러오는 중입니다.</span>
          ) : null}
        </div>

        {imagesQuery.isLoading && !imagesQuery.data ? (
          <LoadingState message="이미지 목록을 불러오는 중입니다." />
        ) : null}

        {imagesQuery.isError ? (
          <ErrorState
            title="이미지 목록을 불러오지 못했습니다."
            description={getApiErrorMessage(imagesQuery.error)}
          />
        ) : null}

        {imagesQuery.data ? (
          <DataTable
            columns={[
              {
                key: 'file',
                header: '파일',
                render: (image: ImageSummary) => (
                  <div className="stack-sm">
                    <span className="font-semibold text-slate-900">{image.originalFilename}</span>
                    <span className="text-xs text-slate-500">이미지 ID {image.imageId}</span>
                  </div>
                ),
              },
              {
                key: 'target',
                header: '대상',
                render: (image: ImageSummary) => (
                  <div className="stack-sm text-sm">
                    <span>{getTargetTypeLabel(image.targetType)}</span>
                    <span>설비 {image.equipmentId ?? '-'}</span>
                  </div>
                ),
              },
              {
                key: 'type',
                header: '유형',
                render: (image: ImageSummary) => (
                  <div className="stack-sm">
                    <StatusBadge label={getImageTypeLabel(image.imageType)} />
                    <StatusBadge
                      label={getUploadStatusLabel(image.uploadStatus)}
                      tone={getUploadStatusTone(image.uploadStatus)}
                    />
                  </div>
                ),
              },
              {
                key: 'status',
                header: '상태',
                render: (image: ImageSummary) => (
                  <StatusBadge
                    label={getResourceStatusLabel(image.status)}
                    tone={getResourceStatusTone(image.status)}
                  />
                ),
              },
              {
                key: 'capturedAt',
                header: '촬영 시각',
                render: (image: ImageSummary) => formatDateTime(image.capturedAt),
              },
              {
                key: 'actions',
                header: '동작',
                render: (image: ImageSummary) => {
                  const hasRunningJob = runningImageJobIds.has(image.imageId)
                  const canRequest = isActiveResource(image.status) && !hasRunningJob

                  return (
                    <div className="inline-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setPreviewImageId(image.imageId)}
                      >
                        미리보기
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        disabled={!canRequest || createAnalysisJobMutation.isPending}
                        onClick={() => requestSingleAnalysis(image)}
                      >
                        {image.imageType === 'RGB' ? 'RGB 분석' : '열화상 분석'}
                      </button>
                      <button
                        className="text-button text-button-danger"
                        type="button"
                        onClick={() => setSelectedImage(image)}
                      >
                        비활성화
                      </button>
                    </div>
                  )
                },
              },
            ]}
            rows={imageRows}
            rowKey={(image: ImageSummary) => image.imageId}
            emptyTitle="업로드한 이미지가 없습니다."
            emptyDescription="먼저 이미지를 업로드해 주세요."
          />
        ) : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">AI 분석 요청</h2>
            <p className="panel-description">
              활성 이미지에 대해 `imageId`만 포함한 단건 분석 요청을 전송합니다.
            </p>
          </div>

          <DataTable
            columns={[
              {
                key: 'image',
                header: '대상 이미지',
                render: (image: ImageSummary) => (
                  <div className="stack-sm">
                    <span className="font-semibold text-slate-900">{image.originalFilename}</span>
                    <span className="text-xs text-slate-500">
                      {`${getImageTypeLabel(image.imageType)} · #${image.imageId}`}
                    </span>
                  </div>
                ),
              },
              {
                key: 'target',
                header: '대상 정보',
                render: (image: ImageSummary) => (
                  <div className="stack-sm text-sm">
                    <span>{getTargetTypeLabel(image.targetType)}</span>
                    <span>설비 {image.equipmentId ?? '-'}</span>
                  </div>
                ),
              },
              {
                key: 'request',
                header: '분석 요청',
                render: (image: ImageSummary) => {
                  const hasRunningJob = runningImageJobIds.has(image.imageId)
                  const canRequest = isActiveResource(image.status) && !hasRunningJob

                  return (
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={!canRequest || createAnalysisJobMutation.isPending}
                      onClick={() => requestSingleAnalysis(image)}
                    >
                      {image.imageType === 'RGB' ? 'RGB 분석 요청' : '열화상 분석 요청'}
                    </button>
                  )
                },
              },
            ]}
            rows={singleAnalysisImages}
            rowKey={(image: ImageSummary) => image.imageId}
            emptyTitle="분석 요청 가능한 활성 이미지가 없습니다."
            emptyDescription="활성 상태의 RGB 또는 열화상 이미지를 업로드한 뒤 다시 확인해 주세요."
          />
        </section>

        <section className="panel stack-md">
          <div className="toolbar">
            <div>
              <h2 className="panel-title">분석 작업 상태</h2>
              <p className="panel-description">
                inspectionId 기준 목록을 조회하고, 실패 작업 상세와 재요청을 확인합니다.
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={handleRefreshJobs}>
              상태 새로고침
            </button>
          </div>

          {analysisJobsQuery.isLoading && !analysisJobsQuery.data ? (
            <LoadingState message="분석 작업 목록을 불러오는 중입니다." />
          ) : null}

          {analysisJobsQuery.isError ? (
            <ErrorState
              title="분석 작업 목록을 불러오지 못했습니다."
              description={getApiErrorMessage(analysisJobsQuery.error)}
            />
          ) : null}

          {analysisJobsQuery.data ? (
            <DataTable
              columns={[
                {
                  key: 'jobId',
                  header: '작업',
                  render: (job) => (
                    <div className="stack-sm">
                      <span className="font-semibold text-slate-900">{`Job #${job.jobId}`}</span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(job.requestedAt)}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: '상태',
                  render: (job) => (
                    <StatusBadge
                      label={getAnalysisJobStatusLabel(job.jobStatus)}
                      tone={getAnalysisJobStatusTone(job.jobStatus)}
                    />
                  ),
                },
                {
                  key: 'target',
                  header: '대상 ID',
                  render: (job) => <span className="text-sm">{`imageId: ${job.imageId ?? '-'}`}</span>,
                },
                {
                  key: 'actions',
                  header: '동작',
                  render: (job) => (
                    <div className="inline-actions">
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => setSelectedJobId(job.jobId)}
                      >
                        상세/실패 사유
                      </button>
                      {job.jobStatus === 'SUCCEEDED' ? (
                        <Link className="text-button" to={`/results?inspectionId=${inspectionId}`}>
                          결과 목록
                        </Link>
                      ) : null}
                      <button
                        className="text-button"
                        type="button"
                        disabled={job.jobStatus !== 'FAILED'}
                        onClick={() => setSelectedJobId(job.jobId)}
                      >
                        재요청 준비
                      </button>
                    </div>
                  ),
                },
              ]}
              rows={jobRows}
              rowKey={(job) => job.jobId}
              emptyTitle="분석 작업이 없습니다."
              emptyDescription="이미지 단건 분석을 요청하면 이 목록에 상태가 표시됩니다."
            />
          ) : null}
        </section>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">실패 사유 / 재요청</h2>
            <p className="panel-description">
              실패한 작업을 선택하면 실패 코드, 메시지, 추적 ID를 확인하고 재요청할 수 있습니다.
            </p>
          </div>

          {selectedJobId && selectedJobQuery.isLoading && !selectedJobQuery.data ? (
            <LoadingState message="작업 상세를 불러오는 중입니다." />
          ) : null}

          {selectedJobQuery.isError ? (
            <ErrorState
              title="작업 상세를 불러오지 못했습니다."
              description={getApiErrorMessage(selectedJobQuery.error)}
            />
          ) : null}

          {selectedJob ? (
            <>
              <div className="detail-grid">
                <DetailItem label="선택 작업" value={`Job #${selectedJob.jobId}`} />
                <DetailItem
                  label="입력 유형"
                  value={getAnalysisInputTypeLabel(selectedJob.inputType)}
                />
                <DetailItem
                  label="상태"
                  value={getAnalysisJobStatusLabel(selectedJob.jobStatus)}
                />
                <DetailItem label="대상 이미지" value={String(selectedJob.imageId ?? '-')} />
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="stack-sm">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      실패 코드
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedJob.failureCode ?? '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      실패 메시지
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedJob.failureMessage ?? '현재 선택한 작업에는 실패 메시지가 없습니다.'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                      추적 ID
                    </div>
                    <div className="mt-1 text-sm text-slate-900">
                      {selectedJob.traceId ?? '-'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={selectedJob.jobStatus !== 'FAILED' || retryAnalysisJobMutation.isPending}
                  onClick={handleRetryJob}
                >
                  분석 재요청
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="선택한 작업이 없습니다."
              description="분석 작업 목록에서 상세를 볼 작업을 선택해 주세요."
            />
          )}
        </section>

        <section className="panel stack-md">
          <div>
            <h2 className="panel-title">화면 안내</h2>
            <p className="panel-description">
              점검 상세에서 이미지와 분석 작업 상태를 확인하고 결과 화면으로 이동할 수 있습니다.
            </p>
          </div>
          <ul className="marker-list">
            <li>성공한 분석 작업에서는 결과 목록으로 이동해 상세 결과를 확인할 수 있습니다.</li>
            <li>현재 제품 범위는 RGB 및 열화상 단건 분석이며, 화면은 이 흐름 기준으로 동작합니다.</li>
            <li>backend가 내려주는 실패 코드와 실패 메시지는 원문 기준으로 보여 줍니다.</li>
          </ul>
        </section>
      </section>

      <EntityModal
        isOpen={isEditModalOpen}
        title="점검 수정"
        description="PATCH /api/v1/inspections/{inspectionId} 요청 규격에 맞춰 점검 메타데이터를 수정합니다."
        onClose={() => setIsEditModalOpen(false)}
      >
        <form className="stack-md" onSubmit={handleUpdateInspection}>
          <FormField label="점검명" error={inspectionForm.formState.errors.name?.message}>
            <input className="input-field" {...inspectionForm.register('name')} />
          </FormField>
          <FormField
            label="촬영 방식"
            error={inspectionForm.formState.errors.captureMethod?.message}
          >
            <select className="input-field" {...inspectionForm.register('captureMethod')}>
              {CAPTURE_METHOD_OPTIONS.map((method) => (
                <option key={method} value={method}>
                  {getCaptureMethodLabel(method)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label="촬영 시각"
            error={inspectionForm.formState.errors.capturedAt?.message}
          >
            <input
              className="input-field"
              type="datetime-local"
              {...inspectionForm.register('capturedAt')}
            />
          </FormField>
          <FormField
            label="점검자"
            error={inspectionForm.formState.errors.inspectorName?.message}
          >
            <input className="input-field" {...inspectionForm.register('inspectorName')} />
          </FormField>
          <FormField label="메모" error={inspectionForm.formState.errors.memo?.message}>
            <textarea className="input-field textarea-field" {...inspectionForm.register('memo')} />
          </FormField>
          <ModalActions
            isSubmitting={updateInspectionMutation.isPending}
            onCancel={() => setIsEditModalOpen(false)}
          />
        </form>
      </EntityModal>

      <PreviewModal
        isOpen={Boolean(previewImageId)}
        imageName={
          imageRows.find((image) => image.imageId === previewImageId)?.originalFilename ?? ''
        }
        previewUrl={previewQuery.data?.data.url}
        expiresAt={previewQuery.data?.data.expiresAt}
        isLoading={previewQuery.isLoading}
        error={previewQuery.isError ? getApiErrorMessage(previewQuery.error) : null}
        onClose={() => setPreviewImageId(null)}
      />

      <ConfirmModal
        isOpen={Boolean(selectedImage)}
        title="이미지 비활성화"
        description={
          selectedImage
            ? `${selectedImage.originalFilename} 이미지를 비활성화합니다.`
            : '선택한 이미지를 비활성화합니다.'
        }
        confirmText="비활성화"
        cancelText="취소"
        isConfirming={deactivateImageMutation.isPending}
        onConfirm={handleDeactivateImage}
        onCancel={() => setSelectedImage(null)}
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

function PreviewModal({
  isOpen,
  imageName,
  previewUrl,
  expiresAt,
  isLoading,
  error,
  onClose,
}: {
  isOpen: boolean
  imageName: string
  previewUrl?: string
  expiresAt?: string
  isLoading: boolean
  error: string | null
  onClose: () => void
}) {
  if (!isOpen) {
    return null
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="w-full max-w-4xl rounded-[1.75rem] bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="toolbar">
          <div>
            <h2 className="panel-title">이미지 미리보기</h2>
            <p className="panel-description">
              {imageName}
              {expiresAt ? ` · 만료 ${formatDateTime(expiresAt)}` : ''}
            </p>
          </div>
          <button className="btn btn-secondary" type="button" onClick={onClose}>
            닫기
          </button>
        </div>
        <div className="mt-6">
          {isLoading ? <LoadingState message="미리보기 URL을 불러오는 중입니다." /> : null}
          {error ? (
            <ErrorState title="이미지 미리보기를 불러오지 못했습니다." description={error} />
          ) : null}
          {!isLoading && !error && previewUrl ? (
            <div className="space-y-4">
              <img
                className="max-h-[70vh] w-full rounded-3xl border border-slate-200 bg-slate-50 object-contain"
                src={previewUrl}
                alt={imageName || '점검 이미지 미리보기'}
              />
              <div className="text-sm text-slate-500">
                preview API가 반환한 URL을 그대로 사용해 브라우저에서 이미지를 표시합니다.
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
