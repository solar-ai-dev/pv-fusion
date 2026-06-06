package com.pvfusion.adapter.in.web.dashboard;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pvfusion.application.dto.dashboard.ActionStatItemResponse;
import com.pvfusion.application.dto.dashboard.ActionStatsResponse;
import com.pvfusion.application.dto.dashboard.DashboardResponse;
import com.pvfusion.application.dto.dashboard.DashboardSummaryResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendPointResponse;
import com.pvfusion.application.dto.dashboard.DashboardTrendResponse;
import com.pvfusion.application.dto.dashboard.RecentInspectionResultResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatItemResponse;
import com.pvfusion.application.dto.dashboard.SeverityStatsResponse;
import com.pvfusion.application.port.in.dashboard.GetActionStatsUseCase;
import com.pvfusion.application.port.in.dashboard.GetDashboardTrendUseCase;
import com.pvfusion.application.port.in.dashboard.GetDashboardUseCase;
import com.pvfusion.application.port.in.dashboard.GetSeverityStatsUseCase;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class DashboardControllerTest {

    @Mock
    private GetDashboardUseCase getDashboardUseCase;
    @Mock
    private GetActionStatsUseCase getActionStatsUseCase;
    @Mock
    private GetSeverityStatsUseCase getSeverityStatsUseCase;
    @Mock
    private GetDashboardTrendUseCase getDashboardTrendUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new DashboardController(
                getDashboardUseCase,
                getActionStatsUseCase,
                getSeverityStatsUseCase,
                getDashboardTrendUseCase
        )).build();
    }

    @Test
    void getDashboardReturnsOk() throws Exception {
        when(getDashboardUseCase.execute(any())).thenReturn(new DashboardResponse(
                new DashboardSummaryResponse(1, 1, 3, 1, 2, 10, 4, 7, 1, 1, 4, 1, 6, 2, 3, 1, 2, 3, 2, 1, 1),
                List.of(new RecentInspectionResultResponse(
                        100L, 30L, 1L, 10L, null, "plant", "zone", "inspection",
                        ActionCandidate.CLEANING, SeverityLevel.HIGH, PriorityLevel.HIGH, OffsetDateTime.now()
                )),
                List.of()
        ));

        mockMvc.perform(get("/api/v1/dashboard")
                        .header("X-Actor-User-Id", 1L)
                        .param("zoneId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.summary.totalInspectionCount").value(3));
    }

    @Test
    void getActionStatsReturnsOk() throws Exception {
        when(getActionStatsUseCase.execute(any())).thenReturn(new ActionStatsResponse(
                List.of(new ActionStatItemResponse(ActionCandidate.CLEANING, 2))
        ));

        mockMvc.perform(get("/api/v1/dashboard/action-stats")
                        .header("X-Actor-User-Id", 1L)
                        .param("zoneId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].actionCandidate").value("CLEANING"));
    }

    @Test
    void getSeverityStatsReturnsOk() throws Exception {
        when(getSeverityStatsUseCase.execute(any())).thenReturn(new SeverityStatsResponse(
                List.of(new SeverityStatItemResponse(SeverityLevel.HIGH, 2))
        ));

        mockMvc.perform(get("/api/v1/dashboard/severity-stats")
                        .header("X-Actor-User-Id", 1L)
                        .param("zoneId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].severityLevel").value("HIGH"));
    }

    @Test
    void getTrendsReturnsOk() throws Exception {
        when(getDashboardTrendUseCase.execute(any())).thenReturn(new DashboardTrendResponse(
                "DAILY",
                List.of(new DashboardTrendPointResponse(LocalDate.of(2026, 6, 1), 2, 1))
        ));

        mockMvc.perform(get("/api/v1/dashboard/trends")
                        .header("X-Actor-User-Id", 1L)
                        .param("zoneId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.points[0].inspectionCount").value(2));
    }
}
