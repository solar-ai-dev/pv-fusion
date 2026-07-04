package com.pvfusion.application.port.in.plant;

import com.pvfusion.application.dto.deletion.DeleteImpactResponse;
import com.pvfusion.application.dto.deletion.DeleteResourceResponse;

public interface ManagePlantDeletionUseCase {

    DeleteImpactResponse getPlantDeleteImpact(Long plantId);

    DeleteResourceResponse deletePlant(Long plantId);
}
