package com.pvfusion.adapter.in.web.tracking;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pvfusion.application.dto.tracking.AreaChangeResponse;
import com.pvfusion.application.dto.tracking.DefectChangeResponse;
import com.pvfusion.application.dto.tracking.InspectionCompareResponse;
import com.pvfusion.application.dto.tracking.TrackingResponse;
import com.pvfusion.application.dto.tracking.TrackingSummaryResponse;
import com.pvfusion.application.port.in.tracking.CompareInspectionResultUseCase;
import com.pvfusion.application.port.in.tracking.QueryTrackingUseCase;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.defect.DefectType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import java.math.BigDecimal;
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
class TrackingControllerTest {

    @Mock
    private QueryTrackingUseCase queryTrackingUseCase;
    @Mock
    private CompareInspectionResultUseCase compareInspectionResultUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new TrackingController(
                queryTrackingUseCase,
                compareInspectionResultUseCase
        )).build();
    }

    @Test
    void queryTrackingReturnsOk() throws Exception {
        when(queryTrackingUseCase.execute(any())).thenReturn(new TrackingResponse(List.of(summary())));

        mockMvc.perform(get("/api/v1/tracking")
                        .param("zoneId", "10")
                        .param("targetType", "ZONE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].currentResultId").value(100L));
    }

    @Test
    void compareTrackingReturnsOk() throws Exception {
        when(compareInspectionResultUseCase.execute(any())).thenReturn(new InspectionCompareResponse(
                100L,
                90L,
                summary(),
                summary(),
                new AreaChangeResponse(BigDecimal.valueOf(0.2), BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.1)),
                new com.pvfusion.application.dto.tracking.SeverityChangeResponse(
                        BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.7), BigDecimal.valueOf(0.2), true
                ),
                new DefectChangeResponse(2, 1, 1, List.of(DefectType.HOTSPOT), List.of(), List.of(DefectType.SHADING)),
                true,
                true,
                "severity level increased"
        ));

        mockMvc.perform(get("/api/v1/tracking/compare")
                        .param("currentResultId", "100")
                        .param("previousResultId", "90"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.currentResultId").value(100L))
                .andExpect(jsonPath("$.data.defectChange.newDefectTypes[0]").value("HOTSPOT"));
    }

    private TrackingSummaryResponse summary() {
        return new TrackingSummaryResponse(
                30L, 20L, 100L, 90L, 1L, 10L, null, TargetType.ZONE,
                AnalysisInputType.RGB_SINGLE, AnalysisModelType.RGB_ONLY, 2, 1,
                BigDecimal.valueOf(0.2), BigDecimal.valueOf(0.1),
                BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.7),
                ActionCandidate.CLEANING, PriorityLevel.HIGH, SeverityLevel.HIGH, true, true, OffsetDateTime.now()
        );
    }
}
