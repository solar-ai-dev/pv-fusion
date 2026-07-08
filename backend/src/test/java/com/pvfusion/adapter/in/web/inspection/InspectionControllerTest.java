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
import com.pvfusion.application.port.in.inspection.ManageInspectionDeletionUseCase;
import com.pvfusion.application.port.in.inspection.QueryInspectionUseCase;
import com.pvfusion.application.port.in.inspection.UpdateInspectionUseCase;
import com.pvfusion.domain.inspection.CaptureMethod;
import com.pvfusion.domain.inspection.InspectionStatus;
import com.pvfusion.global.error.BusinessException;
import com.pvfusion.global.error.ErrorCode;
import com.pvfusion.global.error.GlobalExceptionHandler;
import com.pvfusion.global.response.PageResponse;
import java.time.OffsetDateTime;
import java.util.List;
import org.hibernate.validator.HibernateValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

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
    @Mock
    private ManageInspectionDeletionUseCase manageInspectionDeletionUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        validator = new LocalValidatorFactoryBean();
        validator.setProviderClass(HibernateValidator.class);
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new InspectionController(
                createInspectionUseCase,
                queryInspectionUseCase,
                getInspectionUseCase,
                updateInspectionUseCase,
                manageInspectionDeletionUseCase
        ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("BE-UNIT-INSP-001 점검 생성 성공 응답은 공통 success wrapper를 반환한다")
    void createInspectionReturnsCreated() throws Exception {
        when(createInspectionUseCase.execute(any())).thenReturn(sampleResponse());

        CreateInspectionRequest request = new CreateInspectionRequest(
                10L, "Inspection A", OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                CaptureMethod.DRONE, "Kim", "memo"
        );

                mockMvc.perform(post("/api/v1/inspections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.inspectionId").value(1L));
    }

    @Test
    @DisplayName("BE-UNIT-INSP-002 점검 생성 입력 검증 실패는 공통 error wrapper를 반환한다")
    void createInspectionValidationReturnsBadRequestWithErrorWrapper() throws Exception {
        CreateInspectionRequest request = new CreateInspectionRequest(
                null,
                "",
                OffsetDateTime.parse("2026-06-04T09:00:00+09:00"),
                null,
                "Kim",
                "memo"
        );

        mockMvc.perform(post("/api/v1/inspections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/inspections"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());
    }

    @Test
    @DisplayName("BE-UNIT-INSP-002 capturedAt 누락은 서비스 검증 에러 wrapper를 반환한다")
    void createInspectionMissingCapturedAtReturnsBadRequestWithErrorWrapper() throws Exception {
        when(createInspectionUseCase.execute(any()))
                .thenThrow(new BusinessException(ErrorCode.INVALID_INPUT, "capturedAt is required."));

        CreateInspectionRequest request = new CreateInspectionRequest(
                10L,
                "Inspection A",
                null,
                CaptureMethod.DRONE,
                "Kim",
                "memo"
        );

        mockMvc.perform(post("/api/v1/inspections")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/inspections"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());
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
                        .param("zoneId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].inspectionId").value(1L));
    }

    @Test
    void getInspectionReturnsOk() throws Exception {
        when(getInspectionUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/inspections/1"))
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
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
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
