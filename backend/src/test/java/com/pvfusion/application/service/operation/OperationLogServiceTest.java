package com.pvfusion.application.service.operation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.pvfusion.application.dto.operation.OperationLogQuery;
import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.application.dto.operation.RecordOperationLogCommand;
import com.pvfusion.application.port.out.auth.CurrentUserPort;
import com.pvfusion.application.port.out.operation.OperationLogRepositoryPort;
import com.pvfusion.application.port.out.user.UserRepositoryPort;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.domain.operation.OperationLog;
import com.pvfusion.domain.user.AccountStatus;
import com.pvfusion.domain.user.User;
import com.pvfusion.domain.user.UserRole;
import com.pvfusion.global.error.ApprovalRequiredException;
import com.pvfusion.global.error.ForbiddenException;
import com.pvfusion.global.error.UnauthorizedException;
import com.pvfusion.global.error.UserDeactivatedException;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class OperationLogServiceTest {

    @Mock
    private OperationLogRepositoryPort operationLogRepositoryPort;
    @Mock
    private CurrentUserPort currentUserPort;
    @Mock
    private UserRepositoryPort userRepositoryPort;

    private OperationLogService operationLogService;

    @BeforeEach
    void setUp() {
        operationLogService = new OperationLogService(
                operationLogRepositoryPort,
                currentUserPort,
                userRepositoryPort
        );
    }

    @Test
    void recordsOperationLog() {
        RecordOperationLogCommand command = new RecordOperationLogCommand(
                999L,
                OperationEventCategory.ADMIN,
                OperationEventType.PLANT_CREATED,
                "plants",
                10L,
                10L,
                null,
                null,
                null,
                null,
                null,
                null,
                "Plant created.",
                null,
                null,
                "name=Plant-A"
        );
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(operationLogRepositoryPort.save(any(OperationLog.class))).thenAnswer(invocation -> {
            OperationLog log = invocation.getArgument(0);
            return new OperationLog(
                    100L,
                    log.getActorUserId(),
                    log.getEventCategory(),
                    log.getEventType(),
                    log.getTargetTable(),
                    log.getTargetId(),
                    log.getPlantId(),
                    log.getZoneId(),
                    log.getInspectionId(),
                    log.getImageId(),
                    log.getImagePairId(),
                    log.getAnalysisJobId(),
                    log.getAnalysisResultId(),
                    log.getIpAddress(),
                    log.getUserAgent(),
                    log.getMessage(),
                    log.getDetail(),
                    now(),
                    now()
            );
        });
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.APPROVED)));

        var response = operationLogService.execute(command);

        assertThat(response.operationLogId()).isEqualTo(100L);
        assertThat(response.actorEmail()).isEqualTo("user1@example.com");
        assertThat(response.eventType()).isEqualTo(OperationEventType.PLANT_CREATED);

        ArgumentCaptor<OperationLog> captor = ArgumentCaptor.forClass(OperationLog.class);
        verify(operationLogRepositoryPort).save(captor.capture());
        assertThat(captor.getValue().getActorUserId()).isEqualTo(1L);
        assertThat(captor.getValue().getDetail()).isEqualTo("name=Plant-A");
    }

    @Test
    void queriesOperationLogsForApprovedAdmin() {
        User admin = user(1L, UserRole.ADMIN, AccountStatus.APPROVED);
        PageResponse<OperationLogSummaryResponse> page = PageResponse.of(
                List.of(new OperationLogSummaryResponse(
                        100L,
                        1L,
                        "user1@example.com",
                        "ADMIN",
                        OperationEventCategory.ADMIN,
                        OperationEventType.PLANT_CREATED,
                        "plants",
                        10L,
                        "Plant created.",
                        now()
                )),
                0,
                20,
                1,
                1,
                false
        );

        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(admin));
        when(operationLogRepositoryPort.findAll(any(OperationLogQuery.class))).thenReturn(page);

        var response = operationLogService.execute(new OperationLogQuery(
                null,
                null,
                OperationEventCategory.ADMIN,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "plant",
                0,
                20,
                null
        ));

        assertThat(response.totalElements()).isEqualTo(1);
        ArgumentCaptor<OperationLogQuery> captor = ArgumentCaptor.forClass(OperationLogQuery.class);
        verify(operationLogRepositoryPort).findAll(captor.capture());
        assertThat(captor.getValue().requestedByUserId()).isEqualTo(1L);
    }

    @Test
    void rejectsQueryWhenUnauthenticated() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.empty());

        assertThatThrownBy(() -> operationLogService.execute(emptyQuery()))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void rejectsQueryWhenPendingAdmin() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.PENDING)));

        assertThatThrownBy(() -> operationLogService.execute(emptyQuery()))
                .isInstanceOf(ApprovalRequiredException.class);
    }

    @Test
    void rejectsQueryWhenInactiveAdmin() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.ADMIN, AccountStatus.INACTIVE)));

        assertThatThrownBy(() -> operationLogService.execute(emptyQuery()))
                .isInstanceOf(UserDeactivatedException.class);
    }

    @Test
    void rejectsQueryWhenUserIsNotAdmin() {
        when(currentUserPort.getCurrentUserId()).thenReturn(Optional.of(1L));
        when(userRepositoryPort.findById(1L)).thenReturn(Optional.of(user(1L, UserRole.USER, AccountStatus.APPROVED)));

        assertThatThrownBy(() -> operationLogService.execute(emptyQuery()))
                .isInstanceOf(ForbiddenException.class);
    }

    private OperationLogQuery emptyQuery() {
        return new OperationLogQuery(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                0,
                20,
                null
        );
    }

    private User user(Long id, UserRole role, AccountStatus status) {
        OffsetDateTime now = now();
        return new User(
                id,
                "user" + id + "@example.com",
                "User " + id,
                "GOOGLE",
                "google-" + id,
                role,
                status,
                now.minusDays(1),
                now.minusDays(10),
                now.minusDays(1)
        );
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
