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

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(new AnalysisJobController(
                requestAnalysisUseCase,
                queryAnalysisJobUseCase,
                getAnalysisJobUseCase,
                retryAnalysisJobUseCase
        )).build();
    }

    @Test
    void requestAnalysisReturnsCreated() throws Exception {
        when(requestAnalysisUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/analysis-jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RequestAnalysisJobRequest(
                                10L, null, AnalysisInputType.RGB_SINGLE, RequestedModelType.RGB_ONLY, "trace"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.jobId").value(1L));
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
