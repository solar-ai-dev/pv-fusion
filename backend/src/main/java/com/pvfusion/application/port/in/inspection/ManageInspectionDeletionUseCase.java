package com.pvfusion.application.port.in.inspection;

import com.pvfusion.application.dto.deletion.DeleteImpactResponse;
import com.pvfusion.application.dto.deletion.DeleteResourceResponse;

public interface ManageInspectionDeletionUseCase {

    DeleteImpactResponse getInspectionDeleteImpact(Long inspectionId);

    DeleteResourceResponse deleteInspection(Long inspectionId);
}
