package com.pvfusion.application.port.in.zone;

import com.pvfusion.application.dto.deletion.DeleteImpactResponse;
import com.pvfusion.application.dto.deletion.DeleteResourceResponse;

public interface ManageZoneDeletionUseCase {

    DeleteImpactResponse getZoneDeleteImpact(Long zoneId);

    DeleteResourceResponse deleteZone(Long zoneId);
}
