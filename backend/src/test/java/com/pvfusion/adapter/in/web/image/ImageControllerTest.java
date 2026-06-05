package com.pvfusion.adapter.in.web.image;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pvfusion.application.dto.image.ImagePreviewResponse;
import com.pvfusion.application.dto.image.ImageResponse;
import com.pvfusion.application.dto.image.ImageSummaryResponse;
import com.pvfusion.application.port.in.image.DeactivateImageUseCase;
import com.pvfusion.application.port.in.image.GetImagePreviewUseCase;
import com.pvfusion.application.port.in.image.GetImageUseCase;
import com.pvfusion.application.port.in.image.QueryImageUseCase;
import com.pvfusion.application.port.in.image.UploadImageUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.UploadStatus;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class ImageControllerTest {

    @Mock
    private UploadImageUseCase uploadImageUseCase;
    @Mock
    private QueryImageUseCase queryImageUseCase;
    @Mock
    private GetImageUseCase getImageUseCase;
    @Mock
    private GetImagePreviewUseCase getImagePreviewUseCase;
    @Mock
    private DeactivateImageUseCase deactivateImageUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new ImageController(
                uploadImageUseCase,
                queryImageUseCase,
                getImageUseCase,
                getImagePreviewUseCase,
                deactivateImageUseCase
        )).build();
    }

    @Test
    void uploadImageReturnsCreated() throws Exception {
        when(uploadImageUseCase.execute(any())).thenReturn(sampleResponse());
        MockMultipartFile file = new MockMultipartFile("file", "rgb.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/v1/images")
                        .file(file)
                        .header("X-Actor-User-Id", 1L)
                        .param("inspectionId", "10")
                        .param("targetType", "ZONE")
                        .param("imageType", "RGB"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.imageId").value(1L));
    }

    @Test
    void queryImagesReturnsOk() throws Exception {
        when(queryImageUseCase.execute(any())).thenReturn(List.of(new ImageSummaryResponse(
                1L, 10L, 100L, 20L, null, TargetType.ZONE, ImageType.RGB, "rgb.jpg",
                null, UploadStatus.UPLOADED, ResourceStatus.ACTIVE, OffsetDateTime.parse("2026-06-05T09:00:00+09:00")
        )));

        mockMvc.perform(get("/api/v1/images")
                        .header("X-Actor-User-Id", 1L)
                        .param("inspectionId", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].imageId").value(1L));
    }

    @Test
    void getImagePreviewReturnsOk() throws Exception {
        when(getImagePreviewUseCase.execute(any())).thenReturn(new ImagePreviewResponse(
                1L,
                "https://example.com/image",
                OffsetDateTime.parse("2026-06-05T01:00:00Z")
        ));

        mockMvc.perform(get("/api/v1/images/1/preview")
                        .header("X-Actor-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.url").value("https://example.com/image"));
    }

    @Test
    void deactivateImageReturnsOk() throws Exception {
        when(deactivateImageUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/images/1/deactivate")
                        .header("X-Actor-User-Id", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageId").value(1L));
    }

    private ImageResponse sampleResponse() {
        return new ImageResponse(
                1L,
                10L,
                100L,
                20L,
                null,
                TargetType.ZONE,
                ImageType.RGB,
                "rgb.jpg",
                "image/jpeg",
                3L,
                null,
                null,
                null,
                OffsetDateTime.parse("2026-06-05T09:00:00+09:00"),
                UploadStatus.UPLOADED,
                ResourceStatus.ACTIVE,
                1L,
                OffsetDateTime.parse("2026-06-05T09:10:00+09:00"),
                OffsetDateTime.parse("2026-06-05T09:10:00+09:00")
        );
    }
}
