package com.pvfusion.application.dto.result;

import com.pvfusion.domain.result.ActionCandidate;

public record UpdateResultActionCandidateCommand(
        Long actorUserId,
        Long resultId,
        ActionCandidate actionCandidate,
        String memo
) {
    public UpdateResultActionCandidateCommand(Long resultId, ActionCandidate actionCandidate, String memo) {
        this(null, resultId, actionCandidate, memo);
    }
}
