package com.pvfusion.adapter.in.web.image;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
import com.pvfusion.application.port.in.image.ManageImageDeletionUseCase;
import com.pvfusion.application.port.in.image.QueryImageUseCase;
import com.pvfusion.application.port.in.image.UploadImageUseCase;
import com.pvfusion.domain.common.ResourceStatus;
import com.pvfusion.domain.common.TargetType;
import com.pvfusion.domain.image.ImageType;
import com.pvfusion.domain.image.UploadStatus;
import com.pvfusion.global.error.GlobalExceptionHandler;
import java.time.OffsetDateTime;
import java.util.List;
import org.hibernate.validator.HibernateValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

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
    @Mock
    private ManageImageDeletionUseCase manageImageDeletionUseCase;

    private MockMvc mockMvc;
    private LocalValidatorFactoryBean validator;

    @BeforeEach
    void setUp() {
        validator = new LocalValidatorFactoryBean();
        validator.setProviderClass(HibernateValidator.class);
        validator.afterPropertiesSet();
        mockMvc = MockMvcBuilders.standaloneSetup(new ImageController(
                uploadImageUseCase,
                queryImageUseCase,
                getImageUseCase,
                getImagePreviewUseCase,
                deactivateImageUseCase,
                manageImageDeletionUseCase
        ))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .build();
    }

    @Test
    @DisplayName("BE-UNIT-IMAGE-001 업로드 성공 응답은 공통 success wrapper를 반환한다")
    void uploadImageReturnsCreated() throws Exception {
        when(uploadImageUseCase.execute(any())).thenReturn(sampleResponse());
        MockMultipartFile file = new MockMultipartFile("file", "rgb.jpg", "image/jpeg", new byte[]{1, 2, 3});

                mockMvc.perform(multipart("/api/v1/images")
                        .file(file)
                        .param("inspectionId", "10")
                        .param("targetType", "ZONE")
                        .param("imageType", "RGB"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.data.imageId").value(1L));
    }

    @Test
    void uploadImageValidationReturnsBadRequestWithErrorWrapper() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "rgb.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/v1/images")
                        .file(file)
                        .param("targetType", "ZONE")
                        .param("imageType", "RGB"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/images"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());

        verify(uploadImageUseCase, never()).execute(any());
    }

    @Test
    @DisplayName("BE-UNIT-IMAGE-003 잘못된 imageType 문자열은 업로드 단계에서 차단된다")
    void uploadImageRejectsUnknownImageType() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "rgb.jpg", "image/jpeg", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/v1/images")
                        .file(file)
                        .param("inspectionId", "10")
                        .param("targetType", "ZONE")
                        .param("imageType", "UNKNOWN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));

        verify(uploadImageUseCase, never()).execute(any());
    }

    @Test
    void uploadImageRequiresFilePart() throws Exception {
        mockMvc.perform(multipart("/api/v1/images")
                        .param("inspectionId", "10")
                        .param("targetType", "ZONE")
                        .param("imageType", "RGB"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.status").value(400))
                .andExpect(jsonPath("$.error.path").value("/api/v1/images"))
                .andExpect(jsonPath("$.error.traceId").isNotEmpty());

        verify(uploadImageUseCase, never()).execute(any());
    }

    @Test
    void queryImagesReturnsOk() throws Exception {
        when(queryImageUseCase.execute(any())).thenReturn(List.of(new ImageSummaryResponse(
                1L, 10L, 100L, 20L, null, TargetType.ZONE, ImageType.RGB, "rgb.jpg",
                null, UploadStatus.UPLOADED, ResourceStatus.ACTIVE, OffsetDateTime.parse("2026-06-05T09:00:00+09:00")
        )));

        mockMvc.perform(get("/api/v1/images")
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

        mockMvc.perform(get("/api/v1/images/1/preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.url").value("https://example.com/image"));
    }

    @Test
    void deactivateImageReturnsOk() throws Exception {
        when(deactivateImageUseCase.execute(any())).thenReturn(sampleResponse());

        mockMvc.perform(patch("/api/v1/images/1/deactivate"))
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
