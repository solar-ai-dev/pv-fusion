package com.pvfusion.application.port.out.deletion;

import com.pvfusion.application.dto.deletion.DeleteImpactCounts;
import com.pvfusion.application.dto.deletion.DeletionPlan;

public interface ResourceDeletionPort {

    DeleteImpactCounts getPlantImpact(Long plantId);

    DeleteImpactCounts getZoneImpact(Long zoneId);

    DeleteImpactCounts getInspectionImpact(Long inspectionId);

    DeleteImpactCounts getImageImpact(Long imageId);

    DeletionPlan deletePlant(Long plantId);

    DeletionPlan deleteZone(Long zoneId);

    DeletionPlan deleteInspection(Long inspectionId);

    DeletionPlan deleteImage(Long imageId);
}
