package com.pvfusion.adapter.in.web.analysis;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.analysis.AnalysisJobResponse;
import com.pvfusion.application.dto.analysis.AnalysisJobSummaryResponse;
import com.pvfusion.application.port.in.analysis.GetAnalysisJobUseCase;
import com.pvfusion.application.port.in.analysis.QueryAnalysisJobUseCase;
import com.pvfusion.application.port.in.analysis.RequestAnalysisUseCase;
import com.pvfusion.application.port.in.analysis.RetryAnalysisJobUseCase;
import com.pvfusion.domain.analysis.AnalysisInputType;
import com.pvfusion.domain.analysis.AnalysisJobStatus;
import com.pvfusion.domain.analysis.AnalysisModelType;
import com.pvfusion.domain.analysis.RequestedModelType;
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
class AnalysisJobControllerTest {

    @Mock
    private RequestAnalysisUseCase requestAnalysisUseCase;
    @Mock
    private QueryAnalysisJobUseCase queryAnalysisJobUseCase;
    @Mock
    private GetAnalysisJobUseCase getAnalysisJobUseCase;
    @Mock
    private RetryAnalysisJobUseCase retryAnalysisJobUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        validator = new LocalValidatorFactoryBean();
        validator.setProviderClass(HibernateValidator.class);
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new AnalysisJobController(
                requestAnalysisUseCase,
                queryAnalysisJobUseCase,
                getAnalysisJobUseCase,
                retryAnalysisJobUseCase
        ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("AnalysisJob 생성 성공 응답은 공통 success wrapper를 반환한다")
    void requestAnalysisReturnsCreated() throws Exception {
        when(requestAnalysisUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/analysis-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RequestAnalysisJobRequest(
                                10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, "trace"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.jobId").value(1L));
    }

    @Test
    void requestAnalysisValidationReturnsBadRequestWithErrorWrapper() throws Exception {
        mockMvc.perform(post("/api/v1/analysis-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RequestAnalysisJobRequest(
                                10L, null, null, null, "trace"
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/analysis-jobs"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());
    }

    @Test
    void requestAnalysisRejectsUnknownInputType() throws Exception {
        mockMvc.perform(post("/api/v1/analysis-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "imageId": 10,
                                  "imagePairId": null,
                                  "inputType": "UNKNOWN",
                                  "requestedModelType": "RGB_ONLY",
                                  "traceId": "trace"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/analysis-jobs"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());
    }

    @Test
    void queryAnalysisJobsReturnsOk() throws Exception {
        when(queryAnalysisJobUseCase.execute(any())).thenReturn(PageResponse.of(
                List.of(new AnalysisJobSummaryResponse(
                        1L, 100L, 20L, 30L, 10L, null, AnalysisInputType.RGB_SINGLE,
                        AnalysisModelType.RGB_ONLY, AnalysisJobStatus.QUEUED, OffsetDateTime.now(), null, null
                )),
                0, 20, 1, 1, false
        ));

        mockMvc.perform(get("/api/v1/analysis-jobs")
                        .param("inspectionId", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].jobId").value(1L));
    }

    @Test
    void getAnalysisJobReturnsOk() throws Exception {
        when(getAnalysisJobUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/analysis-jobs/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.jobId").value(1L));
    }

    @Test
    void retryAnalysisJobReturnsOk() throws Exception {
        when(retryAnalysisJobUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/analysis-jobs/1/retry")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RetryAnalysisJobRequest("trace-2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.traceId").value("trace"));
    }

    private AnalysisJobResponse sampleResponse() {
        return new AnalysisJobResponse(
                1L, 100L, 20L, 30L, 10L, null, AnalysisInputType.RGB_SINGLE,
                RequestedModelType.RGB_ONLY, AnalysisModelType.RGB_ONLY, AnalysisJobStatus.QUEUED,
                1L, OffsetDateTime.now(), null, null, null, null, OffsetDateTime.now(), OffsetDateTime.now(), "trace"
        );
    }
}
