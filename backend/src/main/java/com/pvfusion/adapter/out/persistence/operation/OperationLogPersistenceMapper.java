package com.pvfusion.adapter.out.persistence.operation;

import com.pvfusion.adapter.out.persistence.user.UserJpaEntity;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.domain.operation.OperationLog;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class OperationLogPersistenceMapper {

    public OperationLog toDomain(OperationLogJpaEntity entity) {
        return new OperationLog(
                entity.getId(),
                entity.getActorUserId(),
                entity.getEventCategory(),
                entity.getEventType(),
                entity.getTargetTable(),
                entity.getTargetId(),
                entity.getPlantId(),
                entity.getZoneId(),
                entity.getInspectionId(),
                entity.getImageId(),
                entity.getImagePairId(),
                entity.getAnalysisJobId(),
                entity.getAnalysisResultId(),
                entity.getIpAddress(),
                entity.getUserAgent(),
                entity.getMessage(),
                entity.getDetail(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public OperationLogJpaEntity toEntity(OperationLog operationLog) {
        return OperationLogJpaEntity.fromDomain(operationLog);
    }

    public OperationLogJpaEntity updateEntity(OperationLog operationLog, OperationLogJpaEntity entity) {
        entity.apply(operationLog);
        return entity;
    }

    public OperationLogSummaryResponse toSummaryResponse(OperationLogJpaEntity entity, Map<Long, UserJpaEntity> actorUsers) {
        UserJpaEntity actorUser = entity.getActorUserId() == null ? null : actorUsers.get(entity.getActorUserId());
        return new OperationLogSummaryResponse(
                entity.getId(),
                entity.getActorUserId(),
                actorUser != null ? actorUser.getEmail() : null,
                actorUser != null && actorUser.getRole() != null
                        ? actorUser.getRole().name()
                        : null,
                entity.getEventCategory(),
                entity.getEventType(),
                entity.getTargetTable(),
                entity.getTargetId(),
                entity.getMessage(),
                entity.getCreatedAt()
        );
    }
}
