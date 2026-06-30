package com.pvfusion.domain.inspection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class InspectionTest {

    @Test
    @DisplayName("BE-UNIT-INSP-004 allows defined inspection status transitions")
    void changeStatusAllowsConfiguredTransitions() {
        for (Transition transition : List.of(
                new Transition(InspectionStatus.READY, InspectionStatus.ANALYZING),
                new Transition(InspectionStatus.ANALYZING, InspectionStatus.COMPLETED),
                new Transition(InspectionStatus.ANALYZING, InspectionStatus.FAILED),
                new Transition(InspectionStatus.FAILED, InspectionStatus.ANALYZING)
        )) {
            Inspection inspection = inspection(transition.currentStatus());

            Inspection changed = inspection.changeStatus(transition.nextStatus());

            assertThat(changed.getInspectionStatus()).isEqualTo(transition.nextStatus());
            assertThat(changed.getId()).isEqualTo(inspection.getId());
            assertThat(changed.getCreatedByUserId()).isEqualTo(inspection.getCreatedByUserId());
            assertThat(changed.getCreatedAt()).isEqualTo(inspection.getCreatedAt());
            assertThat(changed.getUpdatedAt()).isAfterOrEqualTo(inspection.getUpdatedAt());
        }
    }

    @Test
    @DisplayName("BE-UNIT-INSP-004 rejects undefined inspection status transitions")
    void changeStatusRejectsConfiguredInvalidTransitions() {
        for (Transition transition : List.of(
                new Transition(InspectionStatus.READY, InspectionStatus.COMPLETED),
                new Transition(InspectionStatus.READY, InspectionStatus.FAILED),
                new Transition(InspectionStatus.COMPLETED, InspectionStatus.ANALYZING),
                new Transition(InspectionStatus.COMPLETED, InspectionStatus.FAILED),
                new Transition(InspectionStatus.FAILED, InspectionStatus.COMPLETED)
        )) {
            Inspection inspection = inspection(transition.currentStatus());

            assertThatThrownBy(() -> inspection.changeStatus(transition.nextStatus()))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INVALID_INPUT);
        }
    }

    private Inspection inspection(InspectionStatus status) {
        return new Inspection(
                1L,
                10L,
                "inspection",
                OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.DRONE,
                "Kim",
                "memo",
                status,
                99L,
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00"),
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00")
        );
    }

    private record Transition(InspectionStatus currentStatus, InspectionStatus nextStatus) {
    }
}
