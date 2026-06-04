package com.pvfusion.adapter.out.persistence.inspection;

import com.pvfusion.adapter.out.persistence.common.BaseJpaEntity;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.InspectionStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "inspections")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InspectionJpaEntity extends BaseJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long zoneId;

    @Column(nullable = false, length = 150)
    private String name;

    private OffsetDateTime capturedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CaptureMethod captureMethod;

    @Column(length = 100)
    private String inspectorName;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InspectionStatus inspectionStatus;

    @Column(nullable = false)
    private Long createdByUserId;

    public InspectionJpaEntity(
            Long id,
            Long zoneId,
            String name,
            OffsetDateTime capturedAt,
            CaptureMethod captureMethod,
            String inspectorName,
            String memo,
            InspectionStatus inspectionStatus,
            Long createdByUserId
    ) {
        this.id = id;
        this.zoneId = zoneId;
        this.name = name;
        this.capturedAt = capturedAt;
        this.captureMethod = captureMethod;
        this.inspectorName = inspectorName;
        this.memo = memo;
        this.inspectionStatus = inspectionStatus;
        this.createdByUserId = createdByUserId;
    }
}
