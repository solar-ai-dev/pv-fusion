package com.pvfusion.adapter.in.web.result;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.result.AnalysisResultResponse;
import com.pvfusion.application.dto.result.AnalysisResultSummaryResponse;
import com.pvfusion.application.dto.result.ModelInfoResponse;
import com.pvfusion.application.dto.result.ResultVisualizationResponse;
import com.pvfusion.application.port.in.result.GetAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.GetResultVisualizationUseCase;
import com.pvfusion.application.port.in.result.QueryAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.SaveAnalysisResultUseCase;
import com.pvfusion.application.port.in.result.UpdateResultActionCandidateUseCase;
import com.pvfusion.application.port.in.review.ChangeResultReviewStatusUseCase;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.result.ActionCandidate;
import com.pvfusion.domain.result.AnalysisResultStatus;
import com.pvfusion.domain.result.PriorityLevel;
import com.pvfusion.domain.result.SeverityLevel;
import com.pvfusion.domain.review.ReviewStatus;
import com.pvfusion.global.error.GlobalExceptionHandler;
import com.pvfusion.global.response.PageResponse;
import java.math.BigDecimal;
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
class AnalysisResultControllerTest {

    @Mock
    private SaveAnalysisResultUseCase saveAnalysisResultUseCase;
    @Mock
    private QueryAnalysisResultUseCase queryAnalysisResultUseCase;
    @Mock
    private GetAnalysisResultUseCase getAnalysisResultUseCase;
    @Mock
    private UpdateResultActionCandidateUseCase updateResultActionCandidateUseCase;
    @Mock
    private ChangeResultReviewStatusUseCase changeResultReviewStatusUseCase;
    @Mock
    private GetResultVisualizationUseCase getResultVisualizationUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        validator = new LocalValidatorFactoryBean();
        validator.setProviderClass(HibernateValidator.class);
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new AnalysisResultController(
                saveAnalysisResultUseCase,
                queryAnalysisResultUseCase,
                getAnalysisResultUseCase,
                updateResultActionCandidateUseCase,
                changeResultReviewStatusUseCase,
                getResultVisualizationUseCase
        ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("결과 저장 성공 응답은 공통 success wrapper를 반환한다")
    void saveAnalysisResultReturnsCreated() throws Exception {
        when(saveAnalysisResultUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/analysis-results")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new SaveAnalysisResultRequest(
                                10L, "model-a", "1.0", "onnx", "cpu", 640, BigDecimal.valueOf(0.75),
                                AnalysisResultStatus.ANOMALY, 2, BigDecimal.valueOf(0.9), BigDecimal.valueOf(0.1),
                                BigDecimal.valueOf(0.8), SeverityLevel.HIGH, ActionCandidate.CLEANING, PriorityLevel.HIGH,
                                "bucket", "bbox-key", null, null, null, null, null, null, null, OffsetDateTime.now(), List.of()
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.resultId").value(1L));
    }

    @Test
    void queryAnalysisResultsReturnsOk() throws Exception {
        when(queryAnalysisResultUseCase.execute(any())).thenReturn(PageResponse.of(
                List.of(new AnalysisResultSummaryResponse(
                        1L, 10L, 100L, 20L, 30L, TargetType.ZONE, null, AnalysisInputType.RGB_SINGLE,
                        AnalysisModelType.RGB_ONLY, AnalysisJobStatus.SUCCEEDED, AnalysisResultStatus.ANOMALY,
                        2, BigDecimal.valueOf(0.8), SeverityLevel.HIGH, ActionCandidate.CLEANING, PriorityLevel.HIGH,
                        ReviewStatus.UNCHECKED, OffsetDateTime.now()
                )),
                0, 20, 1, 1, false
        ));

        mockMvc.perform(get("/api/v1/analysis-results")
                        .param("inspectionId", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].resultId").value(1L));
    }

    @Test
    void getAnalysisResultReturnsOk() throws Exception {
        when(getAnalysisResultUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/analysis-results/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultId").value(1L));
    }

    @Test
    void updateAnalysisResultReturnsOk() throws Exception {
        when(updateResultActionCandidateUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/analysis-results/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateAnalysisResultRequest(ActionCandidate.RETAKE, "memo"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultId").value(1L));
    }

    @Test
    void reviewAnalysisResultReturnsOk() throws Exception {
        when(changeResultReviewStatusUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/analysis-results/1/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ReviewAnalysisResultRequest(
                                ReviewStatus.CONFIRMED, ActionCandidate.FIELD_INSPECTION, "checked"
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultId").value(1L));
    }

    @Test
    void getVisualizationReturnsOk() throws Exception {
        when(getResultVisualizationUseCase.execute(any())).thenReturn(new ResultVisualizationResponse(
                "bbox", "https://example.com/file", OffsetDateTime.now().plusMinutes(5)
        ));

        mockMvc.perform(get("/api/v1/analysis-results/1/visualization")
                        .param("type", "bbox"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.type").value("bbox"));
    }

    @Test
    void queryAnalysisResultsRejectsUnknownReviewStatus() throws Exception {
        mockMvc.perform(get("/api/v1/analysis-results")
                        .param("inspectionId", "30")
                        .param("reviewStatus", "UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/analysis-results"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());

        org.mockito.Mockito.verify(queryAnalysisResultUseCase, never()).execute(any());
    }

    @Test
    void reviewAnalysisResultRejectsUnknownReviewStatus() throws Exception {
        mockMvc.perform(patch("/api/v1/analysis-results/1/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "reviewStatus": "UNKNOWN",
                                  "actionCandidate": "FIELD_INSPECTION",
                                  "memo": "checked"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/analysis-results/1/review"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());

        org.mockito.Mockito.verify(changeResultReviewStatusUseCase, never()).execute(any());
    }

    @Test
    void updateAnalysisResultRejectsUnknownActionCandidate() throws Exception {
        mockMvc.perform(patch("/api/v1/analysis-results/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "actionCandidate": "UNKNOWN",
                                  "memo": "memo"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/analysis-results/1"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());

        org.mockito.Mockito.verify(updateResultActionCandidateUseCase, never()).execute(any());
    }

    private AnalysisResultResponse sampleResponse() {
        return new AnalysisResultResponse(
                1L, 10L, 100L, 20L, 30L, 40L, TargetType.ZONE, null, AnalysisInputType.RGB_SINGLE,
                AnalysisModelType.RGB_ONLY, AnalysisResultStatus.ANOMALY, 2, BigDecimal.valueOf(0.9),
                BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.8), SeverityLevel.HIGH, ActionCandidate.CLEANING,
                PriorityLevel.HIGH, ReviewStatus.UNCHECKED, null, null, null, null, null, null, null, null, null,
                OffsetDateTime.now(), OffsetDateTime.now(), OffsetDateTime.now(), List.of(), List.of(), null, null, null,
                new ModelInfoResponse("model-a", "1.0", "onnx", "cpu", 640, BigDecimal.valueOf(0.75))
        );
    }
}
