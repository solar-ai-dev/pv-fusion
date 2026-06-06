package com.pvfusion.adapter.in.web.equipment;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.equipment.EquipmentResponse;
import com.pvfusion.application.dto.equipment.EquipmentTreeResponse;
import com.pvfusion.application.port.in.equipment.CreateEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.DeactivateEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.GetEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.QueryEquipmentUseCase;
import com.pvfusion.application.port.in.equipment.UpdateEquipmentUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.equipment.EquipmentType;
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
class EquipmentControllerTest {

    @Mock private CreateEquipmentUseCase createEquipmentUseCase;
    @Mock private QueryEquipmentUseCase queryEquipmentUseCase;
    @Mock private GetEquipmentUseCase getEquipmentUseCase;
    @Mock private UpdateEquipmentUseCase updateEquipmentUseCase;
    @Mock private DeactivateEquipmentUseCase deactivateEquipmentUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(new EquipmentController(
                createEquipmentUseCase,
                queryEquipmentUseCase,
                getEquipmentUseCase,
                updateEquipmentUseCase,
                deactivateEquipmentUseCase
        )).build();
    }

    @Test
    void getEquipmentsReturnsOk() throws Exception {
        when(queryEquipmentUseCase.execute(any())).thenReturn(List.of(
                new EquipmentTreeResponse(1L, 1L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE, List.of())
        ));

        mockMvc.perform(get("/api/v1/zones/1/equipments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].equipmentId").value(1L));
    }

    @Test
    void createEquipmentReturnsCreated() throws Exception {
        when(createEquipmentUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/zones/1/equipments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateEquipmentRequest(null, EquipmentType.ARRAY, "Array-01", "A01"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.equipmentId").value(1L));
    }

    @Test
    void getEquipmentReturnsOk() throws Exception {
        when(getEquipmentUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/equipments/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.equipmentId").value(1L));
    }

    @Test
    void updateEquipmentReturnsOk() throws Exception {
        when(updateEquipmentUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/equipments/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateEquipmentRequest(null, EquipmentType.ARRAY, "Array-01", "A01"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.equipmentId").value(1L));
    }

    @Test
    void deactivateEquipmentReturnsOk() throws Exception {
        when(deactivateEquipmentUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/equipments/1/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.equipmentId").value(1L));
    }

    private EquipmentResponse sampleResponse() {
        return new EquipmentResponse(1L, 1L, null, EquipmentType.ARRAY, "Array-01", "A01", ResourceStatus.ACTIVE, 1L, now(), now());
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
