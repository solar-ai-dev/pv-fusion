package com.pvfusion.adapter.in.web.zone;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.zone.ZoneResponse;
import com.pvfusion.application.dto.zone.ZoneSummaryResponse;
import com.pvfusion.application.port.in.zone.CreateZoneUseCase;
import com.pvfusion.application.port.in.zone.DeactivateZoneUseCase;
import com.pvfusion.application.port.in.zone.GetZoneUseCase;
import com.pvfusion.application.port.in.zone.ManageZoneDeletionUseCase;
import com.pvfusion.application.port.in.zone.QueryZoneUseCase;
import com.pvfusion.application.port.in.zone.UpdateZoneUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.global.error.GlobalExceptionHandler;
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
class ZoneControllerTest {

    @Mock private CreateZoneUseCase createZoneUseCase;
    @Mock private QueryZoneUseCase queryZoneUseCase;
    @Mock private GetZoneUseCase getZoneUseCase;
    @Mock private UpdateZoneUseCase updateZoneUseCase;
    @Mock private DeactivateZoneUseCase deactivateZoneUseCase;
    @Mock private ManageZoneDeletionUseCase manageZoneDeletionUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        validator = new LocalValidatorFactoryBean();
        validator.setProviderClass(HibernateValidator.class);
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new ZoneController(
                createZoneUseCase,
                queryZoneUseCase,
                getZoneUseCase,
                updateZoneUseCase,
                deactivateZoneUseCase,
                manageZoneDeletionUseCase
        ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    void getZonesReturnsOk() throws Exception {
        when(queryZoneUseCase.execute(any())).thenReturn(List.of(
                new ZoneSummaryResponse(1L, 1L, "Zone-A", 0L, 0L, null, 0L, null, null)
        ));

        mockMvc.perform(get("/api/v1/plants/1/zones"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].zoneId").value(1L));
    }

    @Test
    void createZoneReturnsCreated() throws Exception {
        when(createZoneUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/plants/1/zones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateZoneRequest("Zone-A", "North", "desc"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.zoneId").value(1L));
    }

    @Test
    @DisplayName("Zone create validation errors follow common error wrapper")
    void createZoneValidationReturnsBadRequestWithErrorWrapper() throws Exception {
        mockMvc.perform(post("/api/v1/plants/1/zones")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateZoneRequest("", "North", "desc"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/plants/1/zones"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());
    }

    @Test
    void getZoneReturnsOk() throws Exception {
        when(getZoneUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/zones/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.zoneId").value(1L));
    }

    @Test
    void updateZoneReturnsOk() throws Exception {
        when(updateZoneUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/zones/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateZoneRequest("Zone-A", "North", "desc"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.zoneId").value(1L));
    }

    @Test
    @DisplayName("Zone update validation errors follow common error wrapper")
    void updateZoneValidationReturnsBadRequestWithErrorWrapper() throws Exception {
        mockMvc.perform(patch("/api/v1/zones/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateZoneRequest(" ", "North", "desc"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/zones/1"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());
    }

    @Test
    void deactivateZoneReturnsOk() throws Exception {
        when(deactivateZoneUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/zones/1/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.zoneId").value(1L));
    }

    private ZoneResponse sampleResponse() {
        return new ZoneResponse(1L, 1L, "Zone-A", "North", "desc", ResourceStatus.ACTIVE, 1L, 0L, 0L, null, 0L, null, null, now(), now());
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
