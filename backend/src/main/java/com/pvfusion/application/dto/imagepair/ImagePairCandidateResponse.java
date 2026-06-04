package com.pvfusion.application.dto.imagepair;

import com.pvfusion.application.dto.image.ImageSummaryResponse;
import java.util.List;

public record ImagePairCandidateResponse(
        Long inspectionId,
        Long plantId,
        Long zoneId,
        Long equipmentId,
        List<ImageSummaryResponse> rgbCandidates,
        List<ImageSummaryResponse> thermalCandidates
) {
}
