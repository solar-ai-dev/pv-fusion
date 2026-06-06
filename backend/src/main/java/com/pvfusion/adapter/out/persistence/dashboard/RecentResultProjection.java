package com.pvfusion.adapter.out.persistence.dashboard;

import java.time.OffsetDateTime;

public interface RecentResultProjection {

    Long getResultId();

    Long getInspectionId();

    Long getPlantId();

    Long getZoneId();

    Long getEquipmentId();

    String getPlantName();

    String getZoneName();

    String getInspectionName();

    String getActionCandidate();

    String getSeverityLevel();

    String getPriorityLevel();

    OffsetDateTime getAnalyzedAt();
}
