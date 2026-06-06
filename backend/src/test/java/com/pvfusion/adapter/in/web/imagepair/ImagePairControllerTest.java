package com.pvfusion.adapter.in.web.imagepair;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pvfusion.application.dto.imagepair.ImagePairCandidateResponse;
import com.pvfusion.application.dto.imagepair.ImagePairResponse;
import com.pvfusion.application.port.in.imagepair.CreateImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.DeactivateImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.GetImagePairUseCase;
import com.pvfusion.application.port.in.imagepair.QueryImagePairCandidateUseCase;
import com.pvfusion.application.port.in.imagepair.UpdateImagePairUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
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
class ImagePairControllerTest {

    @Mock
    private QueryImagePairCandidateUseCase queryImagePairCandidateUseCase;
    @Mock
    private CreateImagePairUseCase createImagePairUseCase;
    @Mock
    private GetImagePairUseCase getImagePairUseCase;
    @Mock
    private UpdateImagePairUseCase updateImagePairUseCase;
    @Mock
    private DeactivateImagePairUseCase deactivateImagePairUseCase;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();
        mockMvc = MockMvcBuilders.standaloneSetup(new ImagePairController(
                queryImagePairCandidateUseCase,
                createImagePairUseCase,
                getImagePairUseCase,
                updateImagePairUseCase,
                deactivateImagePairUseCase
        )).build();
    }

    @Test
    void getCandidatesReturnsOk() throws Exception {
        when(queryImagePairCandidateUseCase.execute(any())).thenReturn(new ImagePairCandidateResponse(
                10L, 100L, 20L, null, List.of(), List.of()
        ));

        mockMvc.perform(get("/api/v1/image-pairs/candidates")
                        .param("inspectionId", "10")
                        .param("targetType", "ZONE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.inspectionId").value(10L));
    }

    @Test
    void createImagePairReturnsCreated() throws Exception {
        when(createImagePairUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(post("/api/v1/image-pairs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateImagePairRequest(100L, 101L))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.imagePairId").value(1L));
    }

    @Test
    void getImagePairReturnsOk() throws Exception {
        when(getImagePairUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(get("/api/v1/image-pairs/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imagePairId").value(1L));
    }

    @Test
    void updateImagePairReturnsOk() throws Exception {
        when(updateImagePairUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/image-pairs/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateImagePairRequest(100L, 101L))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imagePairId").value(1L));
    }

    @Test
    void deactivateImagePairReturnsOk() throws Exception {
        when(deactivateImagePairUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/image-pairs/1/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imagePairId").value(1L));
    }

    private ImagePairResponse sampleResponse() {
        return new ImagePairResponse(
                1L, 10L, 100L, 20L, null, TargetType.ZONE, 100L, 101L, ResourceStatus.ACTIVE,
                1L, null, null, null, null
        );
    }
}
