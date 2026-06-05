package com.pvfusion.adapter.in.web.result;

import com.pvfusion.domain.result.ActionCandidate;

public record UpdateAnalysisResultRequest(
        ActionCandidate actionCandidate,
        String memo
) {
}
