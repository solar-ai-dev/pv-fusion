package com.pvfusion.adapter.in.web.plant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.user.PlantMemberResponse;
import com.pvfusion.application.port.in.user.ChangePlantMemberRoleUseCase;
import com.pvfusion.application.port.in.user.DeactivatePlantMemberUseCase;
import com.pvfusion.application.port.in.user.GrantPlantAccessUseCase;
import com.pvfusion.application.port.in.user.QueryPlantMemberUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.plant.PlantMemberRole;
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
class PlantMemberControllerTest {

    @Mock private QueryPlantMemberUseCase queryPlantMemberUseCase;
    @Mock private GrantPlantAccessUseCase grantPlantAccessUseCase;
    @Mock private ChangePlantMemberRoleUseCase changePlantMemberRoleUseCase;
    @Mock private DeactivatePlantMemberUseCase deactivatePlantMemberUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(new PlantMemberController(
                queryPlantMemberUseCase,
                grantPlantAccessUseCase,
                changePlantMemberRoleUseCase,
                deactivatePlantMemberUseCase
        )).build();
    }

    @Test
    void getPlantMembersReturnsOk() throws Exception {
        when(queryPlantMemberUseCase.execute(any())).thenReturn(List.of(sampleResponse()));

        mockMvc.perform(get("/api/v1/plants/1/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].plantMemberId").value(1L));
    }

    @Test
    void grantPlantAccessReturnsCreated() throws Exception {
        when(grantPlantAccessUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/plants/1/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GrantPlantAccessRequest(2L, PlantMemberRole.VIEWER))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.userId").value(2L));
    }

    @Test
    void changePlantMemberRoleReturnsOk() throws Exception {
        when(changePlantMemberRoleUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/plants/1/members/2/role")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChangePlantMemberRoleRequest(PlantMemberRole.MANAGER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(2L));
    }

    @Test
    void deactivatePlantMemberReturnsOk() throws Exception {
        when(deactivatePlantMemberUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/plants/1/members/2/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userId").value(2L));
    }

    private PlantMemberResponse sampleResponse() {
        return new PlantMemberResponse(1L, 1L, 2L, PlantMemberRole.VIEWER, ResourceStatus.ACTIVE, now(), now());
    }

    private OffsetDateTime now() {
        return OffsetDateTime.parse("2026-06-06T10:00:00+09:00");
    }
}
