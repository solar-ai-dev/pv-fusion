package com.pvfusion.adapter.in.web.plant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.plant.PlantResponse;
import com.pvfusion.application.dto.plant.PlantSummaryResponse;
import com.pvfusion.application.port.in.plant.CreatePlantUseCase;
import com.pvfusion.application.port.in.plant.DeactivatePlantUseCase;
import com.pvfusion.application.port.in.plant.GetPlantUseCase;
import com.pvfusion.application.port.in.plant.QueryPlantUseCase;
import com.pvfusion.application.port.in.plant.UpdatePlantUseCase;
import com.pvfusion.domain.common.ResourceStatus;
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
class PlantControllerTest {

    @Mock private CreatePlantUseCase createPlantUseCase;
    @Mock private QueryPlantUseCase queryPlantUseCase;
    @Mock private GetPlantUseCase getPlantUseCase;
    @Mock private UpdatePlantUseCase updatePlantUseCase;
    @Mock private DeactivatePlantUseCase deactivatePlantUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(new PlantController(
                createPlantUseCase,
                queryPlantUseCase,
                getPlantUseCase,
                updatePlantUseCase,
                deactivatePlantUseCase
        )).build();
    }

    @Test
    void getPlantsReturnsOk() throws Exception {
        when(queryPlantUseCase.execute(any())).thenReturn(PageResponse.of(
                List.of(new PlantSummaryResponse(1L, "Plant", "Seoul", ResourceStatus.ACTIVE, 1L, null)),
                0, 20, 1, 1, false
        ));

        mockMvc.perform(get("/api/v1/plants"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].plantId").value(1L));
    }

    @Test
    void createPlantReturnsCreated() throws Exception {
        when(createPlantUseCase.execute(any())).thenReturn(samplePlantResponse());

        mockMvc.perform(post("/api/v1/plants")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreatePlantRequest("Plant", "Seoul", "desc"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.plantId").value(1L));
    }

    @Test
    void getPlantReturnsOk() throws Exception {
        when(getPlantUseCase.execute(any())).thenReturn(samplePlantResponse());

        mockMvc.perform(get("/api/v1/plants/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plantId").value(1L));
    }

    @Test
    void updatePlantReturnsOk() throws Exception {
        when(updatePlantUseCase.execute(any())).thenReturn(samplePlantResponse());

        mockMvc.perform(patch("/api/v1/plants/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdatePlantRequest("Plant", "Seoul", "desc"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plantId").value(1L));
    }

    @Test
    void deactivatePlantReturnsOk() throws Exception {
        when(deactivatePlantUseCase.execute(any())).thenReturn(samplePlantResponse());

        mockMvc.perform(patch("/api/v1/plants/1/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.plantId").value(1L));
    }

    private PlantResponse samplePlantResponse() {
        return new PlantResponse(1L, "Plant", "Seoul", "desc", ResourceStatus.ACTIVE, 1L, 1L, null, now(), now());
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
