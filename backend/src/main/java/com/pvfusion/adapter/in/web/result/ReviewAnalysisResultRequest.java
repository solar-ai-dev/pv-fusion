package com.pvfusion.adapter.in.web.result;

import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.review.ReviewStatus;

public record ReviewAnalysisResultRequest(
        ReviewStatus reviewStatus,
        ActionCandidate actionCandidate,
        String memo
) {
}
