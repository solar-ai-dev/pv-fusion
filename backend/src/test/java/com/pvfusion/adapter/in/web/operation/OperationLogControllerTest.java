package com.pvfusion.adapter.in.web.operation;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pvfusion.application.dto.operation.OperationLogSummaryResponse;
import com.pvfusion.application.port.in.operation.QueryOperationLogUseCase;
import com.pvfusion.domain.operation.OperationEventCategory;
import com.pvfusion.domain.operation.OperationEventType;
import com.pvfusion.global.response.PageResponse;
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
class OperationLogControllerTest {

    @Mock private QueryOperationLogUseCase queryOperationLogUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new OperationLogController(queryOperationLogUseCase)).build();
    }

    @Test
    void getOperationLogsReturnsOk() throws Exception {
        when(queryOperationLogUseCase.execute(any())).thenReturn(PageResponse.of(
                List.of(new OperationLogSummaryResponse(
                        1L, 1L, "admin@example.com", "ADMIN", OperationEventCategory.ADMIN,
                        OperationEventType.PLANT_CREATED, "plants", 1L, "Plant created.", now()
                )),
                0, 20, 1, 1, false
        ));

        mockMvc.perform(get("/api/v1/admin/operation-logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].operationLogId").value(1L));
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
