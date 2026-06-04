package com.pvfusion.adapter.in.web.inspection;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.inspection.InspectionResponse;
import com.pvfusion.application.dto.inspection.InspectionSummaryResponse;
import com.pvfusion.application.port.in.inspection.CreateInspectionUseCase;
import com.pvfusion.application.port.in.inspection.GetInspectionUseCase;
import com.pvfusion.application.port.in.inspection.QueryInspectionUseCase;
import com.pvfusion.application.port.in.inspection.UpdateInspectionUseCase;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.InspectionStatus;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class InspectionControllerTest {

    @Mock
    private CreateInspectionUseCase createInspectionUseCase;
    @Mock
    private QueryInspectionUseCase queryInspectionUseCase;
    @Mock
    private GetInspectionUseCase getInspectionUseCase;
    @Mock
    private UpdateInspectionUseCase updateInspectionUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(new InspectionController(
                createInspectionUseCase,
                queryInspectionUseCase,
                getInspectionUseCase,
                updateInspectionUseCase
        )).build();
    }

    @Test
    void createInspectionReturnsCreated() throws Exception {
        when(createInspectionUseCase.execute(any())).thenReturn(sampleResponse());

        CreateInspectionRequest request = new CreateInspectionRequest(
                10L, "Inspection A", OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.DRONE, "Kim", "memo"
        );

        mockMvc.perform(post("/api/v1/inspections")
                        .header("X-Actor-User-Id", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.inspectionId").value(1L));
    }

    @Test
    void queryInspectionsReturnsOk() throws Exception {
        when(queryInspectionUseCase.execute(any())).thenReturn(PageResponse.of(
                List.of(new InspectionSummaryResponse(
                        1L, 10L, 100L, "Inspection A",
                        OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                        CaptureMethod.DRONE,
                        InspectionStatus.READY,
                        OffsetDateTime.parse("2026-06-04T10:00:00+09:00")
                )),
                0, 20, 1, 1, false
        ));

        mockMvc.perform(get("/api/v1/inspections")
                        .header("X-Actor-User-Id", 1L)
                        .param("zoneId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].inspectionId").value(1L));
    }

    @Test
    void getInspectionReturnsOk() throws Exception {
        when(getInspectionUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/inspections/1")
                        .header("X-Actor-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.inspectionId").value(1L));
    }

    @Test
    void updateInspectionReturnsOk() throws Exception {
        when(updateInspectionUseCase.execute(any())).thenReturn(sampleResponse());

        UpdateInspectionRequest request = new UpdateInspectionRequest(
                "Updated", OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.MANUAL, "Lee", "updated memo"
        );

        mockMvc.perform(patch("/api/v1/inspections/1")
                        .header("X-Actor-User-Id", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.inspectionId").value(1L));
    }

    private InspectionResponse sampleResponse() {
        return new InspectionResponse(
                1L,
                10L,
                100L,
                "Inspection A",
                OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.DRONE,
                "Kim",
                "memo",
                InspectionStatus.READY,
                1L,
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00"),
                OffsetDateTime.parse("2026-06-04T10:00:00+09:00"),
                List.of(),
                List.of(),
                List.of()
        );
    }
}
