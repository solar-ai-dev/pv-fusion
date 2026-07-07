package com.pvfusion.service.inspection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.inspection.CreateInspectionCommand;
import com.pvfusion.application.dto.inspection.GetInspectionQuery;
import com.pvfusion.application.dto.inspection.InspectionListQuery;
import com.pvfusion.application.dto.inspection.UpdateInspectionCommand;
import com.pvfusion.application.port.in.access.AccessChecker;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.inspection.LoadInspectionPort;
import com.pvfusion.application.port.out.inspection.SaveInspectionPort;
import com.pvfusion.application.port.out.inspection.UpdateInspectionPort;
import com.pvfusion.application.port.out.zone.LoadZonePort;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.Inspection;
import com.pvfusion.domain.inspection.InspectionStatus;
import com.pvfusion.domain.zone.Zone;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.ForbiddenException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InspectionServiceTest {

    @Mock
    private LoadInspectionPort loadInspectionPort;
    @Mock
    private SaveInspectionPort saveInspectionPort;
    @Mock
    private UpdateInspectionPort updateInspectionPort;
    @Mock
    private LoadZonePort loadZonePort;
    @Mock
    private AccessChecker accessChecker;
    @Mock
    private CurrentUserPort currentUserPort;

    private InspectionService inspectionService;

    @BeforeEach
    void setUp() {
        inspectionService = new InspectionService(
                loadInspectionPort,
                saveInspectionPort,
                updateInspectionPort,
                loadZonePort,
                accessChecker,
                currentUserPort
        );
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
    }

    @Test
    @DisplayName("BE-UNIT-INSP-002 capturedAt 누락 시 점검 생성은 실패한다")
    void createInspectionFailsWhenCapturedAtIsMissing() {
        CreateInspectionCommand command = new CreateInspectionCommand(
                1L,
                10L,
                "Inspection A",
                null,
                CaptureMethod.DRONE,
                "Kim",
                "memo"
        );

        assertThatThrownBy(() -> inspectionService.execute(command))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(saveInspectionPort, never()).saveInspection(any());
    }

    @Test
    @DisplayName("BE-UNIT-INSP-001 zoneId 기준으로 점검을 생성하면 READY 상태로 저장된다")
    void createInspectionSavesUsingZoneIdAndReadyStatus() {
        CreateInspectionCommand command = new CreateInspectionCommand(
                1L,
                10L,
                "Inspection A",
                OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.DRONE,
                "Kim",
                "memo"
        );
        Zone zone = new Zone(10L, 100L, "Zone A", null, null, null, 1L, null, null);
        Inspection saved = new Inspection(
                99L,
                10L,
                "Inspection A",
                command.capturedAt(),
                CaptureMethod.DRONE,
                "Kim",
                "memo",
                InspectionStatus.READY,
                1L,
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00"),
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00")
        );

        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);
        when(loadZonePort.loadZone(10L)).thenReturn(Optional.of(zone));
        when(saveInspectionPort.saveInspection(any())).thenReturn(saved);

        var response = inspectionService.execute(command);

        ArgumentCaptor<Inspection> captor = ArgumentCaptor.forClass(Inspection.class);
        verify(saveInspectionPort).saveInspection(captor.capture());
        verify(accessChecker).checkZoneAccess(1L, 10L);
        assertThat(captor.getValue().getZoneId()).isEqualTo(10L);
        assertThat(captor.getValue().getInspectionStatus()).isEqualTo(InspectionStatus.READY);
        assertThat(response.plantId()).isEqualTo(100L);
    }

    @Test
    @DisplayName("BE-UNIT-INSP-002 name이 비어 있으면 점검 생성이 실패한다")
    void createInspectionFailsWhenNameIsBlank() {
        CreateInspectionCommand command = new CreateInspectionCommand(
                1L,
                10L,
                " ",
                OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.DRONE,
                "Kim",
                "memo"
        );

        assertThatThrownBy(() -> inspectionService.execute(command))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(saveInspectionPort, never()).saveInspection(any());
    }

    @Test
    @DisplayName("BE-UNIT-INSP-002 captureMethod가 없으면 점검 생성이 실패한다")
    void createInspectionFailsWhenCaptureMethodIsMissing() {
        CreateInspectionCommand command = new CreateInspectionCommand(
                1L,
                10L,
                "Inspection A",
                OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                null,
                "Kim",
                "memo"
        );

        assertThatThrownBy(() -> inspectionService.execute(command))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.INVALID_INPUT);

        verify(saveInspectionPort, never()).saveInspection(any());
    }

    @Test
    void queryInspectionAutoScopesForNonAdmin() {
        InspectionListQuery query = new InspectionListQuery(1L, null, null, null, null, null, 0, 20);

        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(loadInspectionPort.loadInspections(any())).thenReturn(List.of());
        when(loadInspectionPort.countInspections(any())).thenReturn(0L);

        var result = inspectionService.execute(query);

        assertThat(result.content()).isEmpty();
        verify(loadInspectionPort).loadInspections(any());
    }

    @Test
    void queryInspectionChecksZoneAccessForNonAdmin() {
        Inspection inspection = new Inspection(
                1L, 10L, "A", null, CaptureMethod.MANUAL, null, null,
                InspectionStatus.READY, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );
        Zone zone = new Zone(10L, 100L, "Zone", null, null, null, 1L, null, null);
        InspectionListQuery query = new InspectionListQuery(1L, null, 10L, null, LocalDate.now(), LocalDate.now(), 0, 20);

        when(accessChecker.isAdmin(1L)).thenReturn(false);
        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(true);
        when(loadInspectionPort.loadInspections(query)).thenReturn(List.of(inspection));
        when(loadInspectionPort.countInspections(query)).thenReturn(1L);
        when(loadZonePort.loadZone(10L)).thenReturn(Optional.of(zone));

        var response = inspectionService.execute(query);

        verify(accessChecker).checkZoneAccess(1L, 10L);
        assertThat(response.content()).hasSize(1);
    }

    @Test
    void getInspectionChecksInspectionAccess() {
        Inspection inspection = new Inspection(
                7L, 10L, "A", null, CaptureMethod.MANUAL, null, null,
                InspectionStatus.READY, 1L, OffsetDateTime.now(), OffsetDateTime.now()
        );
        Zone zone = new Zone(10L, 100L, "Zone", null, null, null, 1L, null, null);

        when(accessChecker.checkInspectionAccess(1L, 7L)).thenReturn(true);
        when(loadInspectionPort.loadInspection(7L)).thenReturn(Optional.of(inspection));
        when(loadZonePort.loadZone(10L)).thenReturn(Optional.of(zone));

        inspectionService.execute(new GetInspectionQuery(1L, 7L));

        verify(accessChecker).checkInspectionAccess(1L, 7L);
    }

    @Test
    void updateInspectionChecksInspectionAccessAndPersistsMergedFields() {
        Inspection existing = new Inspection(
                7L, 10L, "Old", null, CaptureMethod.MANUAL, "Old Inspector", "Old Memo",
                InspectionStatus.READY, 1L,
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00"),
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00")
        );
        Inspection updated = new Inspection(
                7L, 10L, "New", null, CaptureMethod.DRONE, "New Inspector", "New Memo",
                InspectionStatus.READY, 1L,
                existing.getCreatedAt(),
                OffsetDateTime.parse("2026-06-04T11:00:00+09:00")
        );
        Zone zone = new Zone(10L, 100L, "Zone", null, null, null, 1L, null, null);

        when(accessChecker.checkInspectionAccess(1L, 7L)).thenReturn(true);
        when(loadInspectionPort.loadInspection(7L)).thenReturn(Optional.of(existing));
        when(loadZonePort.loadZone(10L)).thenReturn(Optional.of(zone));
        when(updateInspectionPort.updateInspection(any())).thenReturn(updated);

        inspectionService.execute(new UpdateInspectionCommand(
                1L, 7L, "New", null, CaptureMethod.DRONE, "New Inspector", "New Memo"
        ));

        ArgumentCaptor<Inspection> captor = ArgumentCaptor.forClass(Inspection.class);
        verify(accessChecker).checkInspectionAccess(1L, 7L);
        verify(updateInspectionPort).updateInspection(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("New");
        assertThat(captor.getValue().getCaptureMethod()).isEqualTo(CaptureMethod.DRONE);
    }

    @Test
    @DisplayName("BE-UNIT-INSP-003 권한 없는 사용자는 점검을 생성할 수 없다")
    void createInspectionFailsWhenZoneAccessDenied() {
        CreateInspectionCommand command = new CreateInspectionCommand(
                1L,
                10L,
                "Inspection A",
                OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.DRONE,
                "Kim",
                "memo"
        );

        when(accessChecker.checkZoneAccess(1L, 10L)).thenReturn(false);

        assertThatThrownBy(() -> inspectionService.execute(command))
                .isInstanceOf(ForbiddenException.class);

        verify(saveInspectionPort, never()).saveInspection(any());
    }

    @Test
    void getInspectionFailsWhenInspectionAccessDenied() {
        when(accessChecker.checkInspectionAccess(1L, 7L)).thenReturn(false);

        assertThatThrownBy(() -> inspectionService.execute(new GetInspectionQuery(1L, 7L)))
                .isInstanceOf(ForbiddenException.class);

        verify(loadInspectionPort, never()).loadInspection(7L);
    }

    @Test
    void updateInspectionFailsWhenInspectionAccessDenied() {
        when(accessChecker.checkInspectionAccess(1L, 7L)).thenReturn(false);

        assertThatThrownBy(() -> inspectionService.execute(new UpdateInspectionCommand(
                1L, 7L, "New", null, CaptureMethod.DRONE, "New Inspector", "New Memo"
        ))).isInstanceOf(ForbiddenException.class);

        verify(updateInspectionPort, never()).updateInspection(any());
    }
}
