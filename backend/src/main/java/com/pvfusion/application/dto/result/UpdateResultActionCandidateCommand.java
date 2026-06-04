package com.pvfusion.application.dto.result;

import com.pvfusion.domain.result.ActionCandidate;

public record UpdateResultActionCandidateCommand(
        Long actorUserId,
        Long resultId,
        ActionCandidate actionCandidate,
        String memo
) {
}
