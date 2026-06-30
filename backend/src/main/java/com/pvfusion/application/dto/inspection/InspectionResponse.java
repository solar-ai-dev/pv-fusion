package com.pvfusion.application.dto.inspection;

import com.pvfusion.application.dto.image.ImageSummaryResponse;
import com.pvfusion.application.dto.imagepair.ImagePairSummaryResponse;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.InspectionStatus;
import java.time.OffsetDateTime;
import java.util.List;

public record InspectionResponse(
        Long inspectionId,
        Long zoneId,
        Long plantId,
        String name,
        OffsetDateTime capturedAt,
        CaptureMethod captureMethod,
        String inspectorName,
        String memo,
        InspectionStatus inspectionStatus,
        Long createdByUserId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        List<ImageSummaryResponse> images,
        List<ImagePairSummaryResponse> imagePairs,
        List<Long> analysisJobIds
) {
}
