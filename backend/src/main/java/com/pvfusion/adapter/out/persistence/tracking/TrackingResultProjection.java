package com.pvfusion.adapter.out.persistence.tracking;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public interface TrackingResultProjection {

    Long getResultId();

    Long getAnalysisJobId();

    Long getPlantId();

    Long getZoneId();

    Long getInspectionId();

    Long getEquipmentId();

    String getTargetType();

    String getInputType();

    String getModelType();

    Integer getAnomalyCount();

    BigDecimal getAreaRatio();

    BigDecimal getSeverityScore();

    String getActionCandidate();

    String getPriorityLevel();

    String getSeverityLevel();

    String getReviewStatus();

    OffsetDateTime getAnalyzedAt();
}
