package com.pvfusion.application.dto.dashboard;

import com.pvfusion.domain.result.ActionCandidate;

public record ActionStatItemResponse(
        ActionCandidate actionCandidate,
        long count
) {
}
