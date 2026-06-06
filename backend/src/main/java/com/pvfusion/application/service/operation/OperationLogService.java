package com.pvfusion.application.service.operation;

import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.application.dto.operation.OperationLogResponse;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.application.dto.operation.RecordOperationLogCommand;
import com.pvfusion.application.port.in.operation.QueryOperationLogUseCase;
import com.pvfusion.application.port.in.operation.RecordOperationLogUseCase;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.operation.OperationLogRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.operation.OperationLog;
import com.pvfusion.domain.user.User;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import com.pvfusion.global.response.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OperationLogService implements RecordOperationLogUseCase, QueryOperationLogUseCase {

    private final OperationLogRepositoryPort operationLogRepositoryPort;
    private final CurrentUserPort currentUserPort;
    private final UserRepositoryPort userRepositoryPort;

    @Override
    public OperationLogResponse execute(RecordOperationLogCommand command) {
        Long currentUserId = currentUserPort.getCurrentUserId().orElse(null);

        OperationLog saved = operationLogRepositoryPort.save(new OperationLog(
                null,
                currentUserId,
                command.eventCategory(),
                command.eventType(),
                command.targetTable(),
                command.targetId(),
                command.plantId(),
                command.zoneId(),
                command.inspectionId(),
                command.imageId(),
                command.imagePairId(),
                command.analysisJobId(),
                command.analysisResultId(),
                command.ipAddress(),
                command.userAgent(),
                command.message(),
                command.detail(),
                null,
                null
        ));

        User actor = saved.getActorUserId() == null
                ? null
                : userRepositoryPort.findById(saved.getActorUserId()).orElse(null);

        return toResponse(saved, actor);
    }

    @Override
    public PageResponse<OperationLogSummaryResponse> execute(OperationLogQuery query) {
        User adminUser = requireApprovedAdmin();

        return operationLogRepositoryPort.findAll(new OperationLogQuery(
                query.actorUserId(),
                adminUser.getId(),
                query.eventCategory(),
                query.eventType(),
                query.plantId(),
                query.zoneId(),
                query.inspectionId(),
                query.imageId(),
                query.imagePairId(),
                query.analysisJobId(),
                query.analysisResultId(),
                query.from(),
                query.to(),
                query.keyword(),
                query.page(),
                query.size(),
                query.sort()
        ));
    }

    private User requireApprovedAdmin() {
        Long currentUserId = currentUserPort.getCurrentUserId()
                .orElseThrow(UnauthorizedException::new);

        User currentUser = userRepositoryPort.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("Current authenticated user was not found."));

        if (currentUser.isInactive()) {
            throw new UserDeactivatedException();
        }
        if (currentUser.isPending()) {
            throw new ApprovalRequiredException();
        }
        if (!currentUser.isAdmin()) {
            throw new ForbiddenException("Only admins can access operation logs.");
        }

        return currentUser;
    }

    private OperationLogResponse toResponse(OperationLog operationLog, User actor) {
        return new OperationLogResponse(
                operationLog.getId(),
                operationLog.getActorUserId(),
                actor != null ? actor.getEmail() : null,
                actor != null && actor.getRole() != null ? actor.getRole().name() : null,
                operationLog.getEventCategory(),
                operationLog.getEventType(),
                operationLog.getTargetTable(),
                operationLog.getTargetId(),
                operationLog.getPlantId(),
                operationLog.getZoneId(),
                operationLog.getInspectionId(),
                operationLog.getImageId(),
                operationLog.getImagePairId(),
                operationLog.getAnalysisJobId(),
                operationLog.getAnalysisResultId(),
                operationLog.getMessage(),
                operationLog.getIpAddress(),
                operationLog.getUserAgent(),
                operationLog.getDetail(),
                operationLog.getCreatedAt()
        );
    }
}
