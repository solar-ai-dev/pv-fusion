package com.pvfusion.adapter.out.persistence.operation;

import com.pvfusion.adapter.out.persistence.user.UserJpaEntity;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.domain.operation.OperationLog;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "operation_logs")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OperationLogJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_category", nullable = false, length = 30)
    private OperationEventCategory eventCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private OperationEventType eventType;

    @Column(name = "target_table", length = 100)
    private String targetTable;

    @Column(name = "target_id")
    private Long targetId;

    @Column(name = "plant_id")
    private Long plantId;

    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "inspection_id")
    private Long inspectionId;

    @Column(name = "image_id")
    private Long imageId;

    @Column(name = "image_pair_id")
    private Long imagePairId;

    @Column(name = "analysis_job_id")
    private Long analysisJobId;

    @Column(name = "analysis_result_id")
    private Long analysisResultId;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id", insertable = false, updatable = false)
    private UserJpaEntity actorUser;

    public static OperationLogJpaEntity fromDomain(OperationLog operationLog) {
        OperationLogJpaEntity entity = new OperationLogJpaEntity();
        entity.id = operationLog.getId();
        entity.apply(operationLog);
        return entity;
    }

    public void apply(OperationLog operationLog) {
        this.actorUserId = operationLog.getActorUserId();
        this.eventCategory = operationLog.getEventCategory();
        this.eventType = operationLog.getEventType();
        this.targetTable = operationLog.getTargetTable();
        this.targetId = operationLog.getTargetId();
        this.plantId = operationLog.getPlantId();
        this.zoneId = operationLog.getZoneId();
        this.inspectionId = operationLog.getInspectionId();
        this.imageId = operationLog.getImageId();
        this.imagePairId = operationLog.getImagePairId();
        this.analysisJobId = operationLog.getAnalysisJobId();
        this.analysisResultId = operationLog.getAnalysisResultId();
        this.ipAddress = operationLog.getIpAddress();
        this.userAgent = operationLog.getUserAgent();
        this.message = operationLog.getMessage();
        this.detail = operationLog.getDetail();
        this.createdAt = operationLog.getCreatedAt();
        this.updatedAt = operationLog.getUpdatedAt();
    }

    @PrePersist
    void prePersist() {
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = createdAt;
        }
    }

    @PreUpdate
    void preUpdate() {
        if (updatedAt == null) {
            updatedAt = OffsetDateTime.now();
        }
    }
}
