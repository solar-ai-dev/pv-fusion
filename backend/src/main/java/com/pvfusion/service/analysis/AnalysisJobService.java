package com.pvfusion.service.analysis;

import com.pvfusion.application.dto.analysis.AnalysisJobListQuery;
import com.pvfusion.application.dto.analysis.AnalysisJobMessage;
import com.pvfusion.application.dto.analysis.AnalysisJobResponse;
import com.pvfusion.application.dto.analysis.AnalysisJobSummaryResponse;
import com.pvfusion.application.dto.analysis.GetAnalysisJobQuery;
import com.pvfusion.application.dto.analysis.RequestAnalysisCommand;
import com.pvfusion.application.dto.analysis.RetryAnalysisJobCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.in.analysis.GetAnalysisJobUseCase;
import com.pvfusion.application.port.in.analysis.QueryAnalysisJobUseCase;
import com.pvfusion.application.port.in.analysis.RequestAnalysisUseCase;
import com.pvfusion.application.port.in.analysis.RetryAnalysisJobUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.analysis.LoadAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.PublishAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.SaveAnalysisJobPort;
import com.pvfusion.application.port.out.analysis.UpdateAnalysisJobPort;
import com.pvfusion.application.port.out.image.LoadImagePort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJob;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.InspectionImage;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AnalysisJobService implements
        RequestAnalysisUseCase,
        QueryAnalysisJobUseCase,
        GetAnalysisJobUseCase,
        RetryAnalysisJobUseCase {

    private static final List<AnalysisJobStatus> ACTIVE_JOB_STATUSES = List.of(
            AnalysisJobStatus.QUEUED,
            AnalysisJobStatus.RUNNING
    );

    private final LoadAnalysisJobPort loadAnalysisJobPort;
    private final SaveAnalysisJobPort saveAnalysisJobPort;
    private final UpdateAnalysisJobPort updateAnalysisJobPort;
    private final PublishAnalysisJobPort publishAnalysisJobPort;
    private final LoadImagePort loadImagePort;
    private final LoadInspectionPort loadInspectionPort;
    private final AccessChecker accessChecker;
    private final Optional<LoadZonePort> loadZonePort;
    private final CurrentUserPort currentUserPort;

    @Override
    @Transactional
    public AnalysisJobResponse execute(RequestAnalysisCommand command) {
        Long currentUserId = requireCurrentUserId();
        AnalysisTarget target = validateTarget(currentUserId, command.imageId());
        validateDuplicateJobs(target);

        RequestedModelType requestedModelType = resolveRequestedModelType(target.imageType());
        AnalysisInputType inputType = resolveInputType(target.imageType());
        AnalysisModelType modelType = resolveModelType(target.imageType());

        AnalysisJob queued = saveAnalysisJobPort.saveAnalysisJob(new AnalysisJob(
                null,
                target.imageId(),
                inputType,
                requestedModelType,
                modelType,
                AnalysisJobStatus.QUEUED,
                currentUserId,
                OffsetDateTime.now(),
                null,
                null,
                0,
                resolveTraceId(command.traceId()),
                null,
                null,
                null,
                null
        ));

        try {
            publishAnalysisJobPort.publish(toMessage(queued));
            log.info(
                    "Analysis job queued and published. jobId={}, traceId={}, inputType={}, imageId={}, requestedModelType={}",
                    queued.getId(),
                    queued.getTraceId(),
                    queued.getInputType(),
                    queued.getImageId(),
                    queued.getRequestedModelType()
            );
            return toResponse(queued);
        } catch (BusinessException exception) {
            log.warn(
                    "Analysis job queue publish failed. jobId={}, traceId={}, inputType={}, imageId={}, errorCode={}",
                    queued.getId(),
                    queued.getTraceId(),
                    queued.getInputType(),
                    queued.getImageId(),
                    ErrorCode.QUEUE_UNAVAILABLE.getCode()
            );
            AnalysisJob failed = updateAnalysisJobPort.updateAnalysisJob(new AnalysisJob(
                    queued.getId(),
                    queued.getImageId(),
                    queued.getInputType(),
                    queued.getRequestedModelType(),
                    queued.getModelType(),
                    AnalysisJobStatus.FAILED,
                    queued.getRequestedByUserId(),
                    queued.getRequestedAt(),
                    queued.getStartedAt(),
                    queued.getCompletedAt(),
                    queued.getRetryCount(),
                    queued.getTraceId(),
                    ErrorCode.QUEUE_UNAVAILABLE.getCode(),
                    exception.getMessage(),
                    queued.getCreatedAt(),
                    queued.getUpdatedAt()
            ));
            return toResponse(failed);
        }
    }

    @Override
    public PageResponse<AnalysisJobSummaryResponse> execute(AnalysisJobListQuery query) {
        Long currentUserId = requireCurrentUserId();
        validatePage(query.page(), query.size());

        boolean admin = accessChecker.isAdmin(currentUserId);
        if (!admin && query.plantId() == null && query.zoneId() == null && query.inspectionId() == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Non-admin analysis job queries require scoped filters.");
        }
        if (query.plantId() != null) {
            ensureAllowed(accessChecker.checkPlantAccess(currentUserId, query.plantId()));
        }
        if (query.zoneId() != null) {
            ensureAllowed(accessChecker.checkZoneAccess(currentUserId, query.zoneId()));
        }
        if (query.inspectionId() != null) {
            ensureAllowed(accessChecker.checkInspectionAccess(currentUserId, query.inspectionId()));
        }

        List<AnalysisJob> jobs = loadAnalysisJobPort.loadAnalysisJobs(query);
        long totalElements = loadAnalysisJobPort.countAnalysisJobs(query);
        List<AnalysisJobSummaryResponse> content = jobs.stream().map(this::toSummaryResponse).toList();
        int totalPages = query.size() == 0 ? 0 : (int) Math.ceil((double) totalElements / query.size());
        boolean hasNext = (long) (query.page() + 1) * query.size() < totalElements;
        return PageResponse.of(content, query.page(), query.size(), totalElements, totalPages, hasNext);
    }

    @Override
    public AnalysisJobResponse execute(GetAnalysisJobQuery query) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(query.jobId(), "jobId");

        AnalysisJob job = loadAnalysisJob(query.jobId());
        validateJobAccess(currentUserId, job);
        return toResponse(job);
    }

    @Override
    @Transactional
    public AnalysisJobResponse execute(RetryAnalysisJobCommand command) {
        Long currentUserId = requireCurrentUserId();
        validateRequired(command.jobId(), "jobId");

        AnalysisJob existing = loadAnalysisJob(command.jobId());
        validateJobAccess(currentUserId, existing);
        if (existing.getJobStatus() != AnalysisJobStatus.FAILED) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Only failed jobs can be retried.");
        }

        AnalysisJob retried = updateAnalysisJobPort.updateAnalysisJob(new AnalysisJob(
                existing.getId(),
                existing.getImageId(),
                existing.getInputType(),
                existing.getRequestedModelType(),
                existing.getModelType(),
                AnalysisJobStatus.QUEUED,
                existing.getRequestedByUserId(),
                existing.getRequestedAt(),
                null,
                null,
                existing.getRetryCount() + 1,
                resolveTraceId(command.traceId()),
                null,
                null,
                existing.getCreatedAt(),
                existing.getUpdatedAt()
        ));

        try {
            publishAnalysisJobPort.publish(toMessage(retried));
            log.info(
                    "Analysis job retried and published. jobId={}, traceId={}, inputType={}, imageId={}, retryCount={}",
                    retried.getId(),
                    retried.getTraceId(),
                    retried.getInputType(),
                    retried.getImageId(),
                    retried.getRetryCount()
            );
            return toResponse(retried);
        } catch (BusinessException exception) {
            log.warn(
                    "Analysis job retry publish failed. jobId={}, traceId={}, inputType={}, imageId={}, retryCount={}, errorCode={}",
                    retried.getId(),
                    retried.getTraceId(),
                    retried.getInputType(),
                    retried.getImageId(),
                    retried.getRetryCount(),
                    ErrorCode.QUEUE_UNAVAILABLE.getCode()
            );
            AnalysisJob failed = updateAnalysisJobPort.updateAnalysisJob(new AnalysisJob(
                    retried.getId(),
                    retried.getImageId(),
                    retried.getInputType(),
                    retried.getRequestedModelType(),
                    retried.getModelType(),
                    AnalysisJobStatus.FAILED,
                    retried.getRequestedByUserId(),
                    retried.getRequestedAt(),
                    null,
                    null,
                    retried.getRetryCount(),
                    retried.getTraceId(),
                    ErrorCode.QUEUE_UNAVAILABLE.getCode(),
                    exception.getMessage(),
                    retried.getCreatedAt(),
                    retried.getUpdatedAt()
            ));
            return toResponse(failed);
        }
    }

    private AnalysisTarget validateTarget(Long actorUserId, Long imageId) {
        validateRequired(imageId, "imageId");

        InspectionImage image = loadImagePort.loadImage(imageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "Image not found: " + imageId));
        if (image.getStatus() != ResourceStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Only active images can be analyzed.");
        }
        if (image.getImageType() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "Unsupported imageType.");
        }
        ensureAllowed(accessChecker.checkImageAccess(actorUserId, image.getId()));
        return new AnalysisTarget(image.getId(), image.getInspectionId(), image.getImageType());
    }

    private AnalysisInputType resolveInputType(ImageType imageType) {
        return switch (imageType) {
            case RGB -> AnalysisInputType.RGB_SINGLE;
            case THERMAL -> AnalysisInputType.THERMAL_SINGLE;
        };
    }

    private RequestedModelType resolveRequestedModelType(ImageType imageType) {
        return switch (imageType) {
            case RGB -> RequestedModelType.RGB_ONLY;
            case THERMAL -> RequestedModelType.THERMAL_ONLY;
        };
    }

    private AnalysisModelType resolveModelType(ImageType imageType) {
        return switch (imageType) {
            case RGB -> AnalysisModelType.RGB_ONLY;
            case THERMAL -> AnalysisModelType.THERMAL_ONLY;
        };
    }

    private void validateDuplicateJobs(AnalysisTarget target) {
        boolean duplicated = !loadAnalysisJobPort.loadAnalysisJobsByImageIdAndStatuses(
                target.imageId(),
                ACTIVE_JOB_STATUSES
        ).isEmpty();
        if (duplicated) {
            throw new BusinessException(ErrorCode.ANALYSIS_JOB_ALREADY_RUNNING);
        }
    }

    private AnalysisJobMessage toMessage(AnalysisJob analysisJob) {
        return new AnalysisJobMessage(
                analysisJob.getId(),
                analysisJob.getInputType(),
                analysisJob.getImageId(),
                analysisJob.getRequestedModelType(),
                analysisJob.getRequestedByUserId(),
                analysisJob.getTraceId(),
                analysisJob.getCreatedAt()
        );
    }

    private AnalysisJobResponse toResponse(AnalysisJob analysisJob) {
        Context context = resolveContext(analysisJob);
        return new AnalysisJobResponse(
                analysisJob.getId(),
                context.plantId(),
                context.zoneId(),
                context.inspectionId(),
                analysisJob.getImageId(),
                null,
                analysisJob.getInputType(),
                analysisJob.getRequestedModelType(),
                analysisJob.getModelType(),
                analysisJob.getJobStatus(),
                analysisJob.getRequestedByUserId(),
                analysisJob.getRequestedAt(),
                analysisJob.getStartedAt(),
                analysisJob.getCompletedAt(),
                analysisJob.getFailureCode(),
                analysisJob.getFailureMessage(),
                analysisJob.getCreatedAt(),
                analysisJob.getUpdatedAt(),
                analysisJob.getTraceId()
        );
    }

    private AnalysisJobSummaryResponse toSummaryResponse(AnalysisJob analysisJob) {
        Context context = resolveContext(analysisJob);
        return new AnalysisJobSummaryResponse(
                analysisJob.getId(),
                context.plantId(),
                context.zoneId(),
                context.inspectionId(),
                analysisJob.getImageId(),
                null,
                analysisJob.getInputType(),
                analysisJob.getModelType(),
                analysisJob.getJobStatus(),
                analysisJob.getRequestedAt(),
                analysisJob.getStartedAt(),
                analysisJob.getCompletedAt()
        );
    }

    private void validateJobAccess(Long actorUserId, AnalysisJob analysisJob) {
        ensureAllowed(accessChecker.checkImageAccess(actorUserId, analysisJob.getImageId()));
    }

    private Context resolveContext(AnalysisJob analysisJob) {
        InspectionImage image = loadImagePort.loadImage(analysisJob.getImageId()).orElse(null);
        Long inspectionId = image != null ? image.getInspectionId() : null;
        if (inspectionId == null) {
            return new Context(null, null, null);
        }
        Inspection inspection = loadInspectionPort.loadInspection(inspectionId).orElse(null);
        if (inspection == null) {
            return new Context(inspectionId, null, null);
        }
        if (loadZonePort.isEmpty()) {
            return new Context(inspectionId, inspection.getZoneId(), null);
        }
        Zone zone = loadZonePort.get().loadZone(inspection.getZoneId()).orElse(null);
        return new Context(inspectionId, inspection.getZoneId(), zone != null ? zone.getPlantId() : null);
    }

    private AnalysisJob loadAnalysisJob(Long jobId) {
        return loadAnalysisJobPort.loadAnalysisJob(jobId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND, "AnalysisJob not found: " + jobId));
    }

    private String resolveTraceId(String traceId) {
        return traceId != null && !traceId.isBlank() ? traceId : UUID.randomUUID().toString();
    }

    private void ensureAllowed(boolean allowed) {
        if (!allowed) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
    }

    private Long requireCurrentUserId() {
        return currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);
    }

    private void validateRequired(Object value, String fieldName) {
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, fieldName + " is required.");
        }
    }

    private void validatePage(int page, int size) {
        if (page < 0 || size <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT, "page and size must be valid.");
        }
    }

    private record AnalysisTarget(Long imageId, Long inspectionId, ImageType imageType) {
    }

    private record Context(Long inspectionId, Long zoneId, Long plantId) {
    }
}
